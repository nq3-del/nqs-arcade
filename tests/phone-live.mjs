import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';

const origin = new URL(process.env.RELAY_URL || 'https://nqs-arcade.vercel.app').origin;
const token = () => randomBytes(18).toString('hex');
const sockets = [];
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
async function until(predicate) {
  const end = Date.now() + 15000;
  while (!predicate()) { assert.ok(Date.now() < end, 'Timed out waiting for live relay'); await new Promise(r => setTimeout(r, 25)); }
}
async function connect(hello) {
  const socket = new WebSocket(origin.replace(/^http/, 'ws') + '/api/phone-socket', { origin, headers, handshakeTimeout: 15000 });
  sockets.push(socket); socket.events = [];
  socket.on('message', raw => socket.events.push(JSON.parse(raw)));
  await once(socket, 'open');
  socket.send(JSON.stringify(hello));
  await until(() => socket.events.length);
  return socket;
}
try {
  const response = await fetch(origin + '/api/phone-socket', { headers });
  assert.equal(response.status, 200, 'Relay health endpoint must be ready');
  assert.equal((await response.json()).ready, true);
  const identity = { type: 'host', room: token(), token: token() };
  let host = await connect(identity);
  assert.equal(host.events[0].type, 'room');
  const other = await connect({ type: 'host', room: token(), token: token() });
  const join = { type: 'join', room: identity.room, token: token(), slot: 1 };
  let phone = await connect(join);
  assert.equal(phone.events[0].type, 'joined');
  await until(() => host.events.some(e => e.type === 'connected' && e.slot === 1));
  const duplicate = await connect({ ...join, token: token() });
  assert.match(duplicate.events[0].message, /already has a phone/);
  const attacker = await connect({ ...identity, token: token() });
  assert.equal(attacker.events[0].type, 'error');
  phone.send(JSON.stringify({ type: 'input', axes: [.8, -1], buttons: [0, 2] }));
  await until(() => host.events.some(e => e.type === 'input'));
  assert.deepEqual(host.events.find(e => e.type === 'input'), { type: 'input', slot: 1, axes: [.8, -1], buttons: [0, 2] });
  phone.send(JSON.stringify({ type: 'input', axes: [0, 0], buttons: [] }));
  await until(() => host.events.some(e => e.type === 'input' && Array.isArray(e.buttons) && e.buttons.length === 0));
  assert.equal(other.events.some(e => e.type === 'input' || e.type === 'connected'), false);
  const closed = once(host, 'close'); host.close(); await closed;
  await until(() => phone.events.some(e => e.type === 'host-offline'));
  host = await connect(identity);
  await until(() => host.events.some(e => e.type === 'connected'));
  await until(() => phone.events.some(e => e.type === 'host-online'));
  const original = phone;
  phone = await connect(join);
  await until(() => original.readyState === WebSocket.CLOSED);
  phone.send(JSON.stringify({ type: 'input', axes: [-1, 0], buttons: [3] }));
  await until(() => host.events.some(e => e.type === 'input' && e.buttons.includes(3)));
  host.send(JSON.stringify({ type: 'end' }));
  await until(() => phone.events.some(e => e.type === 'ended'));
  const expired = await connect(join);
  assert.match(expired.events[0].message, /expired/);
  console.log('PASS live Redis relay: health, pairing, private rooms, slot ownership, press/release, host recovery, phone recovery and room cleanup.');
} finally {
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'end' }));
  }
  await new Promise(r => setTimeout(r, 150));
  for (const socket of sockets) socket.terminate();
}
