export const PACING = {
  targetMinutes: 30,
  origin: 3,
  rescueWorld: 4.5,
  finale: 4.5,
};
const end = (x, z, line) => ({
  kind: "finish",
  title: "Face the Ultimate Shadow",
  hint: "Follow the silver thread. E / LT at the entrance.",
  points: [[x, z]],
  line,
});
const MISSIONS = {
  1: [
    {
      kind: "power",
      title: "Unjam the foundry",
      hint: "The pistons are stuck. Form B + K / B can knock them free.",
      points: [
        [-19, 5],
        [-10, 1],
      ],
      beat: "One engine coughs. Then another. The whole street begins to tick again.",
    },
    {
      kind: "sequence",
      title: "Wake the clockwork bridge",
      hint: "E / LT at relay ONE, then TWO, then THREE. Follow the numbered lights.",
      points: [
        [-6, 5],
        [0, 0],
        [6, -3],
      ],
      beat: "The bridge wakes up, shakes off the dust, and drops one very surprised shadow.",
    },
    {
      kind: "escort",
      title: "The runaway tool trolley",
      hint: "Stay near the trolley to guide it. Clear puppets with J / X.",
      points: [
        [-1, 2],
        [6, 0],
        [14, -5],
        [19, -8],
      ],
      waves: 2,
      item: "cart",
      beat: "Grandad’s tools reach the foundry. Something inside answers with a tremendous CLANG.",
    },
    end(18, -7, "Grandad: “That sounds expensive. Better let me have a look.”"),
  ],
  2: [
    {
      kind: "ally",
      ally: "grandad",
      title: "Mend the woodland pumps",
      hint: "Choose Grandad (Tab / LB). Stand beside each pump and call him with L / RB.",
      points: [
        [-18, 5],
        [-10, 2],
      ],
      beat: "Fresh water begins to flow. The sleeping grove starts to wake.",
    },
    {
      kind: "valve",
      title: "Bring back the stream",
      hint: "Turn three flower valves with E / LT. Each opens a piece of forest.",
      points: [
        [-3, 4],
        [3, -2],
        [8, -5],
      ],
      beat: "A river returns. A large bubble floats away with a puppet still inside it.",
    },
    {
      kind: "escort",
      title: "Guide the lost woodland light",
      hint: "Stay close to the little light. Protect it as it leads you to Nana.",
      points: [
        [8, -3],
        [14, -5],
        [20, -9],
      ],
      waves: 2,
      item: "light",
      beat: "The light settles in the ancient tree. Silver threads unravel around its roots.",
    },
    end(
      19,
      -7,
      "Nana: “There you are, love. Now let’s tidy up this last little mess.”",
    ),
  ],
  3: [
    {
      kind: "mirror",
      title: "The wrong reflections",
      hint: "E / LT rotates a mirror. Turn each golden beam towards its matching light.",
      points: [
        [-18, 1],
        [-8, -3],
        [2, -6],
      ],
      turns: [2, 1, 3],
      beat: "The mirrors agree at last. A hidden laboratory door shimmers into view.",
    },
    {
      kind: "collect",
      title: "A recipe for confidence",
      hint: "Find three glowing ingredients. E / LT collects each one.",
      points: [
        [-12, 10],
        [3, 9],
        [10, -9],
      ],
      item: "potion",
      beat: "One drop of courage. Two drops of sparkle. Absolutely no frog slime.",
    },
    {
      kind: "ally",
      ally: "nana",
      title: "The guards need a little kindness",
      hint: "Choose Nana. L / RB beside each confused guard turns them into a friend.",
      points: [
        [9, 0],
        [14, -7],
      ],
      beat: "The guards step aside. One asks whether the potion works on hats.",
    },
    end(
      18,
      -8,
      "Mummy: “You look wonderful already. Let’s get you out of those shadows.”",
    ),
  ],
  4: [
    {
      kind: "ally",
      ally: "mummy",
      title: "A glamorous distraction",
      hint: "Choose Mummy. L / RB beside each guard makes them stop to pose.",
      points: [
        [-19, 7],
        [-11, 2],
      ],
      beat: "The guards begin a dramatic fashion show. Nobody guards the catapult.",
    },
    {
      kind: "catapult",
      title: "The spectacular entrance",
      hint: "E / LT beside the catapult. Hold on to your eyebrows!",
      points: [[-8, 2]],
      destination: [9, 0],
      beat: "Over the wall. Over the laundry. Right into the middle of the trouble.",
    },
    {
      kind: "encounter",
      title: "The pillow patrol",
      hint: "Clear two charging patrols. Watch their warning circles before attacking.",
      points: [
        [12, -3],
        [19, -9],
      ],
      waves: 2,
      beat: "The last pillow lands. A tiny giggle comes from the throne room.",
    },
    {
      kind: "power",
      title: "One very squishy door",
      hint: "Form B + K / B pops the barricade in front of the throne.",
      points: [[16, -7]],
      beat: "The door bursts into ribbons. Ayla applauds. Leah looks extremely proud.",
    },
    end(19, -8, "Leah: “Right. Nobody shadows my baby. Especially my shadow.”"),
  ],
  5: [
    {
      kind: "sport",
      title: "The impossible warm-up",
      hint: "J / X beside a football sends it towards the glowing goal. Score three!",
      points: [
        [-23, 7],
        [-13, -3],
        [1, 2],
      ],
      goals: [
        [-21, 3],
        [-6, -4],
        [7, 0],
      ],
      beat: "Three goals. One enormous cheer. The shadow team finally notices you.",
    },
    {
      kind: "hoops",
      title: "Nothing but net",
      hint: "Form B + SPACE / A beside each hoop. A high jump makes the basket.",
      points: [
        [-23, 6],
        [-14, 6],
      ],
      beat: "The scoreboard cannot decide which sport this is. Daddy is delighted.",
    },
    {
      kind: "dash",
      title: "Race down the wing",
      hint: "Form A + K / B through three sprint gates. Keep moving!",
      points: [
        [9, 6],
        [16, 4],
        [19, -1],
      ],
      beat: "The crowd rises. Your run opens the champions pitch.",
    },
    {
      kind: "encounter",
      title: "Extra time",
      hint: "The shadow athletes want a rematch. Clear their last two formations.",
      points: [
        [13, -5],
        [19, -9],
      ],
      waves: 2,
      beat: "The whistle blows. One player remains between you and the last rescue.",
    },
    end(
      19,
      -7,
      "Daddy: “No pressure. Just the most important match in the universe.”",
    ),
  ],
};
export function adventureFor(level) {
  return MISSIONS[level] || [];
}
