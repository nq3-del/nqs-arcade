# Full-game cutscenes and family recordings

The campaign has **42 directed in-engine scenes** and **175 recording cues**: 37 first-play scenes, five peaceful return visits, 150 story lines and 25 gameplay soundbites. The actual family recordings are still to be supplied. Every scene works with captions in the meantime.

Open [the printable recording script](public/recording-script.html) in a browser, or read [the plain-text script](public/recording-script.txt). The HTML sheet filters by performer, switches between actor order and story order, includes the scene plan, and remembers a separate local take checklist. Print the selected performer to give each reader their own pages.

## Recording cast

- The two creative directors can take Hero Form A and Hero Form B.
- Dad can record Narrator, Daddy and the playful Big Boss in separate sessions.
- Grandad, Nana, Mummy and Leah can record themselves, or a willing stand-in can cover a role.
- Ayla has three optional nonverbal laughs. No dialogue or forced performance is required.

These are proposed casting assignments. The hero names, origin of the magic and Big Boss's identity remain the children's decisions. The script keeps the established family powers and uses a friendly pantomime tone.

## Put a recording in the game

1. Record only the dialogue, with about half a second of quiet at each end. Keep two or three raw takes in a separate folder.
2. Select a final take and name it using the cue ID, for example `c00-awakening-01.wav`.
3. Put it in `public/audio/voice/`. Use one file per cue. WAV, MP3, OGG and M4A are indexed; decoding support depends on the browser. WAV mono at 48 kHz and 16- or 24-bit is a useful final format.
4. Run `npm run recordings` and refresh the game. `npm run dev` and `npm run build` also regenerate the recording pack and audio index.
5. Press the circular-arrow button in the scene to check the take. A duplicate format for the same cue causes the indexer to ask you to choose one, rather than silently choosing a take.

The generated `public/audio/voice/manifest.json` lists **only files actually present**. Missing lines never produce speculative audio requests. A missing, undecodable or browser-blocked recording leaves the captions available. `public/recording-cues.json` contains the full script and staging metadata; it is distinct from the smaller playback manifest.

## Campaign coverage

| Part | Scenes |
| --- | --- |
| Origin | Awakening and departure after the movement/form lessons |
| Broken Kingdom | Arrival, recovered family message, shadow introduction, Grandad rescue, peaceful revisit |
| Filthy Forest | Arrival, family message, shadow introduction, Nana rescue, peaceful revisit |
| Palace of Perfection | Arrival, family message, shadow introduction, Mummy rescue, peaceful revisit |
| Fortress of Fury | Arrival, family message, shadow introduction, Leah and Ayla rescue, peaceful revisit |
| Stadium of Champions | Arrival, family message, shadow introduction, Daddy rescue, peaceful revisit |
| Ultimate Alliance | Team arrival, arena introduction and homecoming; spoken handoffs accompany all five ally contributions and the final dash |

Family messages play after the second mission in each rescue world. Every other mission transition also has recorded dialogue and a clear next-step line. Completed objectives are saved before scenes, so skipping or resuming cannot lose progress. The final arena waits for its introduction to finish before the boss attacks. Rescues and ending completion retain the game's existing save timing.

## Playback

Next, E or Space advances one line; either controller's jump/interact action can also advance. Previous and Replay revisit the current passage. Play scene enables automatic advancement, following the recorded take or a readable caption timer. Read at my pace restores manual advancement. Skip finishes the scene and runs its completion callback once. Escape pauses the game and voice together. The existing mute and volume settings control recorded dialogue as well as effects.

Stage puppets are temporary: the director hides the live actors and player rings, stages the speakers, moves the camera, and restores the live actors afterwards. It does not change either player's physical position, form or health. Gameplay deadlines are shifted by the time spent watching, and the two-player/controller work from the concurrent session is preserved. Reduced-motion settings disable puppet gestures and camera drift. Story speech has priority over rate-limited gameplay soundbites.

The first-play caption-autoplay estimate is **9.1 minutes**, excluding gameplay, pauses, voice duration and return visits. The game's approximately 30-minute pacing remains a target requiring a family playtest; this pass is not a claim of a measured end-to-end duration.

## Files and verification

| File | Purpose |
| --- | --- |
| `src/data/cinematics.js` | Single source for dialogue, cue IDs, performers, delivery directions and shot choices |
| `src/diorama/CinemaDirector.js` | Scene staging, camera targets, captions, controls, voice playback and cleanup |
| `src/diorama/cinematics.css` | Cinematic layout, mobile sizing and motion preferences |
| `src/systems/Voice.js` | Manifest-backed recording playback, priority, pause/resume and cancellation |
| `scripts/build-recording-pack.mjs` | Printable HTML/text script, cue catalogue and actual-recording index |
| `tests/voice.test.js` | Cue validation, playback races, missing audio, priority and settings |
| `tests/cinematics.mjs` | All-scene browser checks, controls, audio, co-op restoration, responsive layout and recording sheet |

Run `npm run test:voice`. With a dev server running on port 5173, run `npm run test:cinematics`; set `GAME_URL` to use a different port. The current full campaign suite is `tests/campaign.mjs`; `tests/browser.mjs` covers the earlier compact-world implementation. Browser test reports and preview images are written to `test-results/`.

Existing files were copied to `.cutscene-backup-20261022/` before integration because this workspace is not a Git checkout. That backup predates some concurrent controller/co-op changes; it is not a whole-project restore point.

## Cutscene verification, 22 October 2026

The 42-scene / 175-cue browser suite passed against the isolated `.cutscene-qa` copy, including real audio decoding with an in-memory test tone, two-player cleanup, manual and automatic playback, mobile layout, and the recording sheet. No test tone is installed in the voice folder. The eight voice unit tests and six save tests passed, and the production build succeeded. The other session continued changing gameplay features during this work; the cutscene catalogue, director, voice player and cinematic stylesheet match the tested copy. The isolated copy avoids live reloads during verification.
