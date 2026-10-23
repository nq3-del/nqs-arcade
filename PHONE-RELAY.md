# Production phone controllers

The game and phone connect to `/api/phone-socket` over WSS on the Arcade domain.
Vercel runs the Node server in `api/phone-socket.js`; Redis coordinates rooms and
forwards input across independent function instances. The browser build contains
no database credentials. Room IDs stay in controller URL fragments and are never
sent as page query parameters.

## Setup

Connect a Redis database from Vercel Marketplace to **nqs-arcade**, with the
server-only `REDIS_URL` variable available in Preview and Production. Enable
Fluid compute (required for Vercel WebSockets). `vercel.json` keeps the existing
static Arcade and adds the API function with a 300-second duration. The relay
rotates connections at 240 seconds; clients reconnect automatically with their
existing identities. The game pauses on a detected phone disconnect.

Check `GET /api/phone-socket`: HTTP 200 and `ready: true` confirms Redis is
reachable. HTTP 503 means configuration or connectivity needs attention. Error
responses never disclose the Redis connection string.

## Isolation and cleanup

Each host has separate random room and resume tokens. Phones get only the room
token and create their own resume tokens. Redis atomically checks ownership,
rejects occupied slots, and targets input to the active host connection. An old
socket cannot release a replacement socket's slot. Opening a second copy of the
same QR code cannot take over an active phone. Closing the game ends its room;
abandoned rooms expire after three minutes. Server leases last 45 seconds and
refresh every 15 seconds. The host releases controls after 800 ms without input.
There is no replay of stored inputs after a network interruption.

Only short-lived room ownership and connection metadata are stored. Game saves,
voice recordings and personal details are not transmitted. Browser upgrades
must be same-origin; payloads and input rates are bounded. New room creation is
limited to 20 per minute per hashed network address. Redis keys use the
`shadow:phone:v1` prefix.

## Validation

```powershell
npm ci
npm run test:relay
# With a non-sensitive local test credential in a gitignored env file:
node --env-file=.env.development.local --test tests/phone-redis.test.mjs
# Exercise a deployed preview or production endpoint:
$env:RELAY_URL='https://nqs-arcade.vercel.app'
node --use-system-ca tests/phone-live.mjs
```

The Redis integration test uses a unique test prefix, two independent HTTP
servers and two Redis clients. The live test creates temporary rooms and closes
them when finished. Do not print or commit environment files. Sensitive Vercel
variables are intentionally omitted from `vercel env pull`; test those in a
deployed preview instead.
