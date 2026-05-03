// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
var W = 480, H = 640;
var CEIL = 30, FLOOR = H - 80;
var GRAVITY = 0.32, JUMP_VEL = -6.2;
var PR = 20; // player radius
var PW = 62, PSPAWN = 90;
var INF_WIN = 20;

// 7 Chaos Emeralds: colours and sky/ground theme per level
var EM = [
  { name:'Red',    c:'#e02020', hi:'#ff8888', sh:'#880000', sky1:'#5599ff', sky2:'#aaccff', gnd1:'#22aa22', gnd2:'#115511' },
  { name:'Blue',   c:'#2255ee', hi:'#88aaff', sh:'#001188', sky1:'#00aabb', sky2:'#88ddee', gnd1:'#ddaa22', gnd2:'#886611' },
  { name:'Yellow', c:'#f5c518', hi:'#ffe87a', sh:'#997700', sky1:'#ff7722', sky2:'#ffbb44', gnd1:'#cc6600', gnd2:'#882200' },
  { name:'Purple', c:'#9922dd', hi:'#cc88ff', sh:'#440088', sky1:'#110044', sky2:'#330077', gnd1:'#440033', gnd2:'#220011' },
  { name:'Green',  c:'#22bb44', hi:'#88ffaa', sh:'#005522', sky1:'#003322', sky2:'#115544', gnd1:'#224400', gnd2:'#112200' },
  { name:'Cyan',   c:'#00ccee', hi:'#88eeff', sh:'#005588', sky1:'#88ccff', sky2:'#cceeee', gnd1:'#336688', gnd2:'#112244' },
  { name:'Silver', c:'#aabbcc', hi:'#eef0ff', sh:'#556677', sky1:'#112233', sky2:'#223344', gnd1:'#223344', gnd2:'#111122' }
];

// Pipes needed to clear each level, pipe speed, gap size
var LV = [
  { need:5,  spd:1.8, gap:175 },
  { need:7,  spd:2.1, gap:165 },
  { need:8,  spd:2.4, gap:155 },
  { need:9,  spd:2.7, gap:148 },
  { need:10, spd:3.0, gap:140 },
  { need:11, spd:3.4, gap:133 },
  { need:12, spd:3.8, gap:126 }
];

// Shadow level difficulty (harder than main campaign, same EM themes)
var SHADOW_LV = [
  { need:7,  spd:2.2, gap:165 },
  { need:9,  spd:2.5, gap:155 },
  { need:10, spd:2.8, gap:145 },
  { need:11, spd:3.1, gap:138 },
  { need:12, spd:3.4, gap:130 },
  { need:13, spd:3.8, gap:123 },
  { need:14, spd:4.2, gap:115 }
];

// Hyper Emerald level
var HYPER_LV = { need:300, spd:3.0, gap:140 };
var HYPER_THEME = { sky1:'#0a0020', sky2:'#150040', gnd1:'#200040', gnd2:'#100020' };

// Hit rectangles
var GEAR_BTN = { x: W - 52, y: 8, w: 44, h: 44 };

// Pause menu — 2 rows of 3
var PAUSE_BTNS = {
  switchChar:    { x: 15,  y: 268, w: 140, h: 44 },
  freePlay:      { x: 170, y: 268, w: 140, h: 44 },
  skipLevel:     { x: 325, y: 268, w: 140, h: 44 },
  hyperEmerald:  { x: 15,  y: 322, w: 140, h: 44 },
  shadowRevival: { x: 170, y: 322, w: 140, h: 44 },
  cont:          { x: 325, y: 322, w: 140, h: 44 }
};

// Admin + Character Codes buttons in pause menu
var PAUSE_ADMIN = { x: 15, y: 378, w: 450, h: 44 };
var PAUSE_CODES = { x: 15, y: 432, w: 450, h: 44 };
var PAUSE_SAVE  = { x: 15, y: 486, w: 450, h: 44 };

// Save/load screen buttons
var SAVE_BTN   = { x: 90,  y: 250, w: 300, h: 60 };
var LOAD_BTN   = { x: 90,  y: 325, w: 300, h: 60 };
var DELETE_BTN = { x: 90,  y: 400, w: 300, h: 60 };
var SAVE_BACK  = { x: W/2 - 60, y: 540, w: 120, h: 40 };

// Confirmation buttons
var SAVE_YES = { x: 50,  y: 400, w: 170, h: 60 };
var SAVE_NO  = { x: 260, y: 400, w: 170, h: 60 };

// Knuckles charge ability
var KNUCKLES_CHARGE_DUR = 300;   // 5 seconds at 60fps
var KNUCKLES_COOLDOWN_DUR = 900; // 15 seconds at 60fps

var BTN_L     = { x: 35,       y: 298, w: 178, h: 148 };
var BTN_R     = { x: 267,      y: 298, w: 178, h: 148 };
var RETRY_BTN = { x: W/2 - 75, y: 0,   w: 150, h: 50  };
