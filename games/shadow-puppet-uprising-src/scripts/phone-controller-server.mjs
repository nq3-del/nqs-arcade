import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const token = () => randomBytes(18).toString('hex');
const send = (ws, data) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };

// A short-lived room belongs to one game tab. No saves or game assets travel here.
export function attachPhoneControllers(server) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const upgrade = (req, socket, head) => {
    if (req.url?.split('?')[0] !== '/phone-socket') return;
    // Browsers must originate from this server, not an unrelated website.
    try { if (new URL(req.headers.origin).host !== req.headers.host) return socket.destroy(); }
    catch { return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  };
  server.on('upgrade', upgrade);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.alive === false) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 10000);
  heartbeat.unref();
  wss.on('connection', (ws, req) => {
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    let room, slot, host = false;
    const authDeadline = setTimeout(() => ws.close(), 5000);
    ws.on('error', () => {});
    ws.on('message', raw => {
      let data;
      try { data = JSON.parse(raw); } catch { return ws.close(1008); }
      if (!data || typeof data !== 'object') return ws.close(1008);
      if (!room) {
        if (data.type === 'host') {
          if (rooms.size >= 20) return ws.close(1013);
          host = true;
          room = { id: token(), host: ws, phones: [null, null] };
          rooms.set(room.id, room);
          const port = server.address().port;
          const addresses = [...new Set(Object.values(networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')).map(a => `http://${a.address}:${port}`))];
          send(ws, { type: 'room', room: room.id, addresses });
        } else if (data.type === 'join') {
          room = rooms.get(data.room);
          slot = data.slot;
          if (!room || ![0, 1].includes(slot) || room.phones[slot]) {
            send(ws, { type: 'error', message: room ? 'That player already has a phone connected.' : 'This pairing has expired. Scan the game’s QR code again.' });
            room = null;
            return ws.close(1008);
          }
          room.phones[slot] = ws;
          send(ws, { type: 'joined', slot });
          send(room.host, { type: 'connected', slot });
        } else return ws.close(1008);
        clearTimeout(authDeadline);
        return;
      }
      if (!host && data.type === 'input' && Array.isArray(data.buttons) && data.buttons.length <= 17 && data.buttons.every(b => Number.isInteger(b) && b >= 0 && b <= 16) && Array.isArray(data.axes) && data.axes.length === 2 && data.axes.every(a => Number.isFinite(a) && Math.abs(a) <= 1)) {
        send(room.host, { type: 'input', slot, buttons: data.buttons, axes: data.axes });
      }
    });
    ws.on('close', () => {
      clearTimeout(authDeadline);
      if (!room) return;
      if (host) {
        rooms.delete(room.id);
        room.phones.forEach(phone => phone?.close(1000, 'Game closed'));
      } else if (room.phones[slot] === ws) {
        room.phones[slot] = null;
        send(room.host, { type: 'disconnected', slot });
      }
    });
  });
  return () => { clearInterval(heartbeat); server.off('upgrade', upgrade); for (const ws of wss.clients) ws.terminate(); wss.close(); };
}

export function phoneControllerPlugin() {
  const attach = server => {
    const cleanup = attachPhoneControllers(server.httpServer);
    server.httpServer.once('close', cleanup);
  };
  return { name: 'local-phone-controllers', configureServer: attach, configurePreviewServer: attach };
}
