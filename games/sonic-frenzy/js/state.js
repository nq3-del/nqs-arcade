// ═══════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════
// States: menu | playing | dead | cutscene | select | fpselect | infinity | win
//         shadowSelect | hyperSelect | hyperCutscene
var S = 'menu';
var lv = 0;       // current level 0-6
var passed = 0;   // pipes cleared this level
var mode = 'em';  // em | sonic | super | shadow | superShadow | hyperSonic | hyperShadow | hyperEm
var frame = 0;

// Player
var P = { x:100, y:H/2, vy:0, rot:0 };

// Pipes
var pipes = [], pTick = 0;

// Particles
var parts = [];

// Cutscene
var csT = 0, sonicX = -80, sonicLeg = 0;
var wasInfinity = false; // track if we were in infinity before death

// Final select hover
var hoverBtn = null;

// Infinity level
var infScore = 0;

// Menu
var menuAngle = 0;

// Pause / Settings
var paused = false;
var hasBeatenGame = false;
var allEmeralds = false;

// Free play / best score tracking
var freePlay = false;
var freePlayScore = 0;
var bestScore = 0;
var bestSuperScore = 0;
var isNewBest = false;
var isNewSuperBest = false;

// Free play character select
var fpHover = -1;
var fpChoice = 0;
var FP_CARDS = [];
var fpForInfinity = false; // true = character grid starts infinity, false = free play

// Select screen (infinity character select)
var SELECT_CARDS = [];
var selHover = -1;
var HYPER_SEL_CARDS = [];

// ── Shadow's Revival ──
var shadowCampaign = false;   // are we in the Shadow campaign?
var shadowLv = 0;             // current shadow level (0-6)
var shadowPassed = 0;         // pipes cleared in current shadow level
var shadowAllEmeralds = false;// collected all 7 in shadow campaign
var shadowBeaten = false;     // completed Shadow's Revival fully (infinity won)

// ── Hyper Emerald ──
var hyperChallenge = false;   // are we in the Hyper Emerald level?
var hyperPassed = 0;          // pipes cleared in hyper level
var hyperBeaten = false;      // completed Hyper Emerald
var hyperChar = 'sonic';      // character chosen for hyper level ('sonic' or 'shadow')

// ── Admin ──
var adminState = 'none'; // none | password | console
var adminInput = '';
var adminLog = [];
var ADMIN_CODE = '2188';
var adminChars = {};      // individual character unlocks for free play/select
var hyperAllowed = {};    // extra characters allowed in hyper emerald level

function isCharAvail(m) {
  if (adminChars[m]) return true;
  if (m === 'super') return allEmeralds;
  if (m === 'shadow' || m === 'superShadow') return shadowBeaten;
  if (m === 'silver' || m === 'superSilver') return hyperBeaten;
  if (m && m.indexOf('em') === 0 && m.length === 3) return allEmeralds;
  if (m === 'knuckles' || m === 'superKnuckles') return !!unlockedCodes['56201'];
  if (m === 'hyperKnuckles') return !!unlockedCodes['56201'] && hyperBeaten;
  if (m === 'hyperSonic' || m === 'hyperShadow' || m === 'hyperSilver' || m === 'hyperEm') return hyperBeaten;
  return true;
}

// ── Character Codes ──
var codesState = 'none'; // none | entering
var codesInput = '';
var codesLog = '';
var CHAR_CODES = {
  '56201': { name:'Knuckles Pack', chars:['knuckles','superKnuckles','hyperKnuckles'], msg:'Knuckles, Super Knuckles & Hyper Knuckles unlocked!' }
};
var unlockedCodes = {};
var revealedCodes = {}; // codes the user has discovered (shown in reveal screen)
var codeRevealState = 'none'; // none | showing
var codeRevealCode = '';
var codeRevealName = '';

// ── Save / Load ──
var saveState = 'none'; // none | menu | confirmOverwrite
var saveMessage = '';

function hasSaveFile() {
  try { return !!localStorage.getItem('sonicFrenzySave'); } catch(e) { return false; }
}

function deleteSaveFile() {
  try {
    localStorage.removeItem('sonicFrenzySave');
    // Also wipe current in-memory progress
    allEmeralds = false; hasBeatenGame = false;
    shadowAllEmeralds = false; shadowBeaten = false;
    hyperBeaten = false;
    adminChars = {}; hyperAllowed = {};
    unlockedCodes = {}; revealedCodes = {};
    bestScore = 0; bestSuperScore = 0;
    saveMessage = 'Save file deleted!';
    return true;
  } catch(e) {
    saveMessage = 'Delete failed.';
    return false;
  }
}

function saveProgress() {
  try {
    var data = {
      allEmeralds: allEmeralds,
      hasBeatenGame: hasBeatenGame,
      shadowBeaten: shadowBeaten,
      shadowAllEmeralds: shadowAllEmeralds,
      hyperBeaten: hyperBeaten,
      adminChars: adminChars,
      hyperAllowed: hyperAllowed,
      unlockedCodes: unlockedCodes,
      revealedCodes: revealedCodes,
      bestScore: bestScore,
      bestSuperScore: bestSuperScore
    };
    localStorage.setItem('sonicFrenzySave', JSON.stringify(data));
    saveMessage = 'Saved!';
    return true;
  } catch(e) {
    saveMessage = 'Save failed.';
    return false;
  }
}

function loadProgress() {
  try {
    var raw = localStorage.getItem('sonicFrenzySave');
    if (!raw) { saveMessage = 'No save file found.'; return false; }
    var data = JSON.parse(raw);
    allEmeralds = data.allEmeralds || false;
    hasBeatenGame = data.hasBeatenGame || false;
    shadowBeaten = data.shadowBeaten || false;
    shadowAllEmeralds = data.shadowAllEmeralds || false;
    hyperBeaten = data.hyperBeaten || false;
    adminChars = data.adminChars || {};
    hyperAllowed = data.hyperAllowed || {};
    unlockedCodes = data.unlockedCodes || {};
    revealedCodes = data.revealedCodes || {};
    bestScore = data.bestScore || 0;
    bestSuperScore = data.bestSuperScore || 0;
    saveMessage = 'Loaded!';
    return true;
  } catch(e) {
    saveMessage = 'Load failed.';
    return false;
  }
}

// ── Knuckles Charge Ability ──
var knucklesCharging = false;     // currently dashing
var knucklesChargeTimer = 0;      // dash time remaining
var knucklesCooldown = 0;         // time until next charge stored
var knucklesCharges = 0;          // stored charges available
var knucklesCarryCharges = 0;     // charges to carry over after death
var knucklesChargeY = 0;          // Y position locked during charge

function checkCodeReveal() {
  if (!freePlay || revealedCodes['56201']) return;
  if (freePlayScore < 50) return;
  if (mode === 'super' || mode === 'superShadow' || mode === 'superSilver' || mode === 'superKnuckles') return;
  if (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles' || mode === 'hyperEm') return;
  revealedCodes['56201'] = true;
  codeRevealCode = '56201';
  codeRevealName = 'Knuckles Pack';
  codeRevealState = 'showing';
}

function isKnucklesMode(m) {
  return m === 'knuckles' || m === 'superKnuckles' || m === 'hyperKnuckles';
}

function canCharge() {
  return isKnucklesMode(mode) && !knucklesCharging && knucklesCharges > 0 && (S === 'playing' || S === 'infinity');
}

function startCharge() {
  if (!canCharge()) return;
  knucklesCharges--;
  knucklesCharging = true;
  knucklesChargeTimer = KNUCKLES_CHARGE_DUR;
  knucklesChargeY = P.y; // lock height
}

// ── Additional best scores ──
var bestShadowScore = 0;
var bestSuperShadowScore = 0;
var bestHyperSonicScore = 0;
var bestHyperShadowScore = 0;
var bestHyperEmScore = 0;

// ═══════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════
function initLevel(n) {
  lv = n; passed = 0; mode = 'em';
  P = { x:100, y:H/2, vy:0, rot:0 };
  pipes = []; pTick = 0; parts = [];
  S = 'playing'; frame = 0;
  knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
  knucklesCharges = 1 + knucklesCarryCharges; knucklesCarryCharges = 0;
}

function initShadowLevel(n) {
  shadowCampaign = true;
  if (n === 0) shadowAllEmeralds = false;
  shadowLv = n; shadowPassed = 0; lv = n; passed = 0;
  mode = 'shadow';
  P = { x:100, y:H/2, vy:0, rot:0 };
  pipes = []; pTick = 0; parts = [];
  S = 'playing'; frame = 0;
  knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
  knucklesCharges = 1 + knucklesCarryCharges; knucklesCarryCharges = 0;
}

function initHyperLevel(charChoice) {
  hyperChallenge = true;
  hyperChar = charChoice;
  hyperPassed = 0; passed = 0;
  // Handle emerald variants (em0..em6)
  if (charChoice && charChoice.indexOf('em') === 0 && charChoice.length === 3) {
    mode = 'em';
    lv = parseInt(charChoice.charAt(2), 10);
  } else {
    mode = charChoice;
    lv = 0;
  }
  P = { x:100, y:H/2, vy:0, rot:0 };
  pipes = []; pTick = 0; parts = [];
  S = 'playing'; frame = 0;
  knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
  knucklesCharges = 1 + knucklesCarryCharges;
  knucklesCarryCharges = 0;
}

function initFreePlay() {
  freePlay = true;
  S = 'fpselect'; frame = 0; fpHover = -1;
}

function retryFreePlay() {
  startFreePlay(fpChoice);
}

// FP character order matches drawFPSelect card push order:
// 0-6: emeralds, then rows of normals, supers, hypers
// Build a mode lookup matching the push order
function fpModeForIndex(i) {
  if (i >= 0 && i <= 6) return { m:'em', l:i };
  // After emeralds, cards are pushed in row order:
  // Row normal: sonic, [shadow], [silver]
  // Row super: super, [superShadow], [superSilver]
  // Row hyper: [hyperSonic, hyperShadow, hyperSilver, hyperEm]
  var idx = 7;
  var normals = ['sonic'];
  if (isCharAvail('shadow')) normals.push('shadow');
  if (isCharAvail('silver')) normals.push('silver');
  if (isCharAvail('knuckles')) normals.push('knuckles');
  for (var n = 0; n < normals.length; n++) { if (i === idx++) return { m:normals[n], l:0 }; }

  var supers = [];
  if (isCharAvail('super')) supers.push('super');
  if (isCharAvail('superShadow')) supers.push('superShadow');
  if (isCharAvail('superSilver')) supers.push('superSilver');
  if (isCharAvail('superKnuckles')) supers.push('superKnuckles');
  for (var s = 0; s < supers.length; s++) { if (i === idx++) return { m:supers[s], l:0 }; }

  var hypers = [];
  if (isCharAvail('hyperSonic')) hypers.push('hyperSonic');
  if (isCharAvail('hyperShadow')) hypers.push('hyperShadow');
  if (isCharAvail('hyperSilver')) hypers.push('hyperSilver');
  if (isCharAvail('hyperKnuckles')) hypers.push('hyperKnuckles');
  if (isCharAvail('hyperEm')) hypers.push('hyperEm');
  for (var h = 0; h < hypers.length; h++) { if (i === idx++) return { m:hypers[h], l:0 }; }
  return { m:'sonic', l:0 };
}

function startFreePlay(choice) {
  fpChoice = choice;
  freePlayScore = 0;
  isNewBest = false;
  isNewSuperBest = false;
  knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
  knucklesCharges = 1 + knucklesCarryCharges;
  knucklesCarryCharges = 0;
  var fp = fpModeForIndex(choice);
  mode = fp.m;
  lv = fp.l;
  P = { x:100, y:H/2, vy:0, rot:0 };
  pipes = []; pTick = 0; parts = [];
  S = 'playing'; frame = 0;
}

function initInfinity(m) {
  mode = m; infScore = 0;
  P = { x:100, y:H/2, vy:0, rot:0 };
  pipes = []; pTick = 0; parts = [];
  S = 'infinity'; frame = 0;
  if (m === 'super' || m === 'superShadow' || m === 'superSilver' || m === 'superKnuckles') sfx.transform();
  else if (m === 'hyperSonic' || m === 'hyperShadow' || m === 'hyperSilver' || m === 'hyperKnuckles' || m === 'hyperEm') sfx.hyperTransform();
  else sfx.clear();
  knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
  knucklesCharges = 1 + knucklesCarryCharges;
  knucklesCarryCharges = 0;
}

function resetGame() {
  S = 'menu'; lv = 0; mode = 'em';
  infScore = 0; menuAngle = 0; frame = 0;
  freePlay = false; parts = [];
  shadowCampaign = false; hyperChallenge = false;
  knucklesCarryCharges = 0;
}

function doJump() {
  resumeAC();
  if (paused) return;
  if (S === 'menu') { initLevel(0); return; }
  if (S === 'dead') {
    if (freePlay) {
      retryFreePlay(); return;
    }
    if (hyperChallenge) {
      initHyperLevel(hyperChar); return;
    }
    if (shadowCampaign && wasInfinity) {
      // Retry shadow infinity
      infScore = 0;
      P = { x:100, y:H/2, vy:0, rot:0 };
      pipes = []; pTick = 0;
      S = 'infinity'; frame = 0;
      knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
      knucklesCharges = 1 + knucklesCarryCharges; knucklesCarryCharges = 0;
      return;
    }
    if (shadowCampaign) {
      initShadowLevel(shadowLv); return;
    }
    if (wasInfinity) {
      // retry infinity (any character including emeralds)
      infScore = 0;
      P = { x:100, y:H/2, vy:0, rot:0 };
      pipes = []; pTick = 0;
      S = 'infinity'; frame = 0;
      knucklesCharging = false; knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
      knucklesCharges = 1 + knucklesCarryCharges; knucklesCarryCharges = 0;
    } else {
      initLevel(lv);
    }
    return;
  }
  if (S === 'cutscene' && csT > 155) { advanceLevel(); return; }
  if (S === 'hyperCutscene' && csT > 155) {
    hyperBeaten = true;
    hyperChallenge = false;
    S = 'select'; frame = 0;
    return;
  }
  if (S === 'win') {
    if (shadowCampaign) {
      shadowBeaten = true;
      shadowCampaign = false;
    }
    hasBeatenGame = true;
    resetGame();
    return;
  }
  if (S === 'playing' || S === 'infinity') { P.vy = JUMP_VEL; sfx.flap(); }
}

function advanceLevel() {
  if (shadowCampaign) {
    if (shadowLv >= 6) {
      shadowAllEmeralds = true;
      shadowBeaten = true;
      S = 'shadowSelect'; frame = 0;
    } else {
      initShadowLevel(shadowLv + 1);
    }
  } else {
    if (lv >= 6) { S = 'select'; frame = 0; allEmeralds = true; }
    else initLevel(lv + 1);
  }
}

// ── Admin command processor ──
function processAdminCommand(cmd) {
  var raw = cmd;
  cmd = cmd.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
  if (cmd === '') return;
  adminLog.push('> ' + raw);

  // ── Detect intent ──
  // Split into words for safe matching
  var ws = cmd.split(/\s+/);
  var hasWord = function(w) { for (var i=0;i<ws.length;i++) if(ws[i]===w) return true; return false; };
  var has = function(s) { return cmd.indexOf(s) !== -1; };

  // Is the user asking to remove/stop/disable something?
  var negative = hasWord('dont') || hasWord('stop') || hasWord('remove') ||
                 hasWord('disable') || hasWord('lock') || hasWord('block') ||
                 hasWord('no') || hasWord('off') || hasWord('disallow') ||
                 hasWord('take') || hasWord('without') || hasWord('cant');

  // Is the user asking to beat/complete something?
  var beating = hasWord('beat') || hasWord('complete') || hasWord('skip') ||
                hasWord('finish') || hasWord('clear') || hasWord('pass') || hasWord('win');

  // ── Show character codes ──
  if ((has('code') || has('codes')) && (has('show') || has('list') || has('what') || has('tell') || has('give'))) {
    adminLog.push('Character Codes:');
    var codeKeys = Object.keys(CHAR_CODES);
    for (var ci = 0; ci < codeKeys.length; ci++) {
      adminLog.push(codeKeys[ci] + ' - ' + CHAR_CODES[codeKeys[ci]].name);
    }
    return;
  }

  // ── Exit ──
  if (hasWord('exit') || hasWord('close') || hasWord('back') ||
      hasWord('leave') || hasWord('quit') || hasWord('bye')) {
    adminState = 'none'; adminInput = ''; paused = true; return;
  }

  // ── Reset ──
  if (hasWord('reset') || has('start over') || has('wipe')) {
    allEmeralds = false; hasBeatenGame = false;
    shadowAllEmeralds = false; shadowBeaten = false;
    hyperBeaten = false; adminChars = {}; hyperAllowed = {};
    adminLog.push('All progress reset!'); return;
  }

  // ── Everything / all ──
  if (hasWord('all') || hasWord('everything') || has('every character') || has('every mode') || has('the lot')) {
    if (negative) { adminChars = {}; hyperAllowed = {}; adminLog.push('All admin unlocks cleared!'); }
    else { allEmeralds = true; hasBeatenGame = true; shadowAllEmeralds = true; shadowBeaten = true; hyperBeaten = true; adminLog.push('Everything unlocked!'); }
    return;
  }

  // ── Detect character ──
  var ch = null;
  // Check longest names first
  if (has('hyper sonic'))  ch = { mode:'hyperSonic', name:'Hyper Sonic' };
  else if (has('hyper shadow')) ch = { mode:'hyperShadow', name:'Hyper Shadow' };
  else if (has('hyper silver')) ch = { mode:'hyperSilver', name:'Hyper Silver' };
  else if (has('hyper knuckles')) ch = { mode:'hyperKnuckles', name:'Hyper Knuckles' };
  else if (has('super sonic'))  ch = { mode:'super', name:'Super Sonic' };
  else if (has('super shadow')) ch = { mode:'superShadow', name:'Super Shadow' };
  else if (has('super silver')) ch = { mode:'superSilver', name:'Super Silver' };
  else if (has('super knuckles')) ch = { mode:'superKnuckles', name:'Super Knuckles' };

  // If "hyper emerald" appears, figure out if there's ALSO a character
  var aboutHyperLevel = has('hyper emerald');
  var chInHyperCtx = null;
  if (aboutHyperLevel && ch) {
    // Character was detected AND hyper emerald mentioned — character goes in hyper level
    chInHyperCtx = ch;
    ch = null;
  } else if (aboutHyperLevel && !ch) {
    // Check for simple character names in context of hyper emerald
    var rest = cmd.replace(/hyper emerald/g, '');
    // Check for specific emerald names first
    var emNames = ['red','blue','yellow','purple','green','cyan'];
    var foundEm = -1;
    for (var en = 0; en < emNames.length; en++) {
      if (rest.indexOf(emNames[en]) !== -1) { foundEm = en; break; }
    }
    if (foundEm >= 0) chInHyperCtx = { mode:'em' + foundEm, name:EM[foundEm].name + ' Emerald' };
    else if (rest.indexOf('silver') !== -1) {
      // Silver could be the character OR the silver chaos emerald
      // If "emerald" is in the rest, it's the emerald
      if (rest.indexOf('emerald') !== -1) chInHyperCtx = { mode:'em6', name:'Silver Emerald' };
      else chInHyperCtx = { mode:'silver', name:'Silver' };
    }
    else if (rest.indexOf('knuckles') !== -1) chInHyperCtx = { mode:'knuckles', name:'Knuckles' };
    else if (rest.indexOf('shadow') !== -1)   chInHyperCtx = { mode:'shadow', name:'Shadow' };
    else if (rest.indexOf('sonic') !== -1)    chInHyperCtx = { mode:'sonic', name:'Sonic' };
  }

  // If no compound name found and not about hyper level, check simple names
  if (!ch && !aboutHyperLevel) {
    if (hasWord('silver'))        ch = { mode:'silver', name:'Silver' };
    else if (hasWord('knuckles')) ch = { mode:'knuckles', name:'Knuckles' };
    else if (hasWord('shadow'))   ch = { mode:'shadow', name:'Shadow' };
    else if (hasWord('sonic'))    ch = { mode:'sonic', name:'Sonic' };
  }

  // ── Bulk allow/disallow supers, hypers, or emeralds in hyper emerald ──
  // (note: "emerald" appears in "hyper emerald" so use "emeralds" plural)
  if (aboutHyperLevel && (has('supers') || has('hypers') || has('emeralds'))) {
    var bulkType, bulkChars;
    if (has('hypers')) {
      bulkType = 'hypers';
      bulkChars = ['hyperSonic','hyperShadow','hyperSilver','hyperKnuckles','hyperEm'];
    } else if (has('supers')) {
      bulkType = 'supers';
      bulkChars = ['super','superShadow','superSilver','superKnuckles'];
    } else {
      bulkType = 'emeralds';
      bulkChars = ['em0','em1','em2','em3','em4','em5','em6','hyperEm'];
    }
    var added = [];
    for (var bi = 0; bi < bulkChars.length; bi++) {
      var bm = bulkChars[bi];
      if (isCharAvail(bm)) {
        if (negative) delete hyperAllowed[bm];
        else hyperAllowed[bm] = true;
        added.push(bm);
      }
    }
    if (added.length === 0) {
      adminLog.push('No ' + bulkType + ' unlocked yet.');
    } else if (negative) {
      adminLog.push('All unlocked ' + bulkType + ' removed from Hyper Emerald.');
    } else {
      adminLog.push('All unlocked ' + bulkType + ' added to Hyper Emerald!');
    }
    return;
  }

  // ── Hyper Emerald level ──
  if (aboutHyperLevel) {
    // Special case: "hyper emerald in hyper emerald" = the character in the level
    var heCount = (cmd.match(/hyper emerald/g) || []).length;
    if (heCount >= 2 || (aboutHyperLevel && !chInHyperCtx && (has('play as hyper emerald') || has('use hyper emerald') || has('allow hyper emerald') || has('add hyper emerald')))) {
      chInHyperCtx = { mode:'hyperEm', name:'Hyper Emerald' };
    }
    // Also catch "emerald" in remaining text as the character
    if (!chInHyperCtx) {
      var rest2 = cmd.replace('hyper emerald', '');
      if (rest2.indexOf('emerald') !== -1) chInHyperCtx = { mode:'hyperEm', name:'Hyper Emerald' };
    }
    if (chInHyperCtx) {
      if (negative) { delete hyperAllowed[chInHyperCtx.mode]; adminLog.push(chInHyperCtx.name + ' removed from Hyper Emerald!'); }
      else { hyperAllowed[chInHyperCtx.mode] = true; adminLog.push(chInHyperCtx.name + ' added to Hyper Emerald!'); }
      return;
    }
    if (beating) { hyperBeaten = true; adminLog.push('Hyper Emerald beaten!'); return; }
    adminChars.hyperAccess = true; adminLog.push('Hyper Emerald level unlocked!'); return;
  }

  // ── Menu features ──
  if (has('character code') || has('character codes')) { adminChars.codesBtn = true; adminLog.push('Character Codes button unlocked!'); return; }
  if (has('change character') || has('character select')) { adminChars.changeChar = true; adminLog.push('Change Character unlocked!'); return; }
  if (has('free play') || hasWord('freeplay')) { adminChars.freePlayBtn = true; adminLog.push('Free Play unlocked!'); return; }
  if (has('shadow') && has('revival')) {
    if (beating) { shadowBeaten = true; shadowAllEmeralds = true; adminLog.push("Shadow's Revival beaten!"); }
    else { adminChars.shadowRevival = true; adminLog.push("Shadow's Revival unlocked!"); }
    return;
  }

  // ── Beat campaigns ──
  if (beating) {
    if (hasWord('shadow')) { shadowBeaten = true; shadowAllEmeralds = true; adminLog.push("Shadow's Revival beaten!"); }
    else if (hasWord('campaign') || hasWord('story') || hasWord('emeralds') || hasWord('game')) { allEmeralds = true; hasBeatenGame = true; adminLog.push('Campaign beaten!'); }
    else { adminLog.push("Beat what?"); }
    return;
  }

  // ── Character unlock/lock ──
  if (ch) {
    if (negative) { delete adminChars[ch.mode]; adminLog.push(ch.name + ' locked!'); }
    else { adminChars[ch.mode] = true; adminLog.push(ch.name + ' unlocked!'); }
    return;
  }

  // ── Help ──
  if (hasWord('help') || hasWord('commands') || has('what can')) {
    adminLog.push('Just tell me what you want!');
    adminLog.push('I understand characters, levels,');
    adminLog.push('and the hyper emerald level.');
    adminLog.push('Try things like:');
    adminLog.push('"give me silver"');
    adminLog.push('"let me use super sonic in hyper emerald"');
    adminLog.push('"remove shadow from hyper emerald"');
    return;
  }

  adminLog.push("Sorry, I didn't get that.");
}

// Check if a mode is invincible (smashes pipes instead of dying)
function isInvincible(m) {
  // Knuckles is only invincible during charge (handled in physics)
  if (m === 'knuckles') return knucklesCharging;
  return m === 'super' || m === 'superShadow' || m === 'superSilver' || m === 'superKnuckles' || m === 'hyperSonic' || m === 'hyperShadow' || m === 'hyperSilver' || m === 'hyperKnuckles' || m === 'hyperEm';
}
