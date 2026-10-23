// The subtitle, recording sheet and audio filename all come from this catalogue.
// Hero names, the origin of the magic and the villain's identity stay undecided.
import { adventureFor } from "./missions.js";
export const VOICE_ROLES = {
  narrator: { name: "Narrator", performer: "Dad, or another storyteller", direction: "Warm bedtime-story voice. Let the jokes land; never rush.", color: "#efd2a1" },
  hero_a: { name: "Hero · Form A", performer: "Creative director 1", direction: "Curious, quick and brave. Your normal voice is perfect.", model: "A", color: "#f2b5ad" },
  hero_b: { name: "Hero · Form B", performer: "Creative director 2", direction: "The same hero in their other form: thoughtful, playful and determined.", model: "B", color: "#bedcaa" },
  grandad: { name: "Grandad", performer: "Grandad, or a willing stand-in", direction: "Practical and reassuring, with a dry little joke.", model: "grandad", color: "#ffbf64" },
  nana: { name: "Nana", performer: "Nana, or a willing stand-in", direction: "Gentle confidence. Kindness is her superpower.", model: "nana", color: "#b7e877" },
  mummy: { name: "Mummy", performer: "Mummy, or a willing stand-in", direction: "Playful glamour and warmth; enjoy the dramatic words.", model: "mummy", color: "#ef9be0" },
  leah: { name: "Leah", performer: "Leah, or a willing stand-in", direction: "Cheerful delivery captain, thoroughly used to the chaos.", model: "leah", color: "#ffb09c" },
  ayla: { name: "Ayla", performer: "Optional happy giggle or an adult's playful substitute", direction: "Nonverbal only. A comfortable little giggle is enough; this role can stay silent.", model: "leah", color: "#ffd3b1" },
  daddy: { name: "Daddy", performer: "Dad", direction: "An encouraging football coach. Celebrate without shouting into the mic.", model: "daddy", color: "#a8d8ff" },
  bigboss: { name: "Big Boss", performer: "Dad or either child, using a silly theatrical voice", direction: "A comical pantomime rival, never frightening. No fixed name or backstory yet.", model: "bigboss", color: "#d0c1ee" },
};

const beat = (speaker, text, delivery, shot = speaker, gesture = "talk") => ({ speaker, text, delivery, shot, gesture });
const story = (id, level, title, kind, trigger, staging, beats) => ({
  id, level, title, kind, trigger, staging,
  beats: beats.map((b, i) => ({ ...b, id: `${id}-${String(i + 1).padStart(2, "0")}` })),
});

export const CINEMATICS = [
  story("c00-awakening", 0, "A little spark", "intro", "Enter the Origin for a new visit.", "Glide over the glade. Reveal the first drawing, then the other form of the same hero in a shimmer of light.", [
    beat("narrator", "Some stories begin with a great big bang.", "Build anticipation, then leave a beat.", "wide"),
    beat("narrator", "This one begins with a little spark.", "Small and full of wonder.", "hero_a", "wonder"),
    beat("hero_a", "Oh! Are these my feet?", "Delighted discovery.", "hero_a", "wonder"),
    beat("hero_b", "And this is my other me!", "A surprised laugh; one hero discovering another form.", "hero_b", "wonder"),
    beat("narrator", "One hero. Two forms. A whole family to bring home.", "Warm purpose, with a pause between each thought.", "wide"),
    beat("hero_a", "Right. Let's find our family.", "Quietly brave.", "hero_a", "nod"),
  ]),
  story("c00-departure", 0, "Through the little doorway", "rescue", "Complete the Origin lessons and enter its portal.", "Reveal the lit portal. The hero looks towards the five worlds, then takes a hopeful bow towards the doorway.", [
    beat("narrator", "Five family legends are trapped in the worlds beyond.", "Clear and reassuring.", "portal"),
    beat("narrator", "Their borrowed shadows are making a spectacular mess.", "Amused at 'spectacular'.", "wide"),
    beat("hero_b", "Then we'll bring them back. Every single one.", "A promise, not a shout.", "hero_b", "nod"),
    beat("hero_a", "First stop: Grandad!", "Ready to go.", "hero_a", "cheer"),
  ]),
  story("c01-arrival", 1, "The kingdom that stopped", "intro", "Enter the Broken Kingdom before Grandad is rescued.", "Survey the quiet machinery. Frame Grandad behind the glowing cage, then the hero beside a fallen cog.", [
    beat("narrator", "A kingdom of whirring wonders has fallen strangely quiet.", "Wonder gives way to curiosity.", "wide"),
    beat("hero_a", "Grandad? I think your kingdom's broken.", "Calling across the garden.", "hero_a"),
    beat("grandad", "Only a bit. Unjam the engines, then bring my tools!", "Matter-of-fact, even from inside a cage.", "grandad"),
    beat("hero_b", "A silver thread! Someone has been pulling the strings.", "Curious, spotting a clue.", "hero_b", "wonder"),
  ]),
  story("c01-message", 1, "One little piece", "message", "Recover all three family-message pieces in the Broken Kingdom.", "A golden keepsake glints. Grandad's message is heard over a close view of the hero.", [
    beat("grandad", "Big repairs start with one little piece.", "A familiar bit of advice.", "hero_a"),
    beat("hero_a", "One little piece. Got it, Grandad.", "Remembering his advice.", "hero_a", "nod"),
  ]),
  story("c01-challenge", 1, "The borrowed judo", "quest", "Complete the Broken Kingdom's final rest-stone objective.", "Reveal Ultimate Shadow Grandad. Cut to the real Grandad, then back to the hero preparing to dodge.", [
    beat("narrator", "The machines are humming. One is definitely out of tune.", "Dry little joke.", "wide"),
    beat("grandad", "That shadow's borrowed my judo! Watch for the charge.", "Helpful warning, never alarmed.", "boss"),
    beat("hero_b", "Step aside. Wait for a rest. Then power pop!", "Three clear steps.", "hero_b", "nod"),
    beat("hero_a", "We're coming, Grandad!", "Brave and affectionate.", "hero_a", "cheer"),
  ]),
  story("c01-rescue", 1, "Good as new", "rescue", "Defeat Ultimate Shadow Grandad.", "The cage vanishes. Grandad joins the hero; the shadow army dissolves. Finish on a happy two-shot.", [
    beat("narrator", "The borrowed shadows fade. Grandad is free.", "Relief, with room for the reveal.", "wide"),
    beat("grandad", "A few loose screws? I can fix that.", "Proud little chuckle.", "grandad", "bow"),
    beat("grandad", "The kingdom... and my knees!", "A beat before the punchline.", "grandad", "cheer"),
    beat("hero_b", "Can you help us find everyone else?", "Hopeful.", "hero_b"),
    beat("grandad", "Just call. I'll bring the tools.", "A reassuring promise.", "grandad", "nod"),
  ]),
  story("c02-arrival", 2, "Even the bubbles need a bath", "intro", "Enter the Filthy Forest before Nana is rescued.", "Drift over the brook and slime. The hero inspects the mess; Nana waves from the far bank.", [
    beat("narrator", "The forest used to sparkle.", "A wistful beginning.", "wide"),
    beat("hero_b", "Even the bubbles need a bath!", "Gently disgusted, then amused.", "hero_b", "wonder"),
    beat("nana", "A little soap. A little kindness. We'll put it right.", "Calm and comforting.", "nana"),
    beat("hero_a", "Hold on, Nana. Grandad can fix the pumps!", "Eager, remembering the team's new ability.", "hero_a", "nod"),
  ]),
  story("c02-message", 2, "A little kindness", "message", "Recover the forest's family message.", "A warm glow settles on the leaves while Nana's message plays.", [
    beat("nana", "You don't have to be the biggest to make a difference.", "Intimate and encouraging.", "hero_b"),
    beat("hero_b", "Good. I'm quite good at being me.", "A small, confident smile.", "hero_b", "nod"),
  ]),
  story("c02-challenge", 2, "Trouble in the bubbles", "quest", "Complete the forest's rest-stone objective.", "Frame the shadow above the slippery brook, then give the hero room in the shot to prepare.", [
    beat("narrator", "The forest smells of flowers again. And possibly biscuits.", "Enjoy 'biscuits'.", "wide"),
    beat("nana", "Mind those bubbles, love. Keep your feet moving.", "A practical, gentle warning.", "boss"),
    beat("hero_a", "Dodge the bubbles. Wait for the shadow to rest.", "Concentrating.", "hero_a", "nod"),
    beat("hero_b", "Then a little pop clears the way!", "Light and playful.", "hero_b", "cheer"),
  ]),
  story("c02-rescue", 2, "Room for a biscuit", "rescue", "Defeat Ultimate Shadow Nana.", "Nana steps out of the broken cage. Let the forest glow and hold on the family reunion.", [
    beat("narrator", "The bubbles settle. Nana is free.", "Soft relief.", "wide"),
    beat("nana", "There we go. All clean!", "Satisfied, with a smile.", "nana", "bow"),
    beat("nana", "Who wants a biscuit?", "As if everyone is back in her kitchen.", "nana"),
    beat("hero_a", "Me! After we rescue everybody.", "Immediate excitement, then remember the mission.", "hero_a", "cheer"),
    beat("nana", "Call me when you need a little kindness.", "Warm promise.", "nana", "nod"),
  ]),
  story("c03-arrival", 3, "A very good reflection", "intro", "Enter the Palace of Perfection before Mummy is rescued.", "Sweep past mirror crystals. Reveal Mummy and her potion; the hero admires the palace for one beat.", [
    beat("narrator", "Every mirror has a story. This one has excellent hair.", "Storyteller, then a dry joke.", "wide"),
    beat("hero_a", "Mummy! Is that a rescue potion?", "Hopeful curiosity.", "hero_a"),
    beat("mummy", "Nearly, darling. It needs ingredients. And confidence.", "A grand little flourish on 'confidence'.", "mummy", "bow"),
    beat("hero_b", "Let's make something magnificent.", "Trying out Mummy's dramatic voice.", "hero_b", "cheer"),
  ]),
  story("c03-message", 3, "Perfectly yourself", "message", "Recover the palace's family message.", "The hero pauses beside a mirror; Mummy's voice makes the reflection feel friendly.", [
    beat("mummy", "You don't need to be perfect. You only need to be you.", "Drop the theatrical voice for genuine warmth.", "hero_a"),
    beat("hero_a", "Both versions of me!", "Bright realisation.", "hero_a", "cheer"),
  ]),
  story("c03-challenge", 3, "The pose-off", "quest", "Complete the palace's rest-stone objective.", "Reveal the Ultimate Shadow and its potion. Cut between the real Mummy and the hero.", [
    beat("narrator", "The recipe is ready. The hair is absolutely magnificent.", "A tiny pause before the second sentence.", "wide"),
    beat("mummy", "Three potion surprises. Keep moving until the shadow rests.", "Clear, helpful coaching.", "boss"),
    beat("hero_b", "What if I turn fabulous?", "A little worried, mostly intrigued.", "hero_b", "wonder"),
    beat("mummy", "Then strike a pose. And carry on!", "A confident laugh.", "mummy", "cheer"),
  ]),
  story("c03-rescue", 3, "The secret ingredient", "rescue", "Defeat Ultimate Shadow Mummy.", "The cage breaks into warm sparkles. Mummy gives a theatrical bow beside the hero.", [
    beat("narrator", "The spell breaks. Mummy is free.", "A happy reveal.", "wide"),
    beat("mummy", "The secret ingredient? Confidence.", "Give the question room to breathe.", "mummy", "bow"),
    beat("mummy", "And a truly enormous hat.", "Perfectly serious, which makes it funny.", "mummy", "cheer"),
    beat("hero_b", "Can your potion help our team?", "Excited curiosity.", "hero_b"),
    beat("mummy", "Darling, this team is going to be fabulous.", "Affectionate and triumphant.", "mummy", "nod"),
  ]),
  story("c04-arrival", 4, "Special delivery", "intro", "Enter the Fortress of Fury before Leah and Ayla are rescued.", "Glide over the soft-parcel fort. Reveal Leah with Ayla, then the hero giving the catapult a cautious look.", [
    beat("narrator", "Every fortress has a fearsome secret. This one wears a nappy.", "Pantomime suspense, then the punchline.", "wide"),
    beat("leah", "Over here! We've got a delivery problem.", "Calling cheerfully.", "leah"),
    beat("hero_a", "How big a problem?", "A cautious little question.", "hero_a", "wonder"),
    beat("leah", "One catapult. A mountain of laundry. Very little warning.", "Deadpan, then a smile.", "leah", "nod"),
  ]),
  story("c04-message", 4, "The smallest teammate", "message", "Recover the fortress's family message.", "A keepsake shines beside the soft parcels. Hear a tiny laugh in the quiet.", [
    beat("leah", "Even our smallest teammate has a very big part to play.", "Proud and affectionate.", "hero_b"),
    beat("ayla", "[Happy giggle]", "A short, comfortable giggle. Do not read the brackets.", "leah", "cheer"),
  ]),
  story("c04-challenge", 4, "Mind the splat", "quest", "Complete the fortress's rest-stone objective.", "Reveal the shadow's charge lane. The hero takes a comic step back as Leah offers advice.", [
    beat("narrator", "The catapult is loaded. Everybody has been politely warned.", "Mock-official announcement.", "wide"),
    beat("leah", "Watch for the charge. And the very silly splats.", "Practical advice, trying not to laugh.", "boss"),
    beat("hero_a", "Dodge first. Pop when it stops.", "A quick little rhyme to remember.", "hero_a", "nod"),
    beat("hero_b", "Rescue team ready!", "Upbeat determination.", "hero_b", "cheer"),
  ]),
  story("c04-rescue", 4, "The unstoppable duo", "rescue", "Defeat Ultimate Shadow Leah and Ayla.", "Open the cage. Leah and Ayla join the hero, followed by a harmless burst of colourful confetti.", [
    beat("narrator", "Leah and Ayla are free. The fortress can breathe again.", "Happy relief.", "wide"),
    beat("leah", "Ayla says thank you.", "Sweet and sincere.", "leah", "bow"),
    beat("ayla", "[Delighted giggle]", "A second little giggle; optional.", "leah", "cheer"),
    beat("leah", "Actually... that might be another nappy.", "Notice the problem halfway through.", "leah", "wonder"),
    beat("hero_b", "Definitely bringing you two on our team.", "Laughing, with affection.", "hero_b", "nod"),
  ]),
  story("c05-arrival", 5, "One player missing", "intro", "Enter the Stadium of Champions before Daddy is rescued.", "Sweep across the pitch and goal. Reveal Daddy, then the hero looking towards the match balls.", [
    beat("narrator", "The lights are on. The crowd is waiting. One player is missing.", "Match-day anticipation.", "wide"),
    beat("hero_b", "Daddy! We're here for the comeback.", "Calling with a grin.", "hero_b"),
    beat("daddy", "That's my team! Find the balls and warm up those feet.", "Encouraging coach.", "daddy", "cheer"),
    beat("hero_a", "Fast feet? That's my department.", "Playful confidence.", "hero_a", "nod"),
  ]),
  story("c05-message", 5, "The perfect pass", "message", "Recover the stadium's family message.", "A match ball glints as Daddy's message reminds the hero what matters.", [
    beat("daddy", "The best player is the one who helps the whole team.", "Sincere encouragement.", "hero_b"),
    beat("hero_b", "Then let's get our whole team home.", "Steady determination.", "hero_b", "nod"),
  ]),
  story("c05-challenge", 5, "Extra time", "quest", "Complete the stadium's rest-stone objective.", "Frame the shadow with the goal behind it. The hero watches the line of the coming shot.", [
    beat("narrator", "The stadium is ready. The crowd goes completely bananas.", "A little sports-commentator energy.", "wide"),
    beat("daddy", "Watch the bouncing balls. Step out of the power shot.", "Clear coach's instructions.", "boss"),
    beat("hero_a", "Then strike when the shadow takes a breather.", "Repeating the plan.", "hero_a", "nod"),
    beat("daddy", "Lovely thinking. Now bring it home!", "Proud encouragement.", "daddy", "cheer"),
  ]),
  story("c05-rescue", 5, "The greatest comeback", "rescue", "Defeat Ultimate Shadow Daddy.", "Daddy steps out of the cage. Frame the reunion, then pull wide for the fully reunited team milestone.", [
    beat("narrator", "The final whistle blows. Daddy is free.", "A triumphant sports-story finish.", "wide"),
    beat("daddy", "Goooal! Who's ready for extra time?", "Joyful, without clipping the microphone.", "daddy", "cheer"),
    beat("hero_b", "That's everyone!", "Relief and excitement.", "hero_b", "cheer"),
    beat("daddy", "One more challenge. This time, we go together.", "Calm confidence.", "daddy", "nod"),
    beat("hero_a", "Best team ever.", "Quiet, happy pride.", "hero_a", "nod"),
  ]),
  story("c06-arrival", 6, "The ultimate alliance", "intro", "Enter the finale with all five allies rescued.", "Reveal the family assembled around the star machine. Introduce the Big Boss at the far end, with the hero in the foreground.", [
    beat("narrator", "Five legends, together again. One last shadow in the way.", "A grand but friendly finale.", "wide"),
    beat("bigboss", "You brought the whole family?", "Comically taken aback.", "bigboss", "wonder"),
    beat("hero_a", "Of course we did.", "Simple confidence.", "hero_a", "nod"),
    beat("grandad", "Tools ready.", "Businesslike.", "grandad", "nod"),
    beat("nana", "Kindness ready.", "A warm smile.", "nana", "nod"),
    beat("hero_b", "Team ready. Let's do this together.", "Confident, including everyone.", "hero_b", "cheer"),
  ]),
  story("c06-challenge", 6, "Everybody has a part", "quest", "Reach the final arena before its first attack.", "Cut along the assembled allies and finish on the hero facing the Big Boss. The real battle starts after this scene.", [
    beat("bigboss", "Not so fast, little hero!", "Silly pantomime challenge.", "bigboss", "bow"),
    beat("mummy", "We'll each do our bit. You do yours.", "Steady encouragement.", "mummy", "nod"),
    beat("daddy", "Repair, kindness, glamour, delivery... then the perfect shot.", "A clear, rhythmic team plan.", "daddy"),
    beat("hero_a", "And two forms for the finish!", "Ready for the final move.", "hero_a", "cheer"),
  ]),
  story("c06-home", 6, "Everybody came home", "ending", "Finish the final dash and Form B power pop.", "The final shadow disappears. Reunite the family in a semicircle, reveal each speaker, then pull wide for the studio sign-off.", [
    beat("hero_b", "And one big pop!", "Joyful release after the winning move.", "hero_b", "cheer"),
    beat("bigboss", "Oh. That's rather a lot of teamwork.", "Good-natured defeat, slightly breathless.", "bigboss", "bow"),
    beat("narrator", "A kingdom repaired. A forest clean. Several exceptionally glamorous puppets.", "Warm, with room for each memory.", "wide"),
    beat("grandad", "And only two screws left over!", "A proud little joke.", "grandad", "cheer"),
    beat("leah", "Has anybody checked the catapult?", "An innocent question with comic timing.", "leah", "wonder"),
    beat("ayla", "[Happy little laugh]", "One relaxed laugh, or leave this cue silent.", "leah", "cheer"),
    beat("nana", "Come on, everyone. Biscuits are waiting.", "Home is safe and welcoming.", "nana", "nod"),
    beat("hero_b", "We did it. Together.", "Let the relief and pride show.", "hero_b", "nod"),
    beat("narrator", "The best part of the adventure? Everybody came home.", "A warm ending, not a trailer voice.", "wide"),
    beat("hero_a", "A Tony Baloney Studios adventure!", "Playful studio announcement.", "hero_a", "cheer"),
    beat("hero_b", "Made by our family. For our family.", "A smile in the voice.", "wide", "cheer"),
  ]),
];

// Return visits celebrate the rescue instead of claiming the family is trapped again.
for (const [level, owner, title, line, reply] of [
  [1, "grandad", "Still ticking", "Grandad's kingdom is humming again.", "Good as new. Well, nearly!"],
  [2, "nana", "A breath of fresh air", "Nana's forest has its sparkle back.", "Lovely to see you, love."],
  [3, "mummy", "Looking fabulous", "The palace is bright, and its puppets are very pleased with their hair.", "Always room for another fabulous visit."],
  [4, "leah", "Delivery complete", "The fortress is peaceful. Relatively speaking.", "The catapult's off duty. Mostly."],
  [5, "daddy", "A friendly kickabout", "The stadium is ready for a friendly game.", "There's always a place for you on this team."],
]) CINEMATICS.push(story(`c0${level}-return`, level, title, "return", "Revisit this world after its family rescue.", "A peaceful wide shot, then the rescued ally welcoming the hero back.", [
  beat("narrator", line, "Warm satisfaction.", "wide"),
  beat(owner, reply, "A relaxed welcome.", owner, "nod"),
]));

// Keep every live mission transition in the recording pack, as well as the main
// arrival / rescue scenes. Existing cue IDs stay stable when new missions arrive.
const missionReplies = {
  1: ["The relays! One, two, three. Let's wake that bridge.", "Grandad's tools need a lift. Let's guide the trolley.", "Hear that clang? The Ultimate Shadow's close."],
  2: ["The flower valves! Let's open the stream.", "Stay close to that little light. It'll lead us to Nana.", "We're at the heart-tree. Let's follow those silver threads."],
  3: ["The lab is open. Let's find the glowing ingredients.", "Those guards look confused. Nana can help.", "The guards are friends. Time to reach Mummy."],
  4: ["A catapult! That's one way over a wall.", "Everybody still here? Let's clear those pillow patrols.", "One squishy door. One power pop!", "The throne room's open. We're coming, Leah!"],
  5: ["Now for hoops. Time for a big leap.", "The sprint gates are open. Quick feet ready!", "The shadow team wants extra time. Let's finish this.", "One more shadow. One more rescue."],
};
for (let level = 1; level <= 5; level++) {
  const missions = adventureFor(level);
  CINEMATICS.find((s) => s.id === `c0${level}-challenge`).trigger = `Complete “${missions.at(-1).title}” at the shadow arena entrance.`;
  missions.slice(0, -1).forEach((mission, index) => {
    const step = index + 1;
    const trigger = `Complete “${mission.title}” in chapter ${level}.`;
    const beats = [
      beat("narrator", mission.beat || "The way ahead is opening.", "Celebrate the result; give the visual reveal a moment.", "wide"),
      beat(index % 2 ? "hero_b" : "hero_a", missionReplies[level][index], "A clear, excited plan for the next part.", index % 2 ? "hero_b" : "hero_a", "nod"),
    ];
    if (step === 2) {
      const message = CINEMATICS.find((s) => s.id === `c0${level}-message`);
      message.trigger = trigger;
      message.staging = "Pause at the completed mission for a remembered family message, then reveal the way ahead.";
      message.step = step;
      message.beats.push(...beats.map((b, i) => ({ ...b, id: `${message.id}-${String(i + 3).padStart(2, "0")}` })));
    } else {
      const scene = story(`c0${level}-mission-${String(step).padStart(2, "0")}`, level, mission.title, "event", trigger,
        "Hold on the completed mission's location, then frame the hero planning the next step.", beats);
      scene.step = step;
      CINEMATICS.push(scene);
    }
  });
}
const storyOrder = (s) => s.kind === "intro" ? 0 : s.step ? s.step * 10 : ({ quest: 100, rescue: 110, ending: 120, return: 130 }[s.kind] || 90);
CINEMATICS.sort((a, b) => a.level - b.level || storyOrder(a) - storyOrder(b));

const bark = (id, speaker, text, delivery, trigger) => ({ id, speaker, text, delivery, trigger, kind: "gameplay" });
export const SOUNDBITES = [
  ...["a", "b"].flatMap((form) => [
    bark(`v-hero-${form}-jump`, `hero_${form}`, form === "a" ? "Hup!" : "Up we go!", "A small, light effort.", "Occasional jump; shared speech cooldown."),
    bark(`v-hero-${form}-switch`, `hero_${form}`, form === "a" ? "Quick feet ready!" : "Big leap ready!", "A cheerful transformation.", `Switch into Form ${form.toUpperCase()}.`),
    bark(`v-hero-${form}-power`, `hero_${form}`, form === "a" ? "Whoosh!" : "Power pop!", "Playful effort, not a scream.", `Successful Form ${form.toUpperCase()} ability.`),
    bark(`v-hero-${form}-hurt`, `hero_${form}`, "Oof! I'm okay.", "Brief surprise, immediately reassuring.", "Take damage; occasional, never layered over story dialogue."),
    bark(`v-hero-${form}-star`, `hero_${form}`, form === "a" ? "A little sparkle!" : "Found one!", "A small discovery.", "Collect a star; shared cooldown limits repetition."),
    bark(`v-hero-${form}-checkpoint`, `hero_${form}`, "A little rest. Then we keep going.", "A relieved breath.", "Reach a rest stone."),
    bark(`v-hero-${form}-retry`, `hero_${form}`, "Nearly! Let's try that again.", "Encouraging, no shame or frustration.", "Defeat screen."),
  ]),
  bark("v-grandad-summon", "grandad", "Leave this bit to me!", "Capable and cheery.", "Summon Grandad outside his final contribution."),
  bark("v-nana-summon", "nana", "A little kindness coming through.", "Gentle confidence.", "Summon Nana outside her final contribution."),
  bark("v-mummy-summon", "mummy", "Time for something fabulous!", "A theatrical flourish.", "Summon Mummy outside her final contribution."),
  bark("v-leah-summon", "leah", "Special delivery!", "A cheerful warning.", "Summon Leah and Ayla outside their final contribution."),
  bark("v-daddy-summon", "daddy", "I've got the pass!", "A helpful teammate.", "Summon Daddy outside his final contribution."),
  bark("v-final-grandad", "grandad", "Good as new. Your turn, Nana!", "Satisfied handoff.", "Grandad repairs the final star machine."),
  bark("v-final-nana", "nana", "Much friendlier. Over to you, Mummy.", "Warm handoff.", "Nana befriends the final guards."),
  bark("v-final-mummy", "mummy", "Fabulous! Leah, clear us a path.", "Bright and decisive.", "Mummy makes the final guards pose."),
  bark("v-final-leah", "leah", "Mind the splat! Daddy, you're up.", "Laughing through the handoff.", "Leah and Ayla clear the final barricade."),
  bark("v-final-daddy", "daddy", "Perfect pass. This one's yours, hero!", "Proud coach handing over the finish.", "Daddy hits the final target."),
  bark("v-final-dash", "hero_a", "One quick dash...", "Concentrated effort.", "Land the first part of the final combination."),
];

export const CINEMATIC_BY_ID = Object.fromEntries(CINEMATICS.map((s) => [s.id, s]));
export const ALL_VOICE_CUES = [
  ...CINEMATICS.flatMap((s) => s.beats.map((b) => ({ ...b, scene: s.id, sceneTitle: s.title, level: s.level, kind: s.kind, trigger: s.trigger }))),
  ...SOUNDBITES,
];
export const CUE_BY_ID = Object.fromEntries(ALL_VOICE_CUES.map((b) => [b.id, b]));
export const voiceFilename = (id) => `${id}.wav`;
export function cinematicFor(level, kind, step = 0) {
  if (kind === "event") return CINEMATIC_BY_ID[step === 2 ? `c0${level}-message` : `c0${level}-mission-${String(step).padStart(2, "0")}`];
  if (level === 0) return CINEMATIC_BY_ID[kind === "intro" ? "c00-awakening" : "c00-departure"];
  if (level === 6) return CINEMATIC_BY_ID[kind === "ending" ? "c06-home" : kind === "quest" ? "c06-challenge" : "c06-arrival"];
  const suffix = { intro: "arrival", quest: "challenge", rescue: "rescue", message: "message", return: "return" }[kind];
  return CINEMATIC_BY_ID[`c0${level}-${suffix}`];
}
