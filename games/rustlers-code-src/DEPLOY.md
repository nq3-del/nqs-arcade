# Putting The Rustler's Code on itch.io (free)

Everything below is free. You'll do this yourself — it needs your own
account. Total time: about 15 minutes.

## 1. Build the game (already done, but for next time)

In the terminal, inside the project folder:

```
npm run build
```

This fills the `dist/` folder with the finished game (currently ~0.6MB —
the budget was 50MB, so we're comically under).

## 2. Zip the dist folder's CONTENTS

itch.io wants a zip where `index.html` is at the TOP level of the zip —
not inside a `dist/` folder. In the terminal:

```
cd dist
zip -r ../rustlers-code.zip .
cd ..
```

You now have `rustlers-code.zip` in the project folder.

## 3. Create the itch.io page

1. Go to https://itch.io and click **Register** (free, no card, ever).
2. Once logged in: top-right menu → **Upload new project**.
3. Fill in:
   - **Title:** The Rustler's Code
   - **Classification:** Games
   - **Kind of project:** HTML — *this is the important one*
   - **Pricing:** "No payments" (everything about this project is free)
4. Under **Uploads**, upload `rustlers-code.zip` and tick
   **"This file will be played in the browser"**.
5. **Embed options:** set the viewport to 1280 × 720, and tick
   **"Fullscreen button"** — the game likes room.
6. Write a short description (feel free to steal from CLAUDE.md's pitch).
   Suggested tags: `western`, `adventure`, `low-poly`, `voxel`, `family-friendly`.
7. **Save & view page** → when happy, set visibility to **Public**.

## 4. Test it like a player

Open the public page in a private/incognito window (so it's a cold load),
click Run game, and play the first few minutes. The whole game should be
playable start to finish in the browser.

## (Optional) GitHub Pages mirror

If the project ever lands on GitHub: Settings → Pages → deploy from a
branch → point it at a branch containing the `dist/` output. The game
already builds with relative paths (`vite.config.js`), so it works from
a subfolder without changes.
