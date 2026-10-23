export function pairingToken() {
  return [...crypto.getRandomValues(new Uint8Array(18))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function localPhoneServer(hostname = location.hostname) {
  return hostname === 'localhost' || hostname === '[::1]' || /^127\./.test(hostname) ||
    /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

export function phoneEndpoint() {
  const url = new URL(localPhoneServer() ? '/phone-socket' : '/api/phone-socket', location.origin);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

// Keeps the pairing identity while replacing sockets across network changes
// and Vercel function rotations. Stale sockets cannot update the current UI.
export class PhoneConnection {
  constructor({ hello, onMessage, onState, url = phoneEndpoint() }) {
    Object.assign(this, { hello, onMessage, onState, url });
    this.attempts = 0;
    this.stopped = true;
  }
  start() {
    if (this.socket && this.socket.readyState <= 1) return;
    this.stopped = false;
    this.terminal = false;
    clearTimeout(this.retry);
    this.onState(this.attempts ? 'reconnecting' : 'connecting');
    const ws = this.socket = new WebSocket(this.url);
    const current = () => this.socket === ws && !this.stopped;
    this.deadline = setTimeout(() => { if (current()) ws.close(); }, 10000);
    ws.onopen = () => { if (current()) ws.send(JSON.stringify(this.hello())); };
    ws.onmessage = event => {
      if (!current()) return;
      let data;
      try { data = JSON.parse(event.data); } catch { ws.close(); return; }
      if (data.type === 'room' || data.type === 'joined') {
        clearTimeout(this.deadline);
        this.attempts = 0;
        this.onState('connected');
      }
      if (data.type === 'ended' || (data.type === 'error' && data.retryable !== true)) {
        this.terminal = true;
        clearTimeout(this.deadline);
        this.onState('ended', data.message || 'The game was closed. Scan a new QR code to play again.');
      }
      this.onMessage(data);
    };
    ws.onerror = () => { if (current()) ws.close(); };
    ws.onclose = event => {
      if (!current()) return;
      clearTimeout(this.deadline);
      this.socket = null;
      if (this.terminal) return;
      if (event.code === 1008) {
        this.terminal = true;
        this.onState('ended', 'This connection has expired or been replaced. Scan the QR code again.');
        return;
      }
      this.onState('reconnecting');
      const delay = Math.min(500 * 2 ** Math.min(this.attempts++, 4), 8000) + Math.random() * 250;
      this.retry = setTimeout(() => this.start(), delay);
    };
  }
  send(data) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    if (this.socket.bufferedAmount > 4096) { this.socket.close(); return false; }
    this.socket.send(JSON.stringify(data));
    return true;
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.retry); clearTimeout(this.deadline);
    this.socket?.close();
    this.socket = null;
  }
}
