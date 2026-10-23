import QRCode from 'qrcode';
import './phone-pairing.css';
import { PhoneConnection, pairingToken, localPhoneServer } from './PhoneConnection.js';

export class PhoneControllers {
  constructor(services) {
    this.services = services;
    this.pads = new Map();
    this.identity = { room: pairingToken(), token: pairingToken() };
    this.online = !localPhoneServer();
    window.addEventListener('pagehide', () => {
      this.connection?.send({ type: 'end' });
      this.connection?.stop();
    });
    window.addEventListener('pageshow', event => {
      if (event.persisted && this.connection) this.connection.start();
    });
  }
  getPads() {
    return [...this.pads.values()].map(pad => {
      // Release silently on missed heartbeats: never manufacture a release action.
      if (performance.now() - pad.updated > 800) {
        pad.frames = [];
        pad.signature = null;
        pad.axes = [0, 0]; pad.buttons = pad.buttons.map(() => ({ pressed: false }));
        this.services.controls.previous.delete(pad.index);
        this.services.controls.gestures.delete(pad.index);
      } else if (pad.frames.length) {
        const frame = pad.frames.shift();
        pad.axes = frame.axes;
        pad.buttons = pad.buttons.map((_, i) => ({ pressed: frame.buttons.includes(i) }));
      }
      return pad;
    });
  }
  connect() {
    if (!this.connection) this.connection = new PhoneConnection({
      hello: () => ({ type: 'host', ...this.identity }),
      onState: (state, message) => {
        if (state === 'connected') return;
        const wasPlaying = this.pads.size > 0;
        this.releasePads();
        this.dialog.querySelector('.pairing-code').hidden = true;
        this.dialog.querySelector('#phone-link').hidden = true;
        this.status.textContent = message || (state === 'connecting' ? 'Starting connection…' : 'Reconnecting to phone pairing… Keep this game tab open.');
        if (wasPlaying && this.services.ui.mode === 'game') this.services.ui.pause();
      },
      onMessage: data => {
      if (data.type === 'room') {
        this.room = data.room;
        this.addresses = data.addresses;
        this.online = data.online === true || !localPhoneServer();
        this.renderPairing();
      }
      if (data.type === 'connected') {
        this.clearPad(data.slot);
        this.pads.set(data.slot, { index: `phone-${data.slot}`, remote: true, slot: data.slot, axes: [0, 0], frames: [], buttons: Array.from({ length: 17 }, () => ({ pressed: false })), updated: performance.now() });
        this.status.textContent = `Player ${data.slot + 1} phone connected. Close this panel to play.`;
        this.services.ui.toast(`Player ${data.slot + 1} phone connected`);
      }
      if (data.type === 'input') {
        const pad = this.pads.get(data.slot);
        if (pad) {
          pad.updated = performance.now();
          const signature = JSON.stringify([data.axes, data.buttons]);
          if (pad.signature !== signature) {
            pad.signature = signature;
            if (this.dialog.open) { pad.frames = []; pad.axes = [0, 0]; pad.buttons = pad.buttons.map(() => ({ pressed: false })); return; }
            // Preserve short taps between game frames without queuing heartbeats.
            const last = pad.frames.at(-1);
            if (last && JSON.stringify(last.buttons) === JSON.stringify(data.buttons)) last.axes = data.axes;
            else {
              if (pad.frames.length >= 12) pad.frames = [];
              pad.frames.push(data);
            }
          }
        }
      }
      if (data.type === 'disconnected') {
        this.clearPad(data.slot);
        this.pads.delete(data.slot);
        this.status.textContent = `Player ${data.slot + 1} disconnected. Scan again to reconnect.`;
        if (this.services.ui.mode === 'game') this.services.ui.pause();
        this.services.ui.toast('Phone disconnected — game paused');
      }
      },
    });
    this.connection.start();
  }
  clearPad(slot) {
    const index = `phone-${slot}`;
    this.services.controls.previous.delete(index);
    this.services.controls.gestures.delete(index);
  }
  releasePads() {
    for (const slot of this.pads.keys()) this.clearPad(slot);
    this.pads.clear();
  }
  open() {
    if (this.services.ui.mode === 'game') this.services.ui.pause();
    if (!this.dialog) {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'phone-pairing';
      this.dialog.innerHTML = "<h2>Pair your phone</h2><p>Use the same Wi-Fi, then scan with your phone's camera.</p><label>Play as <select id=\"phone-slot\"><option value=\"0\">Player 1</option><option value=\"1\">Player 2</option></select></label><div class=\"pairing-code\"><canvas aria-label=\"Scan to open your controller\"></canvas></div><p class=\"phone-status\" role=\"status\">Starting connection…</p><a id=\"phone-link\" target=\"_blank\" rel=\"noopener\">Open controller on this device</a><details><summary>Connection help & two-player setup</summary><label>Computer address <select id=\"phone-address\"></select></label><p>Try another address above, check both devices are on the same Wi-Fi, and avoid guest networks or VPNs.</p><p>If Windows asks, allow Node.js on your private network.</p><p>For co-op, choose Two players in Settings before entering a world. A physical controller uses the remaining player slot.</p></details><button class=\"primary\" id=\"phone-close\">Done</button>";
      document.querySelector('#app').append(this.dialog);
      this.status = this.dialog.querySelector('.phone-status');
      this.dialog.querySelector('.pairing-code').hidden = true;
      this.dialog.querySelector('#phone-link').hidden = true;
      if (this.online) {
        this.dialog.querySelector('h2 + p').textContent = 'Scan with your phone’s camera. Keep the game open on this screen.';
        this.dialog.querySelector('details').innerHTML = '<summary>Connection help & two-player setup</summary><label hidden>Computer address <select id="phone-address"></select></label><p>Both devices need an internet connection. If pairing pauses, keep both screens open while they reconnect.</p><p>For co-op, choose Two players in Settings before entering a world. Scan once for each player. A physical controller uses the remaining player slot.</p>';
      }
      this.dialog.querySelector('#phone-close').onclick = () => this.dialog.close();
      this.dialog.querySelector('#phone-slot').onchange = () => this.updateQR();
      this.dialog.querySelector('#phone-address').onchange = () => this.updateQR();
      this.dialog.addEventListener('keydown', e => e.stopPropagation());
    }
    this.dialog.showModal();
    this.connect();
    if (this.room && this.connection.socket?.readyState === WebSocket.OPEN) this.renderPairing();
  }
  renderPairing() {
    const select = this.dialog.querySelector('#phone-address');
    const old = select.value;
    const addresses = this.addresses.length ? this.addresses : [location.origin];
    select.replaceChildren(...addresses.map(address => new Option(address, address)));
    if (addresses.includes(old)) select.value = old;
    this.dialog.querySelector('.pairing-code').hidden = false;
    this.dialog.querySelector('#phone-link').hidden = false;
    this.status.textContent = this.pads.size ? 'Phone connected. Close this panel to play.' : 'Ready to pair. Scan the code below.';
    this.updateQR();
  }
  async updateQR() {
    if (!this.room) return;
    const url = new URL('controller.html', location.href);
    if (!this.online) {
      const address = new URL(this.dialog.querySelector('#phone-address').value);
      url.protocol = address.protocol;
      url.host = address.host;
    }
    url.hash = new URLSearchParams({ room: this.room, slot: this.dialog.querySelector('#phone-slot').value });
    this.dialog.querySelector('#phone-link').href = url.href;
    await QRCode.toCanvas(this.dialog.querySelector('canvas'), url.href, { width: 240, margin: 2 });
  }
}
