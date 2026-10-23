import { createClient } from 'redis';

// All ownership checks and notifications are atomic across Vercel instances.
// Rooms expire after three minutes without a host/phone heartbeat. No saves,
// names, IP addresses, or input history are stored.
export const ROOM_SCRIPT = `
local key, channel = KEYS[1], KEYS[2]
local op, now, conn, token, slot = ARGV[1], tonumber(ARGV[2]), ARGV[3], ARGV[4], ARGV[5]
local ttl, lease = 180, 45000
local function get(field) return redis.call('HGET', key, field) or '' end
local function emit(event) redis.call('PUBLISH', channel, cjson.encode(event)) end
local function alive(prefix) return get(prefix..'Conn') ~= '' and tonumber(get(prefix..'Seen') or '0') + lease > now end
if op == 'host' then
  if redis.call('EXISTS', key) == 1 and get('hostToken') ~= token then return {'denied'} end
  if redis.call('EXISTS', key) == 0 then
    local count = redis.call('INCR', KEYS[3])
    if count == 1 then redis.call('EXPIRE', KEYS[3], 60) end
    if count > 20 then return {'limited'} end
  end
  local previous = get('hostConn')
  redis.call('HSET', key, 'hostToken', token, 'hostConn', conn, 'hostSeen', now)
  redis.call('EXPIRE', key, ttl)
  if previous ~= '' and previous ~= conn then emit({type='replaced', connection=previous}) end
  emit({type='host-online'})
  local result = {'ok'}
  for i=0,1 do if alive('p'..i) then table.insert(result, tostring(i)) end end
  return result
end
if redis.call('EXISTS', key) == 0 then return {'expired'} end
if op == 'join' then
  if not alive('host') then return {'waiting'} end
  local p = 'p'..slot
  if alive(p) and get(p..'Token') ~= token then return {'occupied'} end
  local previous = get(p..'Conn')
  redis.call('HSET', key, p..'Token', token, p..'Conn', conn, p..'Seen', now)
  redis.call('EXPIRE', key, ttl)
  if previous ~= '' and previous ~= conn then emit({type='replaced', connection=previous}) end
  emit({type='connected', slot=tonumber(slot), host=get('hostConn')})
  return {'ok'}
end
local p = slot == 'host' and 'host' or 'p'..slot
if get(p..'Conn') ~= conn or get(p..'Token') ~= token then return {'denied'} end
if op == 'end' and slot == 'host' then
  redis.call('DEL', key)
  emit({type='ended'})
elseif op == 'release' then
  redis.call('HSET', key, p..'Conn', '', p..'Seen', 0)
  if slot == 'host' then emit({type='host-offline'})
  else emit({type='disconnected', slot=tonumber(slot), host=get('hostConn')}) end
elseif op == 'touch' or (op == 'input' and slot ~= 'host') then
  redis.call('HSET', key, p..'Seen', now)
  redis.call('EXPIRE', key, ttl)
  if op == 'input' and alive('host') then
    -- Preserve empty JS arrays: Lua cjson would re-encode [] as {}.
    redis.call('PUBLISH', channel, '{"host":'..cjson.encode(get('hostConn'))..','..string.sub(ARGV[6], 2))
  end
end
return {'ok'}
`;

export class RedisPhoneStore {
  constructor(url, { prefix = 'shadow:phone:v1', onUnavailable = () => {} } = {}) {
    this.prefix = prefix;
    const options = { url, disableOfflineQueue: true, socket: { connectTimeout: 5000, reconnectStrategy: retries => retries < 3 ? 250 * (retries + 1) : false } };
    this.client = createClient(options);
    this.subscriber = this.client.duplicate();
    this.client.on('error', onUnavailable);
    this.subscriber.on('error', onUnavailable);
    this.listeners = new Map();
  }
  async connect() {
    await Promise.all([this.client.connect(), this.subscriber.connect()]);
    return this;
  }
  async ping() { return this.client.ping(); }
  key(room) { return `${this.prefix}:room:${room}`; }
  async act(op, session, input) {
    return this.client.eval(ROOM_SCRIPT, {
      keys: [this.key(session.room), `${this.key(session.room)}:events`, `${this.prefix}:limit:${session.ipKey || 'local'}`],
      arguments: [op, String(Date.now()), session.id, session.token, String(session.role === 'host' ? 'host' : session.slot), JSON.stringify(input || {})],
    });
  }
  async watch(room, listener) {
    let entry = this.listeners.get(room);
    if (!entry) {
      entry = { callbacks: new Set(), ready: null };
      this.listeners.set(room, entry);
      entry.ready = this.subscriber.subscribe(`${this.key(room)}:events`, raw => {
        let event;
        try { event = JSON.parse(raw); } catch { return; }
        for (const callback of entry.callbacks) callback(event);
      });
    }
    entry.callbacks.add(listener);
    try { await entry.ready; } catch (error) { entry.callbacks.delete(listener); this.listeners.delete(room); throw error; }
    // Keep the Redis subscription until this instance is discarded. Removing
    // callbacks immediately prevents delivery to closed sockets; subscriptions
    // are bounded by the per-instance WebSocket capacity and cleaned below.
    return () => {
      entry.callbacks.delete(listener);
      if (!entry.callbacks.size && this.listeners.get(room) === entry) {
        this.listeners.delete(room);
        this.subscriber.unsubscribe(`${this.key(room)}:events`).catch(() => {});
      }
    };
  }
  close() {
    for (const client of [this.client, this.subscriber]) if (client.isOpen) client.destroy();
    this.listeners.clear();
  }
}
