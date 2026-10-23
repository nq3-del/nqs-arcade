# Arcade integration

The playable build is committed in `../shadow-puppet-uprising/`. The Arcade
homepage links to `/games/shadow-puppet-uprising/`. Relative asset URLs let the
game run from this subfolder, and the header links back to the Arcade.

From this source directory, use Node.js 22.12+ or 24:

```powershell
npm ci
npm test
npm run build -- --configLoader native
Copy-Item dist/* ../shadow-puppet-uprising/ -Recurse -Force
```

Commit the source changes and updated playable folder together. The existing
Arcade site is hosted at https://nqs-arcade.vercel.app; production publication
requires pushing to its connected GitHub branch and a successful Vercel deploy.
No new hosting service or account is needed.

Phone pairing uses `/api/phone-socket` on Vercel and a shared Redis database.
Connect the Redis Marketplace integration to this project and set the server-only
`REDIS_URL` in Preview and Production. Keep Fluid compute enabled. The endpoint
returns `{ "ready": true }` when Redis is reachable. No credential belongs in a
`VITE_` variable or the committed browser build. Local dev/preview still uses the
home-network relay. See `../../../PHONE-RELAY.md` for operations and tests.

For the production browser smoke test, serve the repository root on port 4173
and run from this source directory:

```powershell
$env:PRODUCTION_URL='http://127.0.0.1:4173/games/shadow-puppet-uprising/'
New-Item -ItemType Directory -Force test-results
npm run test:production
npm run test:arcade
```

Saves stay in the player's browser. A save from localhost does not automatically
transfer to the published site's origin.
