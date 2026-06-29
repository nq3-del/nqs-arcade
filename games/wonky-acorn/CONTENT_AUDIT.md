# Content Audit — *Diary of a Wonky Acorn*

### Measured against [CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md) · target audience: 11 and under

> **How to read this:** each finding lists where it lives, a short quote, which guideline rule
> it breaks (🔴 Red / 🟡 Amber from the guidelines), and the fix. Line numbers are from the
> current build and were cross-checked against [js/game.js](js/game.js) and [SCRIPT.md](SCRIPT.md).
> **No code has been changed yet** — this is the remediation spec for the next pass.

---

## Summary verdict

The **warm half of the game is already perfectly age-appropriate** — the move, the homesickness,
the friendship, the bully-who-reforms, and the language are all clean (no profanity, sex, drugs,
or romance anywhere). **Every problem is concentrated in the Butcher arc (Chapters 5–6 + the
free-play jail).** The core issue: a **butcher with a real cleaver** who uses **grooming-style
and "eat you" language** and is tied to a **kidnapping "supplier"** plot, ending in a **realistic
jail**. None of that clears the under-11 bar.

**The fix is a single, coherent re-skin:** replace the Butcher with **Scratchett**, a comically
evil, humanoid **squirrel hoarder** who *collects* plump acorns (never eats them), carries a
**sack** (no blade), and gets comically shut in his own messy nut-pantry (no jail). This keeps
the chase, the rescue, the bravery, and the mystery — and actually matches a line the script
*already* has: *"collecting, not cooking… a hoarder of the perfect acorns, a cracked, lonely
villain, not a monster."* (SCRIPT.md ~443).

**Counts:** ~14 items to change, all in the Butcher arc. Everything else: leave as-is.

---

## Findings — must change 🔴

### A. The counter scene (first meeting with the villain)

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| A1 | [game.js:5470](js/game.js#L5470) | *"Welcome, welcome! Don't be shy. Come closer, little one — let me get a proper look at you."* | 🔴 grooming-style language ("come closer," "let me get a proper look at you") | Rewrite as vain-collector delight: *"Oh! Oh my. Now **that's** a fine, round little acorn…"* (no "come closer / look at you"). |
| A2 | [game.js:5472](js/game.js#L5472) | *"Oh, you're a plump one. Lovely and round. … I don't get many acorns in here."* | 🔴 appraising a child's body ("plump," "lovely and round") | Re-aim the praise at *the collection*, not his body: *"You'd be the **prize of my whole hoard**! I simply **must** have you on the shelf!"* |
| A3 | [game.js:5475-5491](js/game.js#L5475-L5491) | The Butcher **raises an animated cleaver**, then: *"Stay verrry still, dear. This won't take a moment."* | 🔴 real weapon + 🔴 "stay very still" menace | Remove cleaver mesh + lift animation (see §Props). Replace with him whipping out a giant **collecting sack**: *"Hold still, dear — you'll fit **juuust** right in my sack!"* (silly, not menacing). |
| A4 | [game.js:5495](js/game.js#L5495) | *"— MUM WAS RIGHT ABOUT THE SALT!"* (salt callback gag) | ✅ none — this is a great joke | **Keep.** (The villain motive changes, but Pico panicking about salt still works as pure comedy.) |
| A5 | [game.js:5554](js/game.js#L5554) | *"Gotcha, little one! Sit verrry still now…"* (`onButcherCaught`) | 🔴 "sit very still" menace on capture | *"Gotcha! Into the sack you pop — ooh, you'll look **lovely** between my walnuts!"* (collector, silly). |

### B. The chase (Chapter 5 set-piece)

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| B1 | [SCRIPT.md:375-396](SCRIPT.md) | Chase beats: *"the cleaver **THUNKS** into the chopping block,"* *"his cleaver **shrieking** along the brick,"* *"the cleaver **buries itself** where Pico was."* | 🔴 weapon realism / near-miss-with-a-blade | Re-write every cleaver beat as **sack/jar slapstick**: he tries to *bag* Pico and keeps missing — the sack THWUMPS the chopping block, snags on a hook, scoops up a string of sausages instead. Keep the comedy, lose the blade. |
| B2 | [SCRIPT.md:379](SCRIPT.md) | *"(Tension beat — quiet, breathing, then **BANG** he's back.)"* | 🟡→🔴 dread-building silence | Replace with a **bouncy** beat: he's stuck headfirst in a barrel, legs wiggling, then pops out with a comedy *BOING*. Keep it light, never silent-and-stalking. |

### C. The "supplier" / trafficking hook

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| C1 | [game.js:5690-5692](js/game.js#L5690-L5692) | *"You little SHELL. You don't understand." / "I answer to SOMEONE. I had to. They needed the acorns…" / "…and I have to answer to them again. Soon."* | 🔴 trafficking / "answers to someone" framing | Drop the supply-chain entirely. Make him a **lonely hoarder**: *"You don't understand! I just wanted the **finest** collection in the whole city… nobody has acorns like mine."* |
| C2 | [SCRIPT.md:467](SCRIPT.md), [SCRIPT.md:523](SCRIPT.md) | Ending hook: *"the Butcher was only ever a **supplier** — and somewhere out there is whoever he was supplying."* | 🔴 implies a ring that *moves* children | Soften to a **silly rivalry** hook: *"…and Scratchett wasn't the only collector in the city. Somewhere out there is someone with an **even bigger** hoard."* (A comic rival, not a trafficking ring.) |
| C3 | [game.js:5669](js/game.js#L5669) | Brunk: *"…I helped him. The pranks. The acorns."* | 🟡 complicity in abduction | Keep the redemption beat, lighten the crime: he helped the villain *find the roundest acorns for the collection* — he didn't know they'd be **kept**. |

### D. The realistic jail (free-play, post-ending)

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| D1 | [game.js:2371-2654](js/game.js#L2371-L2654) | A full **jail**: iron **bars** ([2457](js/game.js#L2457)), a **shackle** ([2475](js/game.js#L2475)), a wooden **bucket** ([2543](js/game.js#L2543)), a `JAIL` sign ([2491](js/game.js#L2491)). | 🔴 realistic captivity | Re-theme the whole structure into **Scratchett's nut-pantry / lock-up**: shelves of acorns and jars instead of bars; remove the shackle and bucket; swap the `JAIL` sign for a comedic one (e.g. `THE NUT NICK` or `SCRATCHETT'S LOCK-UP`). He's comically shut in *with his own hoard*. |
| D2 | [game.js:5715](js/game.js#L5715) | Hazel: *"The butcher's in the **jail** across the meadow. They'll keep him there a long time."* | 🔴 jail framing | *"Scratchett's locked in his own pantry across the meadow — buried in acorns. Serves him right."* |
| D3 | [game.js:5941-5943](js/game.js#L5941-L5943) | Free-play taunts at the locked-up villain: *"Stuck in there, eh?" / "Bet you wish you could have a sausage now." / "How's the salt in there?"* | 🟡 mild — but tied to jail/sausage | Keep the playful teasing, re-theme to the pantry: *"Comfy in there, Scratchett?" / "Counting your acorns?" / "How's the hoard?"* |
| D4 | [game.js:5971](js/game.js#L5971) | Villain reply: *"(BANG!) I told you. **HERE I COME**."* (an escape stinger) | 🔴 jump-scare / "he's escaping" dread | Replace with a **harmless grumble**, no escape: *"(muffled) …Bah. My beautiful collection… all gone."* (sad-funny, never threatening). |

### E. 3D props & signage (geometry + canvas text, not just dialogue)

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| E1 | [game.js:1699-1716](js/game.js#L1699-L1716) | Storefront canvas sign: `SAWBONES & SONS` / `FAMILY BUTCHER` | 🔴 butcher framing | Render **`SCRATCHETT & SONS`** only — **drop the second "FAMILY BUTCHER" row entirely** (Noah: name only, no tagline). |
| E2 | [game.js:1724-1727](js/game.js#L1724-L1727) | A metal **cleaver** mesh mounted on the storefront | 🔴 weapon | Replace with a friendly shop motif (an acorn, a sack, or a jar of nuts). |
| E3 | [game.js:2351-2359](js/game.js#L2351-L2359) | The Butcher model's **cleaver** blade + handle meshes (`cleaverBlade`, `cleaverHandle`) | 🔴 weapon | Remove both meshes; give Scratchett a **velvet collecting sack** prop instead. Update the lift animation in A3 to swing the sack. |
| E4 | [game.js:2221](js/game.js#L2221), [game.js:2235-2241](js/game.js#L2235-L2241) | Chopping block + hanging hams / sausage-links (butcher-shop dressing) | 🟡 butcher theming | Re-dress as a **hoarder's nut shop**: crates and sacks of acorns, jars, a tall cluttered shelf of "prize" nuts. (Sausages may stay as a single silly slapstick prop if useful for the chase.) |
| E5 | [game.js:4057-4064](js/game.js#L4057-L4064) | Voice config key `butcher: ['Bahh', 'Bad News', 'Fred', 'Ralph', 'Bruce', 'Daniel']` | 🟡 deep/menacing villain voice | Rename the key (e.g. `scratchett`) and retune to a **chittery, higher, fast** squirrel voice so he sounds funny-weird, not threatening. Update all `showSpeechFromNPC('butcher', …)` callers to match. |

### F. Logline & tone notes in the bible

| # | Location | Current | Breaks | Fix |
|---|---|---|---|---|
| F1 | [SCRIPT.md:11](SCRIPT.md) | *"…the butcher behind the counter takes one hungry look at a plump little acorn and **reaches for his cleaver**."* | 🔴 weapon + "hungry"/eat framing | Rewrite the logline around Scratchett the collector: *"…the squirrel behind the counter takes one greedy look at a plump little acorn and reaches for his **collecting sack**."* |
| F2 | [SCRIPT.md:32](SCRIPT.md) | Tone note: *"a **slapstick-terror** set-piece"* | 🟡 "terror" | Re-word to *"a **slapstick-chase** set-piece"* — keep the slapstick, lose the terror. |

---

## Already compliant — leave as-is ✅

Don't over-correct. These are good and on-message:

- **Chapter 1 — the move / pancakes** ([SCRIPT.md:86-120](SCRIPT.md)). Sadness, but immediately
  softened by the salt joke and loving parents. ✅
- **Chapter 2 — homesickness / city night** ([SCRIPT.md:188-207](SCRIPT.md)). Sad, but **comforted
  on-screen** by Granny ("New places are loud until they're home"). Textbook Amber-done-right. ✅
- **Chapter 3 — Brunk the bully** ([SCRIPT.md:215-230](SCRIPT.md)). Mild teasing ("soft-shell"),
  no real cruelty, and he **reforms** later. ✅
- **Hazel & the friendship** — the warm core of the game. ✅
- **The "Straight there, straight back" / "reason to look forward to tomorrow" motifs.** ✅
- **Language** — zero profanity, no sexual content, no drugs/alcohol/smoking, no romance. ✅
- **The salt callback gag** ([game.js:5495](js/game.js#L5495)). Pure comedy — keep it. ✅

---

## Appendix 1 — The Scratchett Re-skin Spec

**Character — "Scratchett":** a **humanoid** (upright, anthropomorphic) squirrel shopkeeper.
**Funny, weird, and theatrical** — bushy tail, waistcoat, twitchy paws, a too-wide too-friendly
grin, big unblinking eyes, a chittery little giggle. A **hint** of creepy that **always tips
back into silly**. Vain and greedy; he doesn't want to *hurt* anyone — he wants the **roundest,
plumpest acorns for his collection**, and he simply cannot help himself. Underneath: lonely, a
bit pathetic, never a monster. **Pitched gentle enough for the youngest players — quirky, not
nightmare.**

- **Shop:** **`SCRATCHETT & SONS`** (name only — no tagline) replaces `SAWBONES & SONS, FAMILY
  BUTCHER`. A cosy-but-cluttered corner shop that's secretly a front for his enormous winter hoard.
- **Motive:** **collecting / hoarding** plump acorns — **never eating**.
- **Prop:** a big velvet **collecting sack** (and jars/crates). **No blades, no heat, no weapons.**
- **Comeuppance:** comically **shut in his own nut-pantry**, buried in acorns. **No jail.**
- **Voice:** chittery, fast, high — funny-weird, not deep-and-scary.
- **Sequel hook:** a silly **rival collector** out there, not a trafficking ring.

---

## Appendix 2 — NEW errand cutscene (expanded Chapter 4: "An Errand for Mum")

Noah asked for a proper little cutscene showing **how Mum and Dad send Pico to Scratchett & Sons.**
This expands the existing 4.1 beat. It is fully guideline-compliant: warm, comforting, and it
plants the gentle trap (the quiet corner Mr. Pemberton-Pine warned about) without any menace.

```
INT. PICO'S FLAT — KITCHEN — EVENING

(Steam. A bubbling pot. Something special is cooking. GRANNY stirs.
GRAMPA reads in his chair. PICO bounces in, glowing from his first
good day.)

GRANNY:  Look at you — all smiles! Did the city finally behave?

PICO:    I made a FRIEND, Mum! Her name's Hazel. She talks like a kettle.

GRANNY:  (delighted) A friend already! Then tonight, we celebrate —
         our first proper dinner in the new home. (peers in the pot)
         ...if only I had the last little thing for it.

GRAMPA:  (lowering his book, proud) Send the lad, love. He's a city
         acorn now — aren't you, son?

PICO:    (puffing right up) I'm basically a city acorn now.

GRANNY:  (tucking a short list and a coin-purse into his paws) Then
         pop down to the market for me, sweetheart. It's all on the
         list — last stop's the little shop on the corner. Scratchett
         and Sons. (kisses his cap) Straight there, straight back.

PICO:    Straight there, straight back!

(He bounds for the door, list held high. He doesn't notice the
corner the list points to — the quiet one Mr. Pemberton-Pine told
him to keep away from.)

GRAMPA:  (softly, as the door clicks shut) ...Good lad.
```

**Build notes for the fix pass:**
- Lives in [SCRIPT.md](SCRIPT.md) §4.1 and as a cutscene in [js/game.js](js/game.js) before the
  market walk (the errand checkpoint is `"errand"`).
- Reuses the existing **kitchen scene** and the **"Straight there, straight back"** motif already
  in the build.
- The list's final item must read **`SCRATCHETT & SONS`** (was `SAWBONES & SONS, FAMILY BUTCHER`).
- Keep it short on-screen — two or three speech bubbles per beat, in the established bubble style.

---

*This audit pairs with [CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md). Apply the fixes above and
the game clears the under-11 bar while keeping its whole heart — the chase, the rescue, the
bravery, and the mystery — fully intact.* 🌰
