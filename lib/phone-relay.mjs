import { createHash, randomBytes } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const tokenPattern = /^[a-f0-9]{36}$/;
export function validInput(data) {
  return data?.type === 'input' && Array.isArray(data.axes) && data.axes.length === 2 &&
    data.axes.every(n => Number.isFinite(n) && Math.abs(n) <= 1) && Array.isArray(data.buttons) &&
    data.buttons.length <= 17 && data.buttons.every(n => Number.isInteger(n) && n >= 0 && n <= 16);
}
function send(ws, data) {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.bufferedAmount > 16384) { ws.close(1013, 'Connection too slow'); return; }
  ws.send(JSON.stringify(data));
}
const messages = {
  expired: 'This pairing has expired. Scan the game’s QR code again.',
  occupied: 'That player already has a phone connected.',
  waiting: 'Reconnecting to the game. Keep its tab open.',
  denied: 'This connection has been replaced. Pair again from the game.',
  limited: 'Too many pairing attempts. Try again in a minute.',
};

export function attachProductionRelay(server, { getStore, path = '/api/phone-socket', rotateMs = 240000, heartbeatMs = 15000 } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  let shuttingDown = false;
  const upgrade = (req, socket, head) => {
    if (req.url?.split('?')[0] !== path) return socket.destroy();
    try {
      const origin = new URL(req.headers.origin);
      if (!['https:', 'http:'].includes(origin.protocol) || origin.host !== req.headers.host) return socket.destroy();
    } catch { return socket.destroy(); }
    if (shuttingDown || wss.clients.size >= 256) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  };
  server.on('upgrade', upgrade);
  wss.on('connection', (ws, req) => {
    let store, session, unwatch, closed = false, authenticated = false, queue = Promise.resolve(), pending = 0;
    let count = 0, windowStart = Date.now(), alive = true;
    const authTimer = setTimeout(() => ws.close(1008, 'Pairing required'), 10000);
    const rotation = setTimeout(() => ws.close(1012, 'Reconnecting'), rotateMs);
    const heartbeat = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false; ws.ping();
      if (authenticated) queue = queue.then(async () => {
        const [result] = await store.act('touch', session);
        if (result !== 'ok') ws.close(1008, 'Pairing expired');
      }).catch(unavailable);
    }, heartbeatMs);
    for (const timer of [authTimer, rotation, heartbeat]) timer.unref();
    ws.on('pong', () => { alive = true; });
    ws.on('error', () => {});
    function unavailable() {
      send(ws, { type: 'error', retryable: true, message: 'The pairing service is reconnecting. Please wait.' });
      ws.close(1013, 'Service unavailable');
    }
    function fail(result) {
      send(ws, { type: 'error', retryable: ['waiting', 'limited'].includes(result), message: messages[result] || 'Pairing failed. Scan the QR code again.' });
      ws.close(['waiting', 'limited'].includes(result) ? 1013 : 1008);
    }
    function onEvent(event) {
      if (closed) return;
      if (event.type === 'replaced' && event.connection === session.id) return ws.close(1008, 'Connection replaced');
      if (event.type === 'ended') { send(ws, { type: 'ended' }); return ws.close(1000, 'Game closed'); }
      if (session.role === 'host' && event.host === session.id) {
        const { host, ...message } = event;
        send(ws, message);
      } else if (session.role === 'phone' && ['host-online', 'host-offline'].includes(event.type)) {
        send(ws, { type: event.type });
      }
    }
    ws.on('message', (raw, binary) => {
      if (closed) return;
      if (Date.now() - windowStart > 1000) { count = 0; windowStart = Date.now(); }
      if (binary || ++count > 120 || pending >= 16) return ws.close(1008, 'Invalid input rate');
      let data;
      try { data = JSON.parse(raw); } catch { return ws.close(1008, 'Invalid message'); }
      if (!data || typeof data !== 'object') return ws.close(1008, 'Invalid message');
      pending++;
      queue = queue.then(async () => {
        if (closed) return;
        if (!authenticated) {
          if (!['host', 'join'].includes(data.type) || !tokenPattern.test(data.room) || !tokenPattern.test(data.token) ||
            (data.type === 'join' && ![0, 1].includes(data.slot))) return ws.close(1008, 'Invalid pairing');
          const ip = process.env.VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',')[0] : req.socket.remoteAddress;
          session = { room: data.room, token: data.token, role: data.type === 'host' ? 'host' : 'phone', slot: data.slot,
            id: randomBytes(18).toString('hex'), ipKey: createHash('sha256').update(String(ip)).digest('hex').slice(0, 20) };
          store = await getStore();
          if (closed) return;
          unwatch = await store.watch(session.room, onEvent);
          const [result, ...slots] = await store.act(data.type, session);
          if (result !== 'ok') return fail(result);
          authenticated = true;
          clearTimeout(authTimer);
          if (closed) return;
          if (session.role === 'host') {
            send(ws, { type: 'room', room: session.room, addresses: [], online: true });
            for (const slot of slots) send(ws, { type: 'connected', slot: Number(slot) });
          } else send(ws, { type: 'joined', slot: session.slot });
        } else if (session.role === 'phone' && validInput(data)) {
          const [result] = await store.act('input', session, { type: 'input', slot: session.slot, axes: data.axes, buttons: data.buttons });
          if (result !== 'ok') fail(result);
        } else if (session.role === 'host' && data.type === 'end') {
          await store.act('end', session);
          ws.close(1000, 'Game closed');
        } else ws.close(1008, 'Invalid message');
      }).catch(unavailable).finally(() => { pending--; });
    });
    ws.on('close', () => {
      closed = true;
      clearTimeout(authTimer); clearTimeout(rotation); clearInterval(heartbeat);
      // A socket can close while authentication awaits Redis; serialize cleanup
      // after that claim so it cannot leave a ghost host or occupied slot.
      queue.finally(async () => {
        if (authenticated) await store.act('release', session).catch(() => {});
        unwatch?.();
      }).catch(() => {});
    });
  });
  return {
    unavailable() { for (const ws of wss.clients) ws.close(1013, 'Pairing service reconnecting'); },
    close() { shuttingDown = true; server.off('upgrade', upgrade); for (const ws of wss.clients) ws.terminate(); wss.close(); },
  };
}
