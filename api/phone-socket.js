import { createServer } from 'node:http';
import { RedisPhoneStore } from '../lib/phone-store.mjs';
import { attachProductionRelay } from '../lib/phone-relay.mjs';

let storePromise;
async function getStore() {
  if (!process.env.REDIS_URL) throw new Error('Pairing storage is not configured');
  if (!storePromise) {
    let promise;
    const store = new RedisPhoneStore(process.env.REDIS_URL, { onUnavailable: () => {
      if (storePromise === promise) storePromise = null;
      relay.unavailable();
      setTimeout(() => store.close(), 0);
    } });
    promise = store.connect().catch(error => {
      store.close();
      if (storePromise === promise) storePromise = null;
      throw error;
    });
    storePromise = promise;
  }
  return storePromise;
}
const server = createServer(async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  try {
    await (await getStore()).ping();
    res.writeHead(200).end(JSON.stringify({ ready: true, protocol: 1 }));
  } catch {
    // Do not expose connection strings or provider errors to the browser.
    res.writeHead(503).end(JSON.stringify({ ready: false, message: 'Phone pairing is temporarily unavailable.' }));
  }
});
const relay = attachProductionRelay(server, { getStore });
export default server;
