import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { attachProductionRelay, validInput } from '../lib/phone-relay.mjs';

test('rejects invalid controller frames before sending them to the shared store', () => {
  assert.equal(validInput({ type: 'input', axes: [0.2, -1], buttons: [0, 16] }), true);
  for (const data of [null, {}, { type: 'host', axes: [0, 0], buttons: [] },
    { type: 'input', axes: [NaN, 0], buttons: [] }, { type: 'input', axes: [0, 2], buttons: [] },
    { type: 'input', axes: [0], buttons: [] }, { type: 'input', axes: [0, 0], buttons: ['0'] },
    { type: 'input', axes: [0, 0], buttons: [17] }]) assert.equal(validInput(data), false);
});

test('rejects cross-origin upgrades and malformed authentication without accessing Redis', async t => {
  const server = createServer();
  let accesses = 0;
  const relay = attachProductionRelay(server, { getStore: () => { accesses++; throw new Error('must not run'); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { relay.close(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const wrong = new WebSocket(origin.replace('http', 'ws') + '/api/phone-socket', { origin: 'https://other.example' });
  await once(wrong, 'error');
  const ws = new WebSocket(origin.replace('http', 'ws') + '/api/phone-socket', { origin });
  await once(ws, 'open');
  const close = once(ws, 'close');
  ws.send(JSON.stringify({ type: 'join', room: '../../room', token: 'bad', slot: 0 }));
  assert.equal((await close)[0], 1008);
  assert.equal(accesses, 0);
});

test('rotates authenticated sockets before the function deadline and releases the lease', async t => {
  const server = createServer();
  const operations = [];
  const relay = attachProductionRelay(server, { rotateMs: 150, getStore: async () => ({
    watch: async () => () => {},
    act: async op => { operations.push(op); return ['ok']; },
  }) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { relay.close(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const ws = new WebSocket(origin.replace('http', 'ws') + '/api/phone-socket', { origin });
  await once(ws, 'open');
  const close = once(ws, 'close');
  ws.send(JSON.stringify({ type: 'host', room: 'a'.repeat(36), token: 'b'.repeat(36) }));
  assert.equal(JSON.parse((await once(ws, 'message'))[0]).type, 'room');
  assert.equal((await close)[0], 1012);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(operations, ['host', 'release']);
});
