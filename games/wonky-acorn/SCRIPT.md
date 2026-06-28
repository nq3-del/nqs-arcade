# DIARY OF A WONKY ACORN

### *High School Mystery* — Full Script & Narrative Bible

> A reference document for building the game. Keep it close, change it freely.

---

## Logline

Pico is a small, soft-hearted acorn from the cosy little town of Acornville. When his parents announce — over pancakes — that the family is moving to the big city, his whole world tips over. A new flat. A scary new high school. And one impossibly good new best friend, **Hazel**. Life is finally starting to feel okay… until Mum sends Pico to the market for dinner, and the butcher behind the counter takes one hungry look at a plump little acorn and reaches for his cleaver. What starts as a grocery run becomes a frantic, funny dash for survival — and the first thread of a much bigger mystery about why acorns keep going *missing* in the city.

---

## How to read this document

Every scene is written as:

- **SYNOPSIS** — what happens, in plain prose.
- **SCRIPT** — scene heading, *(stage directions in italics)*, and `CHARACTER: dialogue`.

Two tags appear throughout:

- **(CANON)** — already built into the game ([js/game.js](js/game.js)). Reuse these lines/beats as-is.
- **(NEW)** — invented for this script. Revise freely; nothing here is locked.

---

## Tone & Voice

- **Earnest first, funny underneath.** Pico means everything he says. The comedy comes from how small and sincere he is in a world that's too big for him.
- **Cosy → wobbly → scary-funny.** The story breathes: warm home beats, then anxious new-place beats, then a slapstick-terror set-piece. Never *genuinely* grim — even the butcher is cartoonish.
- **Humour amid sadness.** The pancake "less salt" joke is the template: a real, sad moment (he's crying into his breakfast) undercut by something silly.
- **Childlike, not childish.** Pico is innocent but not stupid. He notices things. That's what makes him a good little detective later.
- **Show feeling through objects.** A jumper that "still smells like home," a battered copy of *Treasure Island* — the world tells the story.

**Emotional arc of the whole game:** *Safe → Uprooted → Lonely → Befriended → Brave.*

---

## Cast

| Character | Role | Voice / Notes | Tag |
|---|---|---|---|
| **Pico** | Hero. A wonky little acorn with a peach-coloured belly. | Sincere, jumpy, kind, easily overwhelmed, secretly brave. | (CANON) |
| **Granny** | Pico's mum. Flowers on her cap, white hair tufts. | Warm, steady. Calls Pico **"sweetheart."** | (CANON) |
| **Grampa** | Pico's dad. White moustache, tiny glasses. | Gruff but loving. Calls Pico **"son."** Bad at delivering bad news. | (CANON) |
| **Hazel** | The best friend. The "secret acorn." | Fast-talking, fearless, curious, loyal. The brave to Pico's careful. | (CANON tease → NEW friend) |
| **The Butcher** | Antagonist of Chapter 5. A huge, sweaty figure behind the deli counter. | Cartoonish menace. Sing-songy, polite, terrifying. Never quite catches you. | (NEW) |
| **Mr. Pemberton-Pine** | Hazel & Pico's history teacher; runs the "Lost & Found" board. | Kindly, distracted, knows more than he lets on. | (NEW) |
| **Brunk** | School rival — a big, glossy horse-chestnut (conker). | Picks on the "soft little acorns." Comic-relief bully who turns ally. | (NEW) |
| **Old Walnut** | The market's oldest stallholder. | Cryptic warnings nobody believes. The "don't go to the butcher's, child" voice. | (NEW) |

---

## World

- **Acornville** *(CANON)* — Pico's home town. Soft, rolling, golden. A bedroom, a kitchen with a round table and pancakes, the whole world he's ever known. We *leave* it in Chapter 1.
- **The City** *(NEW — replaces the old "Meadow")* — Tall, loud, grey-and-neon, full of strangers. Pico's family moves into a small flat here.
  - **Pico's Flat** — Cramped, full of moving boxes (CLOTHES, TOYS, BOOKS, STUFF). His new room starts "so empty."
  - **Conker Heights High** — The high school. Lockers, a long hallway, a cafeteria, and a corkboard by Mr. Pemberton-Pine's room reading **"MISSING — HAVE YOU SEEN THESE ACORNS?"**
  - **The Market District** — A maze of stalls, awnings, and crates. Cosy on the surface.
  - **Sawbones & Sons, Family Butcher** — The one shop on the market's dark corner. The chase happens here.

---
---

# CHAPTER 1 — THE MOVE
### *"A short story in which Pico has bad news for breakfast."* (CANON)

> Mostly already built. Reuse all canon lines verbatim; the only change is that the family is now moving to **the city** rather than a meadow.

### 1.1 — Bedroom, Morning *(CANON)*

**SYNOPSIS:** An alarm clock rattles itself off the nightstand. Pico springs out of bed, already certain today is going to be a good day.

```
INT. PICO'S BEDROOM, ACORNVILLE — MORNING

(The alarm clock wiggles, rings, and nearly falls. PICO shoots
upright and leaps out of bed, arms thrown wide.)

PICO: I'M READY!
```

### 1.2 — Kitchen, Breakfast *(CANON)*

**SYNOPSIS:** Pancakes! Pico's joy curdles as his parents sit him down. Grampa fumbles the worst sentence of his life. Pico bursts into a literal flood of tears — and, mid-sob, still has notes on the pancakes.

```
INT. KITCHEN, ACORNVILLE — CONTINUOUS

(A round table. A stack of pancakes. PICO bounds to his chair.)

PICO: Pancakes! My favourite!

GRANNY: — Sit down, sweetheart. We need to talk.

(A pause. GRAMPA shifts. He is no good at this.)

GRAMPA: Bad news, son… we're moving.

PICO: ...

GRAMPA: Pack up and say your goodbyes.

PICO: NOOOOOOOOOOOO!

(The tears come. They keep coming. They flood the kitchen floor.
Through it all, PICO mechanically eats one pancake.)

PICO: (sniffling, chewing) Could do with a little less salt.
```

> **(NEW — one-line addition)** Before the scene fades, plant the destination so Chapter 2 lands:
```
GRANNY: It's a lovely flat, sweetheart. Right in the heart of the city.

PICO: (small) ...the city?
```

### 1.3 — Packing & Departure *(NEW)*

**SYNOPSIS:** A quiet montage. Pico packs his whole life into four labelled boxes, says goodbye to his bedroom, and watches Acornville shrink to a dot through the back window of the moving truck. The engine rumbles. *(The "engine drive transition" already exists in-game.)*

```
INT. PICO'S EMPTY BEDROOM, ACORNVILLE — LATER

(Bare walls. Four boxes by the door: CLOTHES, TOYS, BOOKS, STUFF.
PICO stands in the doorway and looks back once.)

PICO: (whisper) Bye, room.

EXT. ACORNVILLE — MOVING TRUCK — CONTINUOUS

(The truck pulls away. Through the rear window, Acornville gets
smaller and smaller, then gone. Engine hum. Cut to black.)
```

---
---

# CHAPTER 2 — THE BIG CITY
### *(NEW — adapts the canon "new room / boxes" beats to a city flat)*

### 2.1 — Arrival *(adapts CANON arrival beat)*

**SYNOPSIS:** The truck stops outside a tall building. The city is enormous, loud, and indifferent. Granny nudges a stunned Pico toward the front door.

```
EXT. CITY STREET — OUTSIDE THE NEW FLAT — DAY

(Towers. Traffic. A hundred strangers, none of them acorns.
PICO stares straight up, tiny.)

GRANNY: Go on in and unpack, sweetheart. We'll be in in a minute.
```

### 2.2 — The Empty Room *(CANON box-memory beats)*

**SYNOPSIS:** Pico steps into a bare new bedroom stacked with the four boxes from home. *Touch each box* to unlock a memory of Acornville. The objective is small and sad: make this empty place feel like somewhere.

```
INT. PICO'S NEW ROOM, CITY FLAT — DAY

GRANNY: Welcome to your new room, sweetheart!

PICO: It's… so empty.

(OBJECTIVE: Touch each box.)

— Touching CLOTHES:
PICO: My favourite jumper… still smells like home.

— Touching TOYS:
PICO: My old toys! I should've packed these better.

— Touching BOOKS:
PICO: "Treasure Island"… I read this every night in Acornville.

— Touching STUFF:
PICO: I don't even remember what's in this one.

(When all four are touched, PICO sets the Treasure Island book on
the windowsill. Beat. The room feels a fraction more like his.)
```

### 2.3 — City Night *(NEW)*

**SYNOPSIS:** Night one. Pico can't sleep; the city glow leaks through the curtains, the noise never stops. Granny sits on the edge of his bed.

```
INT. PICO'S NEW ROOM — NIGHT

PICO: It's too loud. I can't hear the trees.

GRANNY: I know, sweetheart. New places are loud until they're home.

PICO: When does it stop being new?

GRANNY: When you've got a reason to look forward to tomorrow.

(She kisses his cap. Lights out. PICO stares at the ceiling.
Beat. Then, small and brave:)

PICO: ...High school tomorrow.
```

---
---

# CHAPTER 3 — FIRST DAY AT CONKER HEIGHTS HIGH
### *(NEW — introduces Hazel and seeds the mystery)*

### 3.1 — The Wrong Foot *(NEW)*

**SYNOPSIS:** Pico is hopelessly lost in a hallway built for bigger nuts. He's knocked over by **Brunk**, a glossy conker who decides the new "soft little acorn" is his favourite new target. Pico's books go everywhere.

```
INT. CONKER HEIGHTS HIGH — MAIN HALLWAY — MORNING

(A river of students. PICO clutches a map upside down.)

BRUNK: (slamming past) Watch it, soft-shell.

(PICO's books scatter. Laughter. He scrambles to gather them,
nose stinging, the whole city closing in.)

PICO: (to himself) Reason to look forward to tomorrow. Right.
```

### 3.2 — Meeting Hazel *(NEW — the heart of the game)*

**SYNOPSIS:** A hand appears in the chaos — **Hazel**, scooping up his books, talking a mile a minute, completely unbothered by Brunk. She's everything Pico isn't: quick, fearless, loud. She decides, instantly and without asking, that they're friends now.

```
INT. CONKER HEIGHTS HIGH — MAIN HALLWAY — CONTINUOUS

(HAZEL slides in, gathering PICO's books in one sweep.)

HAZEL: Ignore Brunk. He's ninety percent shell and ten percent
       echo. You're new, right? Obviously you're new, nobody
       holds a map like that unless they're new. I'm Hazel.

PICO: (overwhelmed) I'm— Pico.

HAZEL: Pico. Good name. Short. Efficient. (hands back Treasure
       Island) You read this? I love this. Okay, we're friends
       now, that's decided, keep up —

PICO: (a real smile, his first in the city) ...Okay.
```

### 3.3 — The Missing Board *(NEW — mystery seed)*

**SYNOPSIS:** Hazel drags Pico past Mr. Pemberton-Pine's classroom. On the corkboard outside: flyers. **MISSING.** Acorn after acorn. Hazel lowers her voice for the first time all day — three students from their year just *stopped coming to school*. Nobody talks about it. The grown-ups say they "moved away." Hazel doesn't buy it.

```
INT. CONKER HEIGHTS HIGH — OUTSIDE HISTORY ROOM — DAY

(A corkboard. Flyers: "MISSING — HAVE YOU SEEN THESE ACORNS?")

HAZEL: (quiet, for once) Three from our year. Since autumn.

PICO: Where'd they go?

HAZEL: Teachers say "moved away." (beat) Nobody moves away in
       the middle of a Tuesday and leaves their locker open.

(MR. PEMBERTON-PINE leans out of his doorway.)

MR. PEMBERTON-PINE: Move along now, you two. And Pico —
                    welcome. Do stay where it's busy. The city's
                    no place for an acorn on his own.

(He smiles. It doesn't quite reach his eyes. He goes back inside.)

HAZEL: (whisper) See? Even he knows something.
```

> **Setup payoff note:** Pemberton-Pine's warning ("stay where it's busy") is the rule Pico is forced to break in Chapter 4 — the market errand sends him alone to the quiet corner of the city. That's the trap clicking shut.

---
---

# CHAPTER 4 — AN ERRAND FOR MUM
### *(NEW — cosy calm before the chase)*

### 4.1 — The List *(NEW)*

**SYNOPSIS:** A good evening at home. Pico's finally got a friend, a smile, a reason to look forward to tomorrow. Granny, delighted to see him bright again, sends him on a grown-up errand: down to the market for dinner. He's proud to be trusted. He doesn't notice which corner the list points to.

```
INT. PICO'S FLAT — KITCHEN — EVENING

GRANNY: Look at you, all cheerful. Did the city finally behave?

PICO: I made a friend. Her name's Hazel. She talks like a kettle.

GRANNY: (laughing) Then do something for me, sweetheart — pop to
        the market and get dinner. Here's the list. Straight
        there, straight back.

PICO: (puffing up) I can do that. I'm basically a city acorn now.

GRANNY: (kissing his cap) Straight there, straight back.
```

### 4.2 — The Market *(NEW)*

**SYNOPSIS:** The market is wonderful — colour, smells, friendly stalls. Pico ticks off the list, feeling capable for the first time since the move. He needs one last thing. The list points to the dark corner. **Old Walnut** grabs his sleeve and tries to warn him off. Pico, polite and trusting and brand-new to the city, thanks her and goes anyway.

```
EXT. MARKET DISTRICT — EVENING

(Stalls, awnings, warm light. PICO ticks items off, beaming.
He reaches the last one. The list points to a dark corner:
"SAWBONES & SONS, FAMILY BUTCHER.")

OLD WALNUT: (seizing his sleeve) Not there, child. Not the
            butcher's. The little ones who go in that door —
            (she looks at the MISSING posters pinned to her stall)
            — I never see come out.

PICO: (gently freeing himself) That's very kind, but Mum's
      waiting. Straight there, straight back!

OLD WALNUT: (to no one) ...Straight there. Aye. That's the
            trouble with the brave little ones.
```

---
---

# CHAPTER 5 — THE BUTCHER
### *(NEW — the chase set-piece. Comedic menace.)*

> This is the gameplay centrepiece: a frantic, funny run-away sequence. Written below as scripted beats so the level can be built moment to moment. The Butcher is **cartoonish, never gory** — sing-song, polite, enormous, and *always* a half-step too slow.

### 5.1 — The Counter *(NEW)*

**SYNOPSIS:** A bell dings. The shop is too quiet, too clean, too cold. The **BUTCHER** rises from behind the counter — vast, smiling, apron spotless. He's so friendly. He asks Pico to step a little closer. He looks at the plump little acorn the way you'd look at lunch.

```
INT. SAWBONES & SONS, FAMILY BUTCHER — EVENING

(A bell: DING. Hooks. A spotless counter. The BUTCHER unfolds
upward, and upward, and smiles.)

BUTCHER: Welcome, welcome! Don't be shy. Come closer, little
         one — let me get a proper look at you.

PICO: (reading list) Um — I just need one thing for my mum—

BUTCHER: (gazing, delighted) Oh, you're a plump one. Lovely and
         round. (he weighs an imaginary scale with his hand)
         You know… I don't get many acorns in here.

PICO: ...Acorns?

BUTCHER: (lifting an enormous cleaver, beaming) Stay verrry
         still, dear. This won't take a moment.

PICO: (every alarm in his body) — MUM WAS RIGHT ABOUT THE SALT.
```

> *Line is the callback gag: the pancake "salt" joke returns at the worst possible second.*

### 5.2 — THE CHASE *(NEW — gameplay)*

**SYNOPSIS:** Pico bolts. The Butcher gives chase through the shop, out into the market, and across the city. The set-piece is built from comedic near-misses — the Butcher is huge and unstoppable but clumsy; Pico is tiny and quick. Every escape is luck and panic, not skill.

**Suggested chase beats (build as level segments):**

1. **The Back Room** — Pico skids under the counter as the cleaver *THUNKS* into the chopping block behind him. Dodge swinging sausage-link ropes and hanging hams like a pendulum room.
2. **The Sausage Slip** — Pico flings a string of sausages behind him; the Butcher slips on them, cartoon-windmills his arms, and crashes through a stack of crates. *(Slapstick beat — buys distance.)*
3. **Out the Door** — Burst into the market. Knock over Old Walnut's apple barrel; apples cascade down the lane, bouncing the Butcher off his feet. She yells **"TOLD you, child! RUN!"** as Pico flashes past.
4. **The Awning Run** — Pico scrambles over market awnings and stall roofs; the Butcher tears through the canvas below, getting tangled like a ghost in a sheet.
5. **The Alley Maze** — Tight turns the big Butcher can't take cleanly. He keeps overshooting, sliding past alley mouths, his cleaver shrieking along the brick. *(Tension beat — quiet, breathing, then BANG he's back.)*
6. **The Near Miss** — A dead end. Pico freezes. The Butcher looms, raises the cleaver — and a hand yanks Pico sideways through a gap in the fence. **It's Hazel.**

```
EXT. CITY ALLEY — NIGHT — CONTINUOUS

(Dead end. The BUTCHER fills the alley mouth, cleaver high.)

BUTCHER: (sing-song) Nowhere left to roll, little acorn—

(A hand shoots through a gap in the fence and YANKS Pico away.)

HAZEL: THIS WAY. MOVE MOVE MOVE—

(They tumble through. The cleaver buries itself where Pico was.
The BUTCHER's huge eye appears at the gap, too wide to follow.)

BUTCHER: (genuinely sad) ...Aw. I do hate it when they're quick.
```

### 5.3 — The Drainpipe Escape *(NEW)*

**SYNOPSIS:** Hazel knows the city's gutters and rooftops like the back of her hand. She funnels them up a drainpipe and across the roofs while the Butcher rages below, shaking his cleaver, far too heavy to climb. They make it. They collapse, gasping, on a flat rooftop under the city stars.

```
EXT. ROOFTOP — NIGHT

(PICO and HAZEL collapse, heaving for breath. Below, the BUTCHER
shrinks, shouting, shaking his fist.)

PICO: (between gasps) He— he wanted to— he said acorns—

HAZEL: (deadly serious now) Pico. The market butcher. The
       missing kids. (beat) It was never "moved away."

PICO: (the horror landing) ...The posters. They all needed one
      last thing from the shop on the corner.

HAZEL: (standing, fire in her eyes) Then we're gonna prove it.
       You and me. (offers a hand up) Partners?

PICO: (taking it) ...Straight there. Straight back.

(They look out over the glittering, dangerous, suddenly-solvable
city. SMASH CUT — TITLE CARD: "THE WONKY ACORN MYSTERIES.")
```

---
---

# CHAPTER 6 — THE INVESTIGATION
### *(NEW — invented resolution. Revise freely.)*

### 6.1 — Nobody Believes Them *(NEW)*

**SYNOPSIS:** Pico and Hazel report the Butcher. The grown-ups don't believe a word — *Sawbones & Sons has been a respectable family shop for a hundred years.* Even Granny gently doubts that her sweetheart wasn't just frightened by a big man with a knife. Only Mr. Pemberton-Pine goes quiet, and tells them — carefully — to bring him *evidence*, not stories. The two friends realise they're on their own. So they start a diary. *(The "Diary" of the title: a casebook of clues.)*

### 6.2 — Clues Across the City *(NEW — investigation gameplay)*

**SYNOPSIS:** A series of light detective levels — gather evidence linking the Butcher to the missing acorns. Each clue is a small playable scene:

- **The Lockers** — Each missing student's locker holds a market receipt from **Sawbones & Sons**, dated the day they vanished.
- **Old Walnut's Stall** — She gives them the truth she's been shouting for years: the Butcher only ever wants the *young, round* ones, and only when they come *alone*.
- **Brunk's Turn** — The school bully corners them — but it turns out *his* little cousin is one of the missing. Brunk stops being a bully and becomes a (loud, reluctant) ally. The conker's thick shell finally has a use: he can take a hit.
- **The Back of the Shop** — A night infiltration. Behind the cold room, a hidden cellar — and the missing acorns, alive, in crates, waiting. The Butcher's been *collecting*, not cooking. *(Keeps the tone non-gory: he's a hoarder of "the perfect acorns," a cracked, lonely villain, not a monster.)*

### 6.3 — The Trap *(NEW — climax)*

**SYNOPSIS:** The three of them — careful Pico, fearless Hazel, armoured Brunk — set a trap. Pico volunteers to be **bait**: the plump little acorn, alone, walking right back into the shop. It's the bravest thing the most timid character in the game has ever done. The Butcher takes the bait. The chase reverses — this time *Pico's* leading *him*, into the trap. With Hazel working the gutters and Brunk bowling the Butcher off his feet, they drop him into his own cold cellar and bolt the door. The missing acorns walk free into the dawn.

```
INT. SAWBONES & SONS — CELLAR — NIGHT

(The BUTCHER thuds down into his own cellar. The door BOOMS shut.
HAZEL throws the bolt. BRUNK sits on it for good measure.)

BUTCHER: (muffled, sing-song, almost wistful) ...Such a plump
         little one. Such a quick little one.

PICO: (breathing hard, to the door) Mum says I take after my
      dad. (beat) He's quick too.

(The missing acorns climb out, blinking, into the morning. One
of them is BRUNK's cousin. Brunk pretends he isn't crying.)
```

### 6.4 — Home *(NEW — ending + sequel hook)*

**SYNOPSIS:** Morning. The city — the same loud, grey city — finally feels a little like *his*. Pico has a best friend, an unlikely crew, and a reason to look forward to tomorrow. Back in his room, he opens his diary and writes the first line of the next case. Because Mr. Pemberton-Pine, watching the freed acorns go home, murmurs that the Butcher was only ever a *supplier* — and somewhere out there is whoever he was supplying. The mystery's bigger than one shop on one corner. *To be continued.*

```
INT. PICO'S ROOM, CITY FLAT — MORNING

(No longer empty. Posters, plants, Hazel's stuff everywhere.
Treasure Island on the windowsill. PICO opens a worn diary and
writes.)

PICO: (V.O.) Dear Diary. I used to think moving away was the
      worst thing that could happen to an acorn. (beat) Turns
      out it's only the second worst. But I've got Hazel now.
      And a city full of mysteries. And — (he looks at the page) —
      a butcher who answered to someone.

(He underlines one word: "SOMEONE." Smiles. Closes the diary.)

PICO: (V.O.) ...Reason to look forward to tomorrow.

TITLE CARD: "PICO WILL RETURN."
```

---
---

# APPENDIX

## A. Reusable in-game lines (CANON — keep these exact)

- `I'M READY!`
- `Pancakes! My favourite!`
- `— Sit down, sweetheart. We need to talk.`
- `Bad news, son… we're moving.`
- `Pack up and say your goodbyes.`
- `NOOOOOOOOOOOO!`
- `Could do with a little less salt.`
- `Go on in and unpack, sweetheart. We'll be in in a minute.`
- `Welcome to your new room, sweetheart!`
- `It's… so empty.`
- Box memories:
  - CLOTHES — `My favourite jumper… still smells like home.`
  - TOYS — `My old toys! I should've packed these better.`
  - BOOKS — `"Treasure Island"… I read this every night in Acornville.`
  - STUFF — `I don't even remember what's in this one.`

## B. New running gags & motifs to seed early, pay off late

- **"Straight there, straight back."** — Granny's instruction (4.1) → Pico's mantra under fire (5.3) → his investigator's creed (6.1). Plant it, repeat it, land it.
- **"Reason to look forward to tomorrow."** — Granny (2.3) → Pico's ending V.O. (6.4). The emotional spine of the game in one phrase.
- **The salt joke.** — Pancake gag (1.2) → callback at peak danger (5.1). One line, two completely different tones.
- **Treasure Island.** — Acornville comfort object (2.2) → survives the move → sits on the windowsill of a room that's finally home (6.4). The "you're okay now" visual.
- **Shell vs. soft.** — Brunk mocks "soft-shells" (3.1) → his thick shell becomes the team's tank (6.2–6.3). The bully's insult becomes the hero's asset.

## C. Open hooks / alternates (Noah's call)

- **Hazel's secret.** She's tagged in the old build as "the secret acorn." Optional reveal for a later chapter: Hazel's own sibling was the *first* to go missing — which is why she knows the gutters, and why she never believed "moved away." Adds weight; only pull this if you want her arc to get heavier.
- **Butcher's boss.** The ending hook ("SOMEONE") is deliberately vague. Could be a restaurant, a collector, a city-wide ring — pick when you know Chapter 7.
- **The Diary as mechanic.** Consider making the literal diary the game's hub: clues, character notes, and chapter recaps live in it. Ties directly to the title.
- **Acornville return.** A nostalgia chapter where Pico briefly visits the old town and finds it both smaller and dearer than he remembered.

---

*End of script (current draft). Tell Ted the rest whenever you've thought of it.* 🌰
