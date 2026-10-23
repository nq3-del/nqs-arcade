import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { attachPhoneControllers } from '../scripts/phone-controller-server.mjs';

test('pairing isolates rooms and slots, validates input, and cleans up disconnected phones and hosts', async t => {
  const server = createServer();
  const cleanup = attachPhoneControllers(server);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  t.after(() => { sockets.forEach(s => s.terminate()); cleanup(); server.close(); });
  async function connect(data) {
    const socket = new WebSocket(origin.replace('http:', 'ws:') + '/phone-socket', { origin });
    sockets.push(socket); await once(socket, 'open');
    const response = once(socket, 'message'); socket.send(JSON.stringify(data));
    return [socket, JSON.parse((await response)[0])];
  }
  const [host, room] = await connect({ type: 'host' });
  const [host2, other] = await connect({ type: 'host' });
  assert.notEqual(room.room, other.room);
  const event = once(host, 'message');
  const [phone, joined] = await connect({ type: 'join', room: room.room, slot: 1 });
  assert.equal(joined.type, 'joined'); assert.equal(joined.slot, 1);
  assert.equal(JSON.parse((await event)[0]).type, 'connected');
  const [, duplicate] = await connect({ type: 'join', room: room.room, slot: 1 });
  assert.equal(duplicate.type, 'error');
  const [, expired] = await connect({ type: 'join', room: 'wrong', slot: 0 });
  assert.equal(expired.type, 'error');
  const incoming = once(host, 'message');
  phone.send(JSON.stringify({ type: 'input', axes: [0.8, -1], buttons: [0, 2] }));
  assert.deepEqual(JSON.parse((await incoming)[0]), { type: 'input', slot: 1, axes: [0.8, -1], buttons: [0, 2] });
  let invalidForwarded = false, leaked = false;
  const invalid = () => { invalidForwarded = true; };
  host.on('message', invalid); host2.on('message', () => { leaked = true; });
  phone.send(JSON.stringify({ type: 'input', axes: [Infinity, 0], buttons: [100] }));
  phone.send(JSON.stringify({ type: 'input', axes: [0, 0], buttons: ['0'] }));
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(invalidForwarded, false); assert.equal(leaked, false); host.off('message', invalid);
  const disconnect = once(host, 'message'); phone.close();
  assert.equal(JSON.parse((await disconnect)[0]).type, 'disconnected');
  const [rejoined] = await connect({ type: 'join', room: room.room, slot: 1 });
  const closed = once(rejoined, 'close'); host.close(); await closed;
  const [, removed] = await connect({ type: 'join', room: room.room, slot: 0 });
  assert.equal(removed.type, 'error');
});

test('rejects websocket connections from unrelated origins', async t => {
  const server = createServer(); const cleanup = attachPhoneControllers(server);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { cleanup(); server.close(); });
  const socket = new WebSocket(`ws://127.0.0.1:${server.address().port}/phone-socket`, { origin: 'https://unrelated.example' });
  await once(socket, 'error');
});
