import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { RedisPhoneStore } from '../lib/phone-store.mjs';
import { attachProductionRelay } from '../lib/phone-relay.mjs';

const token = () => randomBytes(18).toString('hex');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('production protocol: separate instances, private rooms, ownership, recovery and cleanup', { timeout: 60000 }, async t => {
  assert.ok(process.env.REDIS_URL, 'REDIS_URL is required for the real Redis integration test');
  const prefix = `shadow:phone:test:${token()}`;
  const stores = await Promise.all([0, 1].map(() => new RedisPhoneStore(process.env.REDIS_URL, { prefix }).connect()));
  const servers = stores.map(store => {
    const server = createServer();
    const relay = attachProductionRelay(server, { getStore: async () => store });
    server.relay = relay;
    server.listen(0, '127.0.0.1');
    return server;
  });
  await Promise.all(servers.map(server => once(server, 'listening')));
  const sockets = [];
  t.after(async () => {
    sockets.forEach(socket => socket.terminate());
    servers.forEach(server => { server.relay.close(); server.close(); });
    await wait(100);
    // Delete only this test's randomly namespaced keys, never production rooms.
    const keys = await stores[0].client.keys(`${prefix}:*`);
    if (keys.length) await stores[0].client.del(keys);
    stores.forEach(store => store.close());
  });
  async function connect(instance, hello) {
    const origin = `http://127.0.0.1:${servers[instance].address().port}`;
    const socket = new WebSocket(origin.replace('http', 'ws') + '/api/phone-socket', { origin });
    sockets.push(socket);
    socket.events = [];
    socket.on('message', raw => socket.events.push(JSON.parse(raw)));
    await once(socket, 'open');
    socket.send(JSON.stringify(hello));
    await until(() => socket.events.length);
    return socket;
  }
  async function until(predicate) {
    const end = Date.now() + 8000;
    while (!predicate()) { assert.ok(Date.now() < end, 'timed out waiting for relay event'); await wait(20); }
  }
  const identity = { type: 'host', room: token(), token: token() };
  const host = await connect(0, identity);
  assert.equal(host.events[0].type, 'room');
  const other = await connect(1, { type: 'host', room: token(), token: token() });
  const join = { type: 'join', room: identity.room, token: token(), slot: 1 };
  const phone = await connect(1, join);
  assert.equal(phone.events[0].type, 'joined');
  await until(() => host.events.some(e => e.type === 'connected' && e.slot === 1));
  const duplicate = await connect(0, { ...join, token: token() });
  assert.match(duplicate.events[0].message, /already has a phone/);
  const attacker = await connect(1, { ...identity, token: token() });
  assert.equal(attacker.events[0].type, 'error');
  phone.send(JSON.stringify({ type: 'input', axes: [0.8, -1], buttons: [0, 2] }));
  await until(() => host.events.some(e => e.type === 'input'));
  assert.deepEqual(host.events.find(e => e.type === 'input'), { type: 'input', slot: 1, axes: [0.8, -1], buttons: [0, 2] });
  assert.equal(other.events.some(e => e.type === 'input' || e.type === 'connected'), false);

  // Host resumes on the other instance, including already connected phones.
  const hostClosed = once(host, 'close'); host.close(); await hostClosed;
  await until(() => phone.events.some(e => e.type === 'host-offline'));
  const resumedHost = await connect(1, identity);
  await until(() => resumedHost.events.some(e => e.type === 'connected' && e.slot === 1));
  await until(() => phone.events.some(e => e.type === 'host-online'));
  phone.send(JSON.stringify({ type: 'input', axes: [-1, 0], buttons: [] }));
  await until(() => resumedHost.events.some(e => e.type === 'input' && e.axes[0] === -1));

  // A resume may arrive before the old socket's close callback. Its credentials
  // replace that socket, and stale cleanup must not release the new lease.
  const resumedPhone = await connect(0, join);
  await until(() => phone.readyState === WebSocket.CLOSED);
  resumedPhone.send(JSON.stringify({ type: 'input', axes: [0, 1], buttons: [3] }));
  await until(() => resumedHost.events.some(e => e.type === 'input' && e.buttons.includes(3)));
  const deniedAgain = await connect(1, { ...join, token: token() });
  assert.match(deniedAgain.events[0].message, /already has a phone/);

  // Invalid frames cannot reach the game or leak to another room.
  resumedPhone.send(JSON.stringify({ type: 'input', axes: [9, 0], buttons: [999] }));
  await until(() => resumedPhone.readyState === WebSocket.CLOSED);
  assert.equal(resumedHost.events.some(e => e.type === 'input' && e.axes[0] === 9), false);
  const freshPhone = await connect(0, { ...join, token: token() });
  assert.equal(freshPhone.events[0].type, 'joined');

  resumedHost.send(JSON.stringify({ type: 'end' }));
  await until(() => freshPhone.events.some(e => e.type === 'ended'));
  const expired = await connect(1, join);
  assert.match(expired.events[0].message, /expired/);
  console.log('Verified Redis-backed pairing across two independent relay servers.');
});
