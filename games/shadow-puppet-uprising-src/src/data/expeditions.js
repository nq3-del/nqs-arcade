// Each world has its own route, architecture and dramatic purpose.
export const EXPEDITIONS = {
  1: {
    start: [-24, 12],
    checkpoint: [-2, 2],
    boss: [22, -10],
    exit: [25, -12],
    bounds: [30, 19],
    regions: [
      [-21, 9, "The silent docks"],
      [-3, 0, "Clockwork avenue"],
      [19, -10, "The great foundry"],
    ],
  },
  2: {
    start: [-25, 9],
    checkpoint: [-3, 0],
    boss: [22, -10],
    exit: [26, -12],
    bounds: [34, 22],
    regions: [
      [-22, 7, "The muddled marsh"],
      [-2, -1, "The sleeping grove"],
      [20, -10, "The ancient heart-tree"],
    ],
  },
  3: {
    start: [-24, 12],
    checkpoint: [0, 0],
    boss: [22, -10],
    exit: [26, -12],
    bounds: [30, 19],
    regions: [
      [-20, 10, "The looking-glass hall"],
      [-3, -6, "The impossible laboratory"],
      [20, -10, "The grand dressing room"],
    ],
  },
  4: {
    start: [-25, 13],
    checkpoint: [-2, 0],
    boss: [22, -11],
    exit: [26, -13],
    bounds: [31, 20],
    regions: [
      [-22, 11, "The pillow barricade"],
      [0, -1, "Catapult courtyard"],
      [20, -10, "The tiny throne"],
    ],
  },
  5: {
    start: [-25, 12],
    checkpoint: [0, 0],
    boss: [22, -10],
    exit: [26, -12],
    bounds: [32, 21],
    regions: [
      [-20, 8, "The practice courts"],
      [0, 0, "Champions pitch"],
      [21, -10, "The final whistle"],
    ],
  },
  6: {
    start: [-24, 10],
    checkpoint: [-7, 1],
    boss: [16, -9],
    exit: [25, -12],
    bounds: [31, 20],
    regions: [
      [-20, 8, "The last bridge"],
      [-1, -1, "The five-point alliance"],
      [16, -9, "The puppet stage"],
    ],
  },
};

export const STORY_BEATS = {
  1: [
    "The clocks have stopped. A tiny shadow is trying to fix them with a spoon.",
    "Grandad: “That is a very good spoon. It is a very bad spanner.”",
    "The puppet drops a silver thread and scurries into the foundry. Follow it.",
  ],
  2: [
    "Every tree is holding its breath beneath a coat of magical bubbles.",
    "Nana: “Nobody is too messy for a little kindness. Especially that one.”",
    "A trail of silver thread disappears into the oldest tree. The forest needs your help first.",
  ],
  3: [
    "The palace mirrors are showing the wrong reflections. One has an enormous moustache.",
    "Mummy: “A makeover is lovely. Borrowing somebody’s whole face is a bit much.”",
    "The mirrors hide a route to the tower. Find the real reflection and follow the thread.",
  ],
  4: [
    "A catapult creaks. A tiny giggle follows. Everybody looks up.",
    "Leah: “Ayla! Was that the clean pile or the other pile?”",
    "The shadow duo retreat to the throne room. This rescue needs a spectacular entrance.",
  ],
  5: [
    "The scoreboard flashes. A football ricochets into a basketball hoop.",
    "Daddy: “I am counting that. Nobody said which net.”",
    "The last silver thread is caught in the stadium lights. Win your way onto the champions pitch.",
  ],
  6: [
    "Five silver threads meet at one enormous puppet stage.",
    "Grandad: “We can fix this.” Nana: “Together.” Mummy: “And look fabulous doing it.”",
    "Leah: “Ayla has a plan.” Daddy: “Then let’s bring it home.”",
  ],
};
