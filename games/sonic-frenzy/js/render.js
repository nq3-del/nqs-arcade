// ═══════════════════════════════════════════════════════
// RENDER — All drawing functions
// Note: X (canvas context) is declared in main.js and
// available at runtime when these functions are called.
// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────────────
function rrect(x, y, w, h, r) {
  X.beginPath();
  X.moveTo(x+r, y);
  X.lineTo(x+w-r, y); X.quadraticCurveTo(x+w, y, x+w, y+r);
  X.lineTo(x+w, y+h-r); X.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  X.lineTo(x+r, y+h); X.quadraticCurveTo(x, y+h, x, y+h-r);
  X.lineTo(x, y+r); X.quadraticCurveTo(x, y, x+r, y);
  X.closePath();
}

function txt(s, x, y, sz, col, stroke) {
  if (stroke === undefined) stroke = true;
  X.font = sz + "px 'Press Start 2P', monospace";
  X.textAlign = 'center'; X.textBaseline = 'middle';
  if (stroke) { X.strokeStyle = '#000'; X.lineWidth = Math.max(2, sz/7); X.strokeText(s,x,y); }
  X.fillStyle = col; X.fillText(s,x,y);
}

function drawBG(e) {
  var g1 = X.createLinearGradient(0,0,0,FLOOR);
  g1.addColorStop(0, e.sky1); g1.addColorStop(1, e.sky2);
  X.fillStyle = g1; X.fillRect(0,0,W,FLOOR);
  var g2 = X.createLinearGradient(0,FLOOR,0,H);
  g2.addColorStop(0, e.gnd1); g2.addColorStop(1, e.gnd2);
  X.fillStyle = g2; X.fillRect(0,FLOOR,W,H-FLOOR);
  X.fillStyle = 'rgba(0,0,0,0.3)'; X.fillRect(0,FLOOR,W,3);
}

// ───────────────────────────────────────────────────────
// Pipe
// ───────────────────────────────────────────────────────
function drawPipe(px, gy, gs) {
  var capH = 24, ex = 8;
  var topH = gy - gs/2;
  var botY = gy + gs/2;
  var botH = Math.max(0, FLOOR - botY);

  X.fillStyle = '#4aaa22'; X.fillRect(px, 0, PW, topH);
  X.fillStyle = '#5ecc33'; X.fillRect(px-ex, topH-capH, PW+ex*2, capH);
  X.fillStyle = 'rgba(255,255,255,0.1)'; X.fillRect(px+8, 0, 10, Math.max(0,topH-capH));
  X.strokeStyle = 'rgba(0,0,0,0.3)'; X.lineWidth = 2;
  X.strokeRect(px, 0, PW, topH);
  X.strokeRect(px-ex, topH-capH, PW+ex*2, capH);

  X.fillStyle = '#4aaa22'; X.fillRect(px, botY, PW, botH);
  X.fillStyle = '#5ecc33'; X.fillRect(px-ex, botY, PW+ex*2, capH);
  X.fillStyle = 'rgba(255,255,255,0.1)'; X.fillRect(px+8, botY+capH, 10, Math.max(0,botH-capH));
  X.strokeStyle = 'rgba(0,0,0,0.3)'; X.lineWidth = 2;
  X.strokeRect(px, botY, PW, botH);
  X.strokeRect(px-ex, botY, PW+ex*2, capH);
}

// ───────────────────────────────────────────────────────
// Particles
// ───────────────────────────────────────────────────────
function spark(x, y, col, n) {
  n = n || 8;
  for (var i = 0; i < n; i++) {
    var a = (Math.PI*2*i/n) + Math.random()*0.5;
    var sp = 2 + Math.random()*4;
    var life = 30 + Math.random()*20;
    parts.push({ x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-2, r:3+Math.random()*4, c:col, l:life, ml:life });
  }
}

function tickParts() {
  parts = parts.filter(function(p){ return p.l > 0; });
  parts.forEach(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.l--;
    X.save(); X.globalAlpha = p.l / p.ml;
    X.beginPath(); X.arc(p.x, p.y, p.r, 0, Math.PI*2);
    X.fillStyle = p.c; X.fill();
    X.restore();
  });
}

// ───────────────────────────────────────────────────────
// Gear button + Pause menu
// ───────────────────────────────────────────────────────
function drawGearBtn() {
  var cx = GEAR_BTN.x + GEAR_BTN.w/2, cy = GEAR_BTN.y + GEAR_BTN.h/2;
  X.save();
  X.translate(cx, cy);
  X.beginPath(); X.arc(0, 0, 18, 0, Math.PI*2);
  X.fillStyle = 'rgba(0,0,0,0.45)'; X.fill();
  X.strokeStyle = 'rgba(255,255,255,0.5)'; X.lineWidth = 2; X.stroke();
  X.strokeStyle = '#fff'; X.lineWidth = 2.5;
  X.beginPath(); X.arc(0, 0, 6, 0, Math.PI*2); X.stroke();
  for (var i = 0; i < 6; i++) {
    var a = i * Math.PI / 3;
    X.beginPath();
    X.moveTo(Math.cos(a)*8, Math.sin(a)*8);
    X.lineTo(Math.cos(a)*12, Math.sin(a)*12);
    X.stroke();
  }
  X.restore();
}

function drawPauseMenu() {
  X.fillStyle = 'rgba(0,0,0,0.65)'; X.fillRect(0, 0, W, H);
  txt('PAUSED', W/2, 200, 22, '#f5c518');

  // Can skip? Not in shadow campaign or hyper challenge
  var canSkip = !hyperChallenge && !shadowCampaign;

  var btns = [
    // Row 1
    { key:'switchChar', label1:'CHANGE',   label2:'CHARACTER', col: (allEmeralds || adminChars.changeChar) ? '#2266dd' : '#555', border: (allEmeralds || adminChars.changeChar) ? '#4488ff' : '#666', disabled: !(allEmeralds || adminChars.changeChar) },
    { key:'freePlay',   label1:'FREE',     label2:'PLAY',      col: (allEmeralds || adminChars.freePlayBtn) ? '#aa22aa' : '#555', border: (allEmeralds || adminChars.freePlayBtn) ? '#dd44dd' : '#666', disabled: !(allEmeralds || adminChars.freePlayBtn) },
    { key:'skipLevel',  label1:'SKIP',     label2:'LEVEL',     col: canSkip ? '#dd8822' : '#555', border: canSkip ? '#ffaa44' : '#666', disabled: !canSkip },
    // Row 2
    { key:'hyperEmerald',  label1:'THE HYPER', label2:'EMERALD', col: (shadowBeaten || adminChars.hyperAccess) ? '#dd22dd' : '#555', border: (shadowBeaten || adminChars.hyperAccess) ? '#ff66ff' : '#666', disabled: !(shadowBeaten || adminChars.hyperAccess) },
    { key:'shadowRevival', label1:"SHADOW'S",  label2:'REVIVAL',  col: (allEmeralds || adminChars.shadowRevival) ? '#cc2222' : '#555', border: (allEmeralds || adminChars.shadowRevival) ? '#ff4444' : '#666', disabled: !(allEmeralds || adminChars.shadowRevival) },
    { key:'cont',          label1:'CONTINUE',  label2:'',         col: '#2db52d', border: '#40d040', disabled: false }
  ];

  btns.forEach(function(b) {
    var r = PAUSE_BTNS[b.key];
    rrect(r.x, r.y, r.w, r.h, 10);
    X.fillStyle = b.disabled ? 'rgba(60,60,60,0.7)' : b.col; X.fill();
    X.strokeStyle = b.disabled ? '#444' : b.border; X.lineWidth = 2; X.stroke();
    var tc = b.disabled ? '#777' : '#fff';
    txt(b.label1, r.x + r.w/2, r.y + (b.label2 ? 18 : 24), 6, tc);
    if (b.label2) txt(b.label2, r.x + r.w/2, r.y + 32, 6, tc);
  });

  // Admin button
  rrect(PAUSE_ADMIN.x, PAUSE_ADMIN.y, PAUSE_ADMIN.w, PAUSE_ADMIN.h, 10);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#555'; X.lineWidth = 2; X.stroke();
  txt('ADMIN', PAUSE_ADMIN.x + PAUSE_ADMIN.w/2, PAUSE_ADMIN.y + 24, 10, '#888');

  // Character Codes button (only after Super Sonic unlocked)
  if (allEmeralds || adminChars.codesBtn) {
    rrect(PAUSE_CODES.x, PAUSE_CODES.y, PAUSE_CODES.w, PAUSE_CODES.h, 10);
    X.fillStyle = '#1a1a2e'; X.fill();
    X.strokeStyle = '#4444aa'; X.lineWidth = 2; X.stroke();
    txt('CHARACTER CODES', PAUSE_CODES.x + PAUSE_CODES.w/2, PAUSE_CODES.y + 24, 10, '#6666cc');
  }

  // Save / Load button
  rrect(PAUSE_SAVE.x, PAUSE_SAVE.y, PAUSE_SAVE.w, PAUSE_SAVE.h, 10);
  X.fillStyle = '#0a2a1a'; X.fill();
  X.strokeStyle = '#22aa55'; X.lineWidth = 2; X.stroke();
  txt('SAVE / LOAD', PAUSE_SAVE.x + PAUSE_SAVE.w/2, PAUSE_SAVE.y + 24, 10, '#44dd77');
}

function drawSaveScreen() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0, 0, W, H);

  // Subtle stars
  for (var si = 0; si < 60; si++) {
    X.globalAlpha = 0.2 + 0.4*(Math.sin(frame*0.04+si)*0.5+0.5);
    X.fillStyle = '#22aa55';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  txt('SAVE / LOAD', W/2, 130, 15, '#44dd77');
  txt('Your progress is stored', W/2, 190, 7, '#888');
  txt('locally in your browser', W/2, 210, 7, '#888');

  // Save button
  rrect(SAVE_BTN.x, SAVE_BTN.y, SAVE_BTN.w, SAVE_BTN.h, 12);
  X.fillStyle = '#1a4422'; X.fill();
  X.strokeStyle = '#44dd77'; X.lineWidth = 3; X.stroke();
  txt('SAVE', SAVE_BTN.x + SAVE_BTN.w/2, SAVE_BTN.y + 24, 13, '#44dd77');
  txt('Save current progress', SAVE_BTN.x + SAVE_BTN.w/2, SAVE_BTN.y + 45, 6, '#aaffcc');

  // Load button
  rrect(LOAD_BTN.x, LOAD_BTN.y, LOAD_BTN.w, LOAD_BTN.h, 12);
  X.fillStyle = '#221a44'; X.fill();
  X.strokeStyle = '#7755dd'; X.lineWidth = 3; X.stroke();
  txt('LOAD SAVE FILE', LOAD_BTN.x + LOAD_BTN.w/2, LOAD_BTN.y + 24, 11, '#aa88ff');
  txt('Restore saved progress', LOAD_BTN.x + LOAD_BTN.w/2, LOAD_BTN.y + 45, 6, '#ccaaff');

  // Delete button
  rrect(DELETE_BTN.x, DELETE_BTN.y, DELETE_BTN.w, DELETE_BTN.h, 12);
  X.fillStyle = '#441010'; X.fill();
  X.strokeStyle = '#cc2200'; X.lineWidth = 3; X.stroke();
  txt('DELETE SAVE FILE', DELETE_BTN.x + DELETE_BTN.w/2, DELETE_BTN.y + 24, 11, '#ff4400');
  txt('Erase saved progress', DELETE_BTN.x + DELETE_BTN.w/2, DELETE_BTN.y + 45, 6, '#ff8866');

  // Status message
  if (saveMessage) {
    var col = saveMessage.indexOf('!') !== -1 ? '#44ff44' : '#ff8844';
    txt(saveMessage, W/2, 485, 9, col);
  }

  // Back button
  rrect(SAVE_BACK.x, SAVE_BACK.y, SAVE_BACK.w, SAVE_BACK.h, 8);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#666'; X.lineWidth = 2; X.stroke();
  txt('BACK', SAVE_BACK.x + SAVE_BACK.w/2, SAVE_BACK.y + 22, 9, '#aaa');
}

function drawSaveDeleteConfirm() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0, 0, W, H);

  var pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
  X.fillStyle = 'rgba(255,0,0,' + (pulse * 0.2) + ')';
  X.fillRect(0, 0, W, H);

  txt('\u26A0  WARNING  \u26A0', W/2, 130, 14, '#ff0000');

  txt('Are you sure you want to', W/2, 200, 8, '#fff');
  txt('delete your save file?', W/2, 225, 8, '#fff');
  txt('ALL progress will be lost.', W/2, 270, 9, '#ff6600');
  txt("There's no going back!", W/2, 300, 9, '#ff6600');

  // YES DELETE
  rrect(SAVE_YES.x, SAVE_YES.y, SAVE_YES.w, SAVE_YES.h, 12);
  X.fillStyle = '#660000'; X.fill();
  X.strokeStyle = '#ff0000'; X.lineWidth = 3; X.stroke();
  txt('YES', SAVE_YES.x + SAVE_YES.w/2, SAVE_YES.y + 22, 14, '#ff2200');
  txt('DELETE', SAVE_YES.x + SAVE_YES.w/2, SAVE_YES.y + 44, 7, '#ff8866');

  // NO CANCEL
  rrect(SAVE_NO.x, SAVE_NO.y, SAVE_NO.w, SAVE_NO.h, 12);
  X.fillStyle = '#104410'; X.fill();
  X.strokeStyle = '#22cc44'; X.lineWidth = 3; X.stroke();
  txt('NO', SAVE_NO.x + SAVE_NO.w/2, SAVE_NO.y + 22, 14, '#44ff44');
  txt('CANCEL', SAVE_NO.x + SAVE_NO.w/2, SAVE_NO.y + 44, 7, '#88ff88');
}

function drawSaveOverwriteConfirm() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0, 0, W, H);

  // Pulsing warning border
  var pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  X.fillStyle = 'rgba(255,68,0,' + (pulse * 0.15) + ')';
  X.fillRect(0, 0, W, H);

  txt('\u26A0  WARNING  \u26A0', W/2, 130, 14, '#ff6600');

  txt('You already have a save file!', W/2, 200, 8, '#fff');
  txt('Saving now will overwrite your', W/2, 240, 8, '#fff');
  txt('old save data. This cannot be', W/2, 265, 8, '#fff');
  txt('undone.', W/2, 290, 8, '#fff');

  txt('Are you sure?', W/2, 350, 11, '#ffaa00');

  // YES (overwrite)
  rrect(SAVE_YES.x, SAVE_YES.y, SAVE_YES.w, SAVE_YES.h, 12);
  X.fillStyle = '#441010'; X.fill();
  X.strokeStyle = '#cc2200'; X.lineWidth = 3; X.stroke();
  txt('YES', SAVE_YES.x + SAVE_YES.w/2, SAVE_YES.y + 22, 14, '#ff4400');
  txt('OVERWRITE', SAVE_YES.x + SAVE_YES.w/2, SAVE_YES.y + 44, 7, '#ff8866');

  // NO (cancel)
  rrect(SAVE_NO.x, SAVE_NO.y, SAVE_NO.w, SAVE_NO.h, 12);
  X.fillStyle = '#104410'; X.fill();
  X.strokeStyle = '#22cc44'; X.lineWidth = 3; X.stroke();
  txt('NO', SAVE_NO.x + SAVE_NO.w/2, SAVE_NO.y + 22, 14, '#44ff44');
  txt('CANCEL', SAVE_NO.x + SAVE_NO.w/2, SAVE_NO.y + 44, 7, '#88ff88');
}

function drawCodeReveal() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0, 0, W, H);

  // Sparkle background
  for (var si = 0; si < 80; si++) {
    var hue = ((si * 37 + frame * 2) % 360);
    X.globalAlpha = 0.3 + 0.6*(Math.sin(frame*0.06+si)*0.5+0.5);
    X.fillStyle = 'hsl(' + hue + ',100%,65%)';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  // Title
  txt('CHARACTER CODE', W/2, 160, 14, '#6666cc');
  txt('UNLOCKED!', W/2, 195, 14, '#6666cc');

  // Code box
  rrect(W/2 - 130, 250, 260, 70, 12);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 3; X.stroke();

  var pulse = 1 + Math.sin(frame * 0.1) * 0.05;
  txt(codeRevealCode, W/2, 285, Math.floor(28 * pulse), '#ffd84a', false);

  txt(codeRevealName, W/2, 360, 9, '#aaa');
  txt('Use this in Character Codes', W/2, 410, 7, '#888');
  txt('to unlock new characters!', W/2, 430, 7, '#888');

  if (frame % 60 < 30) {
    txt('TAP / CLICK TO CONTINUE', W/2, 510, 8, '#fff');
  }
}

function drawCodesMenu() {
  X.fillStyle = 'rgba(0,0,0,0.9)'; X.fillRect(0, 0, W, H);
  txt('CHARACTER CODES', W/2, 120, 16, '#6666cc');
  txt('Choose an option:', W/2, 180, 9, '#aaa');

  // Console button
  rrect(CODES_MENU_CONSOLE_BTN.x, CODES_MENU_CONSOLE_BTN.y, CODES_MENU_CONSOLE_BTN.w, CODES_MENU_CONSOLE_BTN.h, 10);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();
  txt('CHARACTER CODES CONSOLE', W/2, CODES_MENU_CONSOLE_BTN.y + 30, 11, '#6666cc');
  txt('Enter codes to unlock content', W/2, CODES_MENU_CONSOLE_BTN.y + 52, 6, '#888');

  // View unlocked button
  rrect(CODES_MENU_VIEW_BTN.x, CODES_MENU_VIEW_BTN.y, CODES_MENU_VIEW_BTN.w, CODES_MENU_VIEW_BTN.h, 10);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();
  txt('VIEW UNLOCKED CODES', W/2, CODES_MENU_VIEW_BTN.y + 30, 11, '#6666cc');
  txt('See codes you have entered', W/2, CODES_MENU_VIEW_BTN.y + 52, 6, '#888');

  // Back button
  rrect(CODES_MENU_BACK_BTN.x, CODES_MENU_BACK_BTN.y, CODES_MENU_BACK_BTN.w, CODES_MENU_BACK_BTN.h, 8);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();
  txt('BACK', W/2, CODES_MENU_BACK_BTN.y + 26, 10, '#6666cc');
}

function drawCodesList() {
  X.fillStyle = 'rgba(0,0,0,0.9)'; X.fillRect(0, 0, W, H);
  txt('UNLOCKED CODES', W/2, 100, 16, '#6666cc');

  var keys = Object.keys(unlockedCodes).filter(function(k) { return !!unlockedCodes[k]; });

  if (keys.length === 0) {
    txt('NO UNLOCKED CODES AVAILABLE', W/2, H/2 - 20, 10, '#ff6666');
    txt('Enter codes from the console to unlock content', W/2, H/2 + 10, 6, '#888');
  } else {
    var listY = 170;
    for (var i = 0; i < keys.length; i++) {
      var code = keys[i];
      var info = CHAR_CODES[code];
      var label = info ? info.name : 'Unknown';
      var lineY = listY + i * 36;
      // Row background
      rrect(30, lineY - 16, W - 60, 30, 6);
      X.fillStyle = '#111'; X.fill();
      X.strokeStyle = '#333'; X.lineWidth = 1; X.stroke();
      // Code = name
      X.font = "10px 'Press Start 2P', monospace";
      X.textAlign = 'left'; X.textBaseline = 'middle';
      X.fillStyle = '#6666cc';
      X.fillText(code, 45, lineY);
      X.fillStyle = '#aaa';
      X.fillText('=', 130, lineY);
      X.fillStyle = '#44ff44';
      X.fillText(label, 155, lineY);
    }
  }

  // Back button
  rrect(CODES_LIST_BACK_BTN.x, CODES_LIST_BACK_BTN.y, CODES_LIST_BACK_BTN.w, CODES_LIST_BACK_BTN.h, 8);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();
  txt('BACK', W/2, CODES_LIST_BACK_BTN.y + 26, 10, '#6666cc');
}

function drawCodesScreen() {
  X.fillStyle = 'rgba(0,0,0,0.9)'; X.fillRect(0, 0, W, H);
  txt('CHARACTER CODES', W/2, 120, 16, '#6666cc');
  txt('Enter a 5-digit code:', W/2, 200, 9, '#aaa');

  // Code input box
  rrect(W/2 - 120, 230, 240, 55, 10);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();

  var display = codesInput || '_____';
  txt(display, W/2, 260, 22, '#6666cc', false);

  if (codesLog) {
    var logCol = codesLog.indexOf('!') !== -1 ? '#44ff44' : '#ff4444';
    txt(codesLog, W/2, 330, 7, logCol);
  }

  txt('Type code + ENTER', W/2, 400, 7, '#666');

  // Back button (touch-friendly)
  rrect(CODES_BACK_BTN.x, CODES_BACK_BTN.y, CODES_BACK_BTN.w, CODES_BACK_BTN.h, 8);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#6666cc'; X.lineWidth = 2; X.stroke();
  txt('BACK', W/2, CODES_BACK_BTN.y + 26, 10, '#6666cc');
}

function drawAdminPassword() {
  X.fillStyle = 'rgba(0,0,0,0.85)'; X.fillRect(0, 0, W, H);
  txt('ADMIN ACCESS', W/2, 150, 16, '#ff6600');
  txt('ENTER CODE:', W/2, 220, 10, '#aaa');

  // Password box
  rrect(W/2 - 100, 250, 200, 50, 10);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#ff6600'; X.lineWidth = 2; X.stroke();

  // Show dots for each digit entered
  var dots = '';
  for (var i = 0; i < adminInput.length; i++) dots += '\u2022 ';
  txt(dots || '_', W/2, 278, 18, '#ff6600', false);

  txt('Type code + ENTER', W/2, 340, 7, '#666');

  // Back button (touch-friendly)
  rrect(ADMIN_PWD_BACK_BTN.x, ADMIN_PWD_BACK_BTN.y, ADMIN_PWD_BACK_BTN.w, ADMIN_PWD_BACK_BTN.h, 8);
  X.fillStyle = '#222'; X.fill();
  X.strokeStyle = '#ff6600'; X.lineWidth = 2; X.stroke();
  txt('CANCEL', W/2, ADMIN_PWD_BACK_BTN.y + 26, 10, '#ff6600');
}

function drawAdminConsole() {
  X.fillStyle = '#0a0a0a'; X.fillRect(0, 0, W, H);

  // Header
  X.fillStyle = '#1a1a1a'; X.fillRect(0, 0, W, 50);
  txt('ADMIN CONSOLE', W/2 - 30, 28, 12, '#ff6600');

  // Exit button (top-right, touch-friendly)
  rrect(ADMIN_CONSOLE_BACK_BTN.x, ADMIN_CONSOLE_BACK_BTN.y, ADMIN_CONSOLE_BACK_BTN.w, ADMIN_CONSOLE_BACK_BTN.h, 6);
  X.fillStyle = '#330000'; X.fill();
  X.strokeStyle = '#ff6600'; X.lineWidth = 2; X.stroke();
  txt('EXIT', ADMIN_CONSOLE_BACK_BTN.x + ADMIN_CONSOLE_BACK_BTN.w / 2, ADMIN_CONSOLE_BACK_BTN.y + 21, 9, '#ff6600');

  // Log area
  var logY = 70;
  var maxLines = 14;
  var startLine = Math.max(0, adminLog.length - maxLines);
  for (var i = startLine; i < adminLog.length; i++) {
    var line = adminLog[i];
    var col = line.charAt(0) === '>' ? '#ff6600' : '#44ff44';
    X.font = "9px 'Press Start 2P', monospace";
    X.textAlign = 'left'; X.textBaseline = 'middle';
    X.fillStyle = col;
    X.fillText(line, 20, logY + (i - startLine) * 22);
  }

  // Input box at bottom
  var inputY = H - 70;
  rrect(15, inputY, W - 30, 40, 8);
  X.fillStyle = '#111'; X.fill();
  X.strokeStyle = '#ff6600'; X.lineWidth = 2; X.stroke();

  X.font = "9px 'Press Start 2P', monospace";
  X.textAlign = 'left'; X.textBaseline = 'middle';
  X.fillStyle = '#ff6600';
  var cursor = (Math.floor(frame / 30) % 2 === 0) ? '_' : '';
  X.fillText('> ' + adminInput + cursor, 25, inputY + 22);

  txt('Type a command + ENTER | ESC to exit', W/2, H - 18, 5, '#444');
}

// ───────────────────────────────────────────────────────
// Screens
// ───────────────────────────────────────────────────────
function drawMenu() {
  frame++;
  drawBG({ sky1:'#4488ff', sky2:'#aaccff', gnd1:'#22aa22', gnd2:'#115511' });

  txt('SONIC',  W/2, 145, 28, '#f5c518');
  txt('FRENZY', W/2, 190, 28, '#f5c518');

  for (var i = 0; i < 7; i++) {
    var a = menuAngle + (i/7)*Math.PI*2;
    drawGem(W/2 + Math.cos(a)*85, 325 + Math.sin(a)*28, 13, 18, EM[i].c, EM[i].hi, EM[i].sh, 0, a*2);
  }
  menuAngle += 0.016;

  if (frame % 60 < 30) {
    txt('PRESS SPACE / TAP', W/2, 455, 8, '#fff');
    txt('TO START',          W/2, 478, 8, '#fff');
  }
  txt('Collect all 7 Chaos Emeralds!', W/2, 548, 6, '#aaddff');
}

function drawGame() {
  var inf = S === 'infinity';
  var e = EM[Math.min(lv, 6)];

  // Background
  if (hyperChallenge) {
    drawBG(HYPER_THEME);
  } else if (inf) {
    X.fillStyle = '#001144'; X.fillRect(0,0,W,FLOOR);
    X.fillStyle = '#22aa22'; X.fillRect(0,FLOOR,W,H-FLOOR);
    X.fillStyle = 'rgba(0,0,0,0.3)'; X.fillRect(0,FLOOR,W,3);
  } else {
    drawBG(e);
  }

  pipes.forEach(function(p){ if (!p.smashed) drawPipe(p.x, p.gy, p.gs); });
  tickParts();

  // Draw player character
  X.save(); X.translate(P.x, P.y);
  if (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles') {
    X.rotate(P.rot * 0.5);
    X.restore();
    var hcType = mode === 'hyperShadow' ? 'shadow' : mode === 'hyperSilver' ? 'silver' : mode === 'hyperKnuckles' ? 'knuckles' : 'sonic';
    drawHyperChar(P.x, P.y, 22, hcType, Math.sin(frame * 0.2) * 1.5, true, frame);
  } else if (mode === 'hyperEm') {
    X.rotate(P.rot);
    drawRainbowGem(0, 0, PR, PR*1.3, PR*1.2, Math.sin(frame*0.05)*0.3, frame);
    X.restore();
  } else if (mode === 'super') {
    X.rotate(P.rot * 0.5);
    drawSonicChar(0, 0, 22, true, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'superShadow') {
    X.rotate(P.rot * 0.5);
    drawShadowChar(0, 0, 22, true, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'sonic') {
    X.rotate(P.rot * 0.5);
    drawSonicChar(0, 0, 22, false, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'shadow') {
    X.rotate(P.rot * 0.5);
    drawShadowChar(0, 0, 22, false, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'superSilver') {
    X.rotate(P.rot * 0.5);
    drawSilverChar(0, 0, 22, true, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'silver') {
    X.rotate(P.rot * 0.5);
    drawSilverChar(0, 0, 22, false, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'superKnuckles') {
    X.rotate(P.rot * 0.5);
    drawKnucklesChar(0, 0, 22, true, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else if (mode === 'knuckles') {
    X.rotate(P.rot * 0.5);
    drawKnucklesChar(0, 0, 22, false, Math.sin(frame * 0.2) * 1.5, true);
    X.restore();
  } else {
    // emerald mode
    X.rotate(P.rot);
    drawGem(0, 0, PR, PR*1.3, e.c, e.hi, e.sh, PR*1.2, Math.sin(frame*0.05)*0.3);
    X.restore();
  }

  // HUD
  if (hyperChallenge) {
    txt(hyperPassed + '/' + HYPER_LV.need, W/2, 50, 14, '#fff');
    txt('\u2726 HYPER EMERALD \u2726', W/2, 78, 7, '#ff66ff');
  } else if (freePlay) {
    txt(freePlayScore + '/\u221E', W/2, 50, 14, '#fff');
    var fpLabel = mode === 'super' ? '\u2605 SUPER SONIC \u2605'
               : mode === 'superShadow' ? '\u2605 SUPER SHADOW \u2605'
               : mode === 'superSilver' ? '\u2605 SUPER SILVER \u2605'
               : mode === 'hyperSonic' ? '\u2726 HYPER SONIC \u2726'
               : mode === 'hyperShadow' ? '\u2726 HYPER SHADOW \u2726'
               : mode === 'hyperSilver' ? '\u2726 HYPER SILVER \u2726'
               : mode === 'hyperEm' ? '\u2726 HYPER EMERALD \u2726'
               : mode === 'shadow' ? 'SHADOW'
               : mode === 'silver' ? 'SILVER'
               : mode === 'knuckles' ? 'KNUCKLES'
               : mode === 'superKnuckles' ? '\u2605 SUPER KNUCKLES \u2605'
               : mode === 'hyperKnuckles' ? '\u2726 HYPER KNUCKLES \u2726'
               : mode === 'sonic' ? 'SONIC'
               : mode === 'em' ? EM[lv].name + ' EMERALD' : '';
    var fpCol = mode === 'em' ? EM[lv].c
              : isKnucklesMode(mode) ? '#cc2200'
              : (mode === 'shadow' || mode === 'superShadow') ? '#cc0000'
              : (mode === 'silver' || mode === 'superSilver') ? '#00ced1'
              : (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles' || mode === 'hyperEm') ? '#ff66ff'
              : '#f5c518';
    if (fpLabel) txt(fpLabel, W/2, 78, 6, fpCol);
  } else if (inf) {
    txt(infScore + '/' + INF_WIN, W/2, 50, 14, '#fff');
    var modeLabel = mode === 'super' ? '\u2605 SUPER SONIC \u2605'
                  : mode === 'superShadow' ? '\u2605 SUPER SHADOW \u2605'
                  : mode === 'superSilver' ? '\u2605 SUPER SILVER \u2605'
                  : mode === 'hyperSonic' ? '\u2726 HYPER SONIC \u2726'
                  : mode === 'hyperShadow' ? '\u2726 HYPER SHADOW \u2726'
                  : mode === 'hyperSilver' ? '\u2726 HYPER SILVER \u2726'
                  : mode === 'hyperEm' ? '\u2726 HYPER EMERALD \u2726'
                  : mode === 'shadow' ? 'SHADOW'
                  : mode === 'silver' ? 'SILVER'
                  : mode === 'knuckles' ? 'KNUCKLES'
                  : mode === 'superKnuckles' ? '\u2605 SUPER KNUCKLES \u2605'
                  : mode === 'hyperKnuckles' ? '\u2726 HYPER KNUCKLES \u2726'
                  : mode === 'em' ? EM[lv].name + ' EMERALD' : 'SONIC';
    var modeCol = mode === 'em' ? EM[lv].c
                : (mode === 'shadow' || mode === 'superShadow') ? '#cc0000'
                : (mode === 'silver' || mode === 'superSilver') ? '#00ced1'
                : isKnucklesMode(mode) ? '#cc2200'
                : (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles' || mode === 'hyperEm') ? '#ff66ff'
                : '#f5c518';
    txt(modeLabel, W/2, 78, 7, modeCol);
  } else if (shadowCampaign) {
    var slv = SHADOW_LV[shadowLv];
    txt(shadowPassed + '/' + slv.need, W/2, 50, 14, '#fff');
    txt(e.name + ' Emerald', W/2, 78, 7, e.c);
    txt("SHADOW'S REVIVAL", W/2, 96, 5, '#cc0000');
  } else {
    txt(passed + '/' + LV[lv].need, W/2, 50, 14, '#fff');
    txt(e.name + ' Emerald', W/2, 78, 7, e.c);
  }

  // Knuckles charge dash effect — motion lines
  if (knucklesCharging && isKnucklesMode(mode)) {
    X.save();
    X.globalAlpha = 0.6;
    for (var dl = 0; dl < 8; dl++) {
      var dy = P.y - 12 + dl * 3;
      var dx = P.x - 30 - Math.random() * 40;
      var dw = 20 + Math.random() * 30;
      if (mode === 'hyperKnuckles') {
        var hue = ((dl * 45 + frame * 8) % 360);
        X.fillStyle = 'hsl(' + hue + ',100%,65%)';
      } else if (mode === 'superKnuckles') {
        X.fillStyle = '#ff66bb';
      } else {
        X.fillStyle = '#ff4400';
      }
      X.fillRect(dx, dy, dw, 2);
    }
    X.restore();
  }

  // Knuckles charge ability icon
  if (isKnucklesMode(mode)) {
    // If charges available, icon is colored. Otherwise show fill progress.
    var cdPct = knucklesCharges > 0 ? 0 : (knucklesCooldown / KNUCKLES_COOLDOWN_DUR);
    drawFistIcon(40, FLOOR - 35, 22, cdPct);
    // Show charge count next to icon if 2 or more
    if (knucklesCharges >= 2) {
      X.save();
      X.beginPath(); X.arc(60, FLOOR - 50, 10, 0, Math.PI*2);
      X.fillStyle = '#000'; X.fill();
      X.strokeStyle = '#ff4400'; X.lineWidth = 2; X.stroke();
      txt(knucklesCharges + '', 60, FLOOR - 50, 8, '#ff4400', false);
      X.restore();
    }
    if (knucklesCharging) {
      txt('CHARGE!', 40, FLOOR - 65, 6, '#ff4400');
    } else if (knucklesCharges > 0) {
      txt('[M]', 40, FLOOR - 65, 5, '#ff4400');
    } else {
      var secLeft = Math.ceil(knucklesCooldown / 60);
      txt(secLeft + 's', 40, FLOOR - 65, 6, '#888');
    }
  }

  drawGearBtn();
  if (paused) drawPauseMenu();
}

function drawDead() {
  frame++;
  var inf = wasInfinity && !shadowCampaign && !hyperChallenge && !freePlay;

  if (freePlay || inf || hyperChallenge) {
    X.fillStyle = '#050510'; X.fillRect(0,0,W,H);
  } else {
    drawBG(EM[Math.min(lv, 6)]);
    pipes.forEach(function(p){ drawPipe(p.x,p.gy,p.gs); });
    tickParts();
  }
  X.fillStyle = 'rgba(0,0,0,0.6)'; X.fillRect(0,0,W,H);

  if (freePlay && (isNewBest || isNewSuperBest)) {
    var pulse = 1 + Math.sin(frame * 0.12) * 0.08;
    var sz = Math.floor(26 * pulse);
    if (isNewSuperBest) {
      txt('NEW BEST', W/2, H/2 - 110, Math.floor(sz * 0.8), '#ffd84a');
      txt('SUPER SONIC!', W/2, H/2 - 75, Math.floor(sz * 0.8), '#ffd84a');
      txt(bestSuperScore + '', W/2, H/2 - 10, 30, '#fff');
    } else {
      txt('NEW BEST!', W/2, H/2 - 80, sz, '#f5c518');
      txt(bestScore + '', W/2, H/2 - 20, 30, '#fff');
    }
    txt('pipes', W/2, H/2 + 28, 9, '#aaa');
    RETRY_BTN.y = H/2 + 60;
    rrect(RETRY_BTN.x, RETRY_BTN.y, RETRY_BTN.w, RETRY_BTN.h, 10);
    X.fillStyle = '#2db52d'; X.fill();
    X.strokeStyle = '#40d040'; X.lineWidth = 2; X.stroke();
    txt('RETRY', RETRY_BTN.x + RETRY_BTN.w/2, RETRY_BTN.y + 30, 10, '#fff');
  } else if (freePlay) {
    txt('GAME OVER', W/2, H/2 - 55, 20, '#ff4444');
    txt('Score: ' + freePlayScore, W/2, H/2 + 0, 13, '#fff');
    var bestLabel = mode === 'super' ? 'Best Super Sonic: ' + bestSuperScore : 'Best: ' + bestScore;
    txt(bestLabel, W/2, H/2 + 32, 9, '#f5c518');
    RETRY_BTN.y = H/2 + 65;
    rrect(RETRY_BTN.x, RETRY_BTN.y, RETRY_BTN.w, RETRY_BTN.h, 10);
    X.fillStyle = '#2db52d'; X.fill();
    X.strokeStyle = '#40d040'; X.lineWidth = 2; X.stroke();
    txt('RETRY', RETRY_BTN.x + RETRY_BTN.w/2, RETRY_BTN.y + 30, 10, '#fff');
  } else if (hyperChallenge) {
    txt('GAME OVER', W/2, H/2 - 55, 20, '#ff4444');
    txt(hyperPassed + '/' + HYPER_LV.need, W/2, H/2 + 0, 14, '#fff');
    txt('pipes cleared', W/2, H/2 + 32, 8, '#aaa');
    if (frame % 60 < 30) txt('SPACE / TAP TO RETRY', W/2, H/2 + 88, 8, '#ff66ff');
  } else {
    txt('GAME OVER', W/2, H/2 - 55, 20, '#ff4444');
    if (inf) {
      txt('Score: ' + infScore, W/2, H/2 + 0, 13, '#fff');
    } else if (shadowCampaign) {
      txt(shadowPassed + '/' + SHADOW_LV[shadowLv].need, W/2, H/2 + 0, 14, '#fff');
      txt('pipes cleared', W/2, H/2 + 32, 8, '#aaa');
    } else {
      txt(passed + '/' + LV[lv].need, W/2, H/2 + 0, 14, '#fff');
      txt('pipes cleared', W/2, H/2 + 32, 8, '#aaa');
    }
    if (frame % 60 < 30) txt('SPACE / TAP TO RETRY', W/2, H/2 + 88, 8, '#f5c518');
  }
}

function drawCutscene() {
  csT++; sonicLeg += 0.3; frame++;

  if (csT < 80) sonicX = -80 + (csT/80) * (W/2 - 38);
  else sonicX = W/2 - 38;

  X.fillStyle = '#05050f'; X.fillRect(0,0,W,H);
  for (var si = 0; si < 60; si++) {
    X.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7*((si%3)/3)) + ')';
    X.fillRect((si*73+11)%W, (si*43+7)%(H*0.72), si%3===0?2:1, si%3===0?2:1);
  }
  X.fillStyle = '#000'; X.fillRect(0,0,W,55); X.fillRect(0,H-55,W,55);

  var e = EM[shadowCampaign ? shadowLv : lv];

  if (csT < 100) {
    var bob = Math.sin(csT*0.12)*6;
    var gl  = 22 + Math.sin(csT*0.15)*8;
    drawGem(W/2, H/2 + bob, 22, 30, e.c, e.hi, e.sh, gl, csT*0.03);
  }

  // Draw Shadow or Sonic depending on campaign
  if (shadowCampaign) {
    drawShadowChar(sonicX, H/2 + 18, 26, false, sonicLeg, true);
  } else {
    drawSonicChar(sonicX, H/2 + 18, 26, false, sonicLeg, true);
  }

  if (csT >= 96 && csT <= 106) {
    var fa = 1 - Math.abs(csT - 101)/5;
    X.fillStyle = 'rgba(255,255,255,' + (fa*0.85) + ')'; X.fillRect(0,0,W,H);
    if (csT === 101) { sfx.emerald(); spark(W/2, H/2, e.c, 22); }
  }
  tickParts();

  if (csT > 112) {
    var ta = Math.min(1, (csT-112)/20);
    X.globalAlpha = ta;
    txt(e.name.toUpperCase(), W/2, H/2 - 55, 17, e.c);
    txt('CHAOS EMERALD', W/2, H/2 - 25, 9, '#fff');
    txt('OBTAINED!', W/2, H/2 + 10, 14, '#f5c518');
    if (shadowCampaign) {
      drawGem(sonicX + 32, H/2 - 25, 10, 14, e.c, e.hi, e.sh, 12, csT*0.05);
    } else {
      drawGem(sonicX + 32, H/2 - 25, 10, 14, e.c, e.hi, e.sh, 12, csT*0.05);
    }
    X.globalAlpha = 1;
  }
  if (csT > 160 && frame % 50 < 25) txt('SPACE / TAP TO CONTINUE', W/2, H - 75, 7, '#aaa');
}

function drawHyperCutscene() {
  csT++; sonicLeg += 0.3; frame++;

  if (csT < 80) sonicX = -80 + (csT/80) * (W/2 - 38);
  else sonicX = W/2 - 38;

  X.fillStyle = '#05050f'; X.fillRect(0,0,W,H);
  // Rainbow stars
  for (var si = 0; si < 60; si++) {
    var hue = ((si * 37 + frame * 3) % 360);
    X.fillStyle = 'hsla(' + hue + ',100%,70%,' + (0.4 + 0.6*((si%3)/3)) + ')';
    X.fillRect((si*73+11)%W, (si*43+7)%(H*0.72), si%3===0?3:2, si%3===0?3:2);
  }
  X.fillStyle = '#000'; X.fillRect(0,0,W,55); X.fillRect(0,H-55,W,55);

  if (csT < 100) {
    var bob = Math.sin(csT*0.12)*6;
    var gl  = 26 + Math.sin(csT*0.15)*10;
    drawRainbowGem(W/2, H/2 + bob, 24, 32, gl, csT*0.03, frame);
  }

  // Draw the chosen character
  if (hyperChar === 'shadow' || hyperChar === 'superShadow' || hyperChar === 'hyperShadow') {
    drawShadowChar(sonicX, H/2 + 18, 26, hyperChar !== 'shadow', sonicLeg, true);
  } else if (hyperChar === 'silver' || hyperChar === 'superSilver' || hyperChar === 'hyperSilver') {
    drawSilverChar(sonicX, H/2 + 18, 26, hyperChar !== 'silver', sonicLeg, true);
  } else if (hyperChar === 'hyperSonic') {
    drawHyperChar(sonicX, H/2 + 18, 26, 'sonic', sonicLeg, true, frame);
  } else if (hyperChar === 'hyperEm') {
    drawRainbowGem(sonicX + 20, H/2 + 18, 18, 24, 20, frame * 0.03, frame);
  } else if (hyperChar === 'super') {
    drawSonicChar(sonicX, H/2 + 18, 26, true, sonicLeg, true);
  } else {
    drawSonicChar(sonicX, H/2 + 18, 26, false, sonicLeg, true);
  }

  if (csT >= 96 && csT <= 106) {
    var fa = 1 - Math.abs(csT - 101)/5;
    X.fillStyle = 'rgba(255,255,255,' + (fa*0.85) + ')'; X.fillRect(0,0,W,H);
    if (csT === 101) {
      sfx.hyperEmerald();
      // Rainbow sparks
      for (var sp = 0; sp < 22; sp++) {
        var hueS = (sp * 50) % 360;
        spark(W/2, H/2, 'hsl(' + hueS + ',100%,60%)', 3);
      }
    }
  }
  tickParts();

  if (csT > 112) {
    var ta = Math.min(1, (csT-112)/20);
    X.globalAlpha = ta;
    txt('HYPER', W/2, H/2 - 55, 17, '#ff66ff');
    txt('EMERALD', W/2, H/2 - 25, 14, '#ff66ff');
    txt('OBTAINED!', W/2, H/2 + 10, 14, '#f5c518');
    drawRainbowGem(sonicX + 32, H/2 - 25, 12, 16, 14, csT*0.05, frame);
    X.globalAlpha = 1;
  }
  if (csT > 160 && frame % 50 < 25) txt('SPACE / TAP TO CONTINUE', W/2, H - 75, 7, '#aaa');
}

function drawSelect() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0,0,W,H);

  for (var si = 0; si < 80; si++) {
    X.globalAlpha = 0.3 + 0.7*(Math.sin(frame*0.06+si)*0.5+0.5);
    X.fillStyle = '#fff';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  txt('ALL EMERALDS', W/2, 62,  11, '#f5c518');
  txt('COLLECTED!',   W/2, 88,  11, '#f5c518');

  for (var ei = 0; ei < 7; ei++) {
    var ea = -Math.PI + (ei/6)*Math.PI + frame*0.01;
    drawGem(W/2+Math.cos(ea)*130, 180+Math.sin(ea)*38, 13,18, EM[ei].c, EM[ei].hi, EM[ei].sh, 16, ea*1.5);
  }

  txt('CHOOSE YOUR FORM', W/2, 272, 9, '#fff');

  var hl = (hoverBtn === 'sonic');
  rrect(BTN_L.x, BTN_L.y, BTN_L.w, BTN_L.h, 12);
  X.fillStyle = hl ? 'rgba(50,100,255,0.28)' : 'rgba(20,40,80,0.5)'; X.fill();
  X.strokeStyle = hl ? '#5588ff' : '#334488'; X.lineWidth = 3; X.stroke();
  drawSonicChar(BTN_L.x+BTN_L.w/2, BTN_L.y+72, 25, false, Math.sin(frame*0.1)*0.5, true);
  txt('SONIC',  BTN_L.x+BTN_L.w/2, BTN_L.y+118, 9, '#5588ff');
  txt('Normal', BTN_L.x+BTN_L.w/2, BTN_L.y+137, 6, '#888');

  var hl2 = (hoverBtn === 'super');
  rrect(BTN_R.x, BTN_R.y, BTN_R.w, BTN_R.h, 12);
  X.fillStyle = hl2 ? 'rgba(255,200,0,0.25)' : 'rgba(80,60,0,0.4)'; X.fill();
  X.strokeStyle = hl2 ? '#ffd84a' : '#664400'; X.lineWidth = 3; X.stroke();
  drawSonicChar(BTN_R.x+BTN_R.w/2, BTN_R.y+68, 25, true, Math.sin(frame*0.1)*0.5, true);
  txt('SUPER',       BTN_R.x+BTN_R.w/2, BTN_R.y+112, 8, '#f5c518');
  txt('SONIC',       BTN_R.x+BTN_R.w/2, BTN_R.y+130, 8, '#f5c518');
  txt('INVINCIBLE!', BTN_R.x+BTN_R.w/2, BTN_R.y+144, 6, '#ffaa00');

  txt('Click a form to play', W/2, 508, 7, '#aaa');
}

// Shadow select — after Shadow's Revival campaign
function drawShadowSelect() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0,0,W,H);

  for (var si = 0; si < 80; si++) {
    X.globalAlpha = 0.3 + 0.7*(Math.sin(frame*0.06+si)*0.5+0.5);
    X.fillStyle = '#ff3333';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  txt('ALL EMERALDS', W/2, 62, 11, '#cc0000');
  txt('RECLAIMED!',   W/2, 88, 11, '#cc0000');

  for (var ei = 0; ei < 7; ei++) {
    var ea = -Math.PI + (ei/6)*Math.PI + frame*0.01;
    drawGem(W/2+Math.cos(ea)*130, 180+Math.sin(ea)*38, 13,18, EM[ei].c, EM[ei].hi, EM[ei].sh, 16, ea*1.5);
  }

  txt('CHOOSE YOUR FORM', W/2, 272, 9, '#fff');

  var hl = (hoverBtn === 'sonic');
  rrect(BTN_L.x, BTN_L.y, BTN_L.w, BTN_L.h, 12);
  X.fillStyle = hl ? 'rgba(100,20,20,0.4)' : 'rgba(40,10,10,0.5)'; X.fill();
  X.strokeStyle = hl ? '#ff4444' : '#442222'; X.lineWidth = 3; X.stroke();
  drawShadowChar(BTN_L.x+BTN_L.w/2, BTN_L.y+72, 25, false, Math.sin(frame*0.1)*0.5, true);
  txt('SHADOW',  BTN_L.x+BTN_L.w/2, BTN_L.y+118, 9, '#cc0000');
  txt('Normal',  BTN_L.x+BTN_L.w/2, BTN_L.y+137, 6, '#888');

  var hl2 = (hoverBtn === 'super');
  rrect(BTN_R.x, BTN_R.y, BTN_R.w, BTN_R.h, 12);
  X.fillStyle = hl2 ? 'rgba(255,200,0,0.25)' : 'rgba(80,60,0,0.4)'; X.fill();
  X.strokeStyle = hl2 ? '#ffd84a' : '#664400'; X.lineWidth = 3; X.stroke();
  drawShadowChar(BTN_R.x+BTN_R.w/2, BTN_R.y+68, 25, true, Math.sin(frame*0.1)*0.5, true);
  txt('SUPER',       BTN_R.x+BTN_R.w/2, BTN_R.y+112, 8, '#f5c518');
  txt('SHADOW',      BTN_R.x+BTN_R.w/2, BTN_R.y+130, 8, '#f5c518');
  txt('INVINCIBLE!', BTN_R.x+BTN_R.w/2, BTN_R.y+144, 6, '#ffaa00');

  txt('Click a form to play', W/2, 508, 7, '#aaa');
}

// Hyper Emerald character select — only Sonic or Shadow (+ supers if cheat on)
function drawHyperSelect() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0,0,W,H);

  // Rainbow stars
  for (var si = 0; si < 80; si++) {
    var hue = ((si * 37 + frame * 2) % 360);
    X.globalAlpha = 0.3 + 0.6*(Math.sin(frame*0.06+si)*0.5+0.5);
    X.fillStyle = 'hsl(' + hue + ',100%,65%)';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  txt('THE HYPER', W/2, 62, 14, '#ff66ff');
  txt('EMERALD',   W/2, 92, 14, '#ff66ff');

  drawRainbowGem(W/2, 165, 18, 24, 20, frame*0.03, frame);

  txt('CHOOSE YOUR HERO', W/2, 272, 9, '#fff');

  // Build character list: always Sonic + Shadow, plus anything in hyperAllowed
  var allHyperChars = {
    sonic:       { label:'SONIC', sub:'Normal', drawFn:function(cx,cy){ drawSonicChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#5588ff', bg:'rgba(20,40,80,0.5)', bgH:'rgba(50,100,255,0.28)', bdr:'#334488', bdrH:'#5588ff' },
    shadow:      { label:'SHADOW', sub:'Normal', drawFn:function(cx,cy){ drawShadowChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#cc0000', bg:'rgba(40,10,10,0.5)', bgH:'rgba(100,20,20,0.4)', bdr:'#442222', bdrH:'#ff4444' },
    silver:      { label:'SILVER', sub:'Normal', drawFn:function(cx,cy){ drawSilverChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#00ced1', bg:'rgba(0,30,30,0.5)', bgH:'rgba(0,60,60,0.4)', bdr:'#004444', bdrH:'#00ced1' },
    super:       { label:'SUPER SONIC', sub:'Invincible!', drawFn:function(cx,cy){ drawSonicChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#f5c518', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' },
    superShadow: { label:'SUPER SHADOW', sub:'Invincible!', drawFn:function(cx,cy){ drawShadowChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#f5c518', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' },
    superSilver: { label:'SUPER SILVER', sub:'Invincible!', drawFn:function(cx,cy){ drawSilverChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#ffd700', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' },
    hyperSonic:  { label:'HYPER SONIC', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'sonic',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' },
    hyperShadow: { label:'HYPER SHADOW', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'shadow',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' },
    hyperSilver: { label:'HYPER SILVER', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'silver',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' },
    em0:            { label:EM[0].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[0].c,EM[0].hi,EM[0].sh,12,frame*0.03); }, col:EM[0].c, bg:'rgba(40,10,10,0.5)', bgH:'rgba(80,20,20,0.4)', bdr:'#442222', bdrH:EM[0].c },
    em1:            { label:EM[1].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[1].c,EM[1].hi,EM[1].sh,12,frame*0.03); }, col:EM[1].c, bg:'rgba(10,20,40,0.5)', bgH:'rgba(20,40,80,0.4)', bdr:'#222244', bdrH:EM[1].c },
    em2:            { label:EM[2].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[2].c,EM[2].hi,EM[2].sh,12,frame*0.03); }, col:EM[2].c, bg:'rgba(40,40,0,0.5)', bgH:'rgba(80,80,0,0.4)', bdr:'#444400', bdrH:EM[2].c },
    em3:            { label:EM[3].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[3].c,EM[3].hi,EM[3].sh,12,frame*0.03); }, col:EM[3].c, bg:'rgba(30,10,40,0.5)', bgH:'rgba(60,20,80,0.4)', bdr:'#442244', bdrH:EM[3].c },
    em4:            { label:EM[4].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[4].c,EM[4].hi,EM[4].sh,12,frame*0.03); }, col:EM[4].c, bg:'rgba(10,40,10,0.5)', bgH:'rgba(20,80,20,0.4)', bdr:'#224422', bdrH:EM[4].c },
    em5:            { label:EM[5].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[5].c,EM[5].hi,EM[5].sh,12,frame*0.03); }, col:EM[5].c, bg:'rgba(0,30,40,0.5)', bgH:'rgba(0,60,80,0.4)', bdr:'#114455', bdrH:EM[5].c },
    em6:            { label:EM[6].name.toUpperCase(), sub:'Emerald', drawFn:function(cx,cy){ drawGem(cx,cy,14,18,EM[6].c,EM[6].hi,EM[6].sh,12,frame*0.03); }, col:EM[6].c, bg:'rgba(30,30,40,0.5)', bgH:'rgba(60,60,80,0.4)', bdr:'#444455', bdrH:EM[6].c },
    knuckles:       { label:'KNUCKLES', sub:'Charge: M', drawFn:function(cx,cy){ drawKnucklesChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#cc2200', bg:'rgba(40,10,0,0.5)', bgH:'rgba(100,30,0,0.4)', bdr:'#442200', bdrH:'#ff4400' },
    superKnuckles:  { label:'SUPER KNUCKLES', sub:'Invincible!', drawFn:function(cx,cy){ drawKnucklesChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#ff69b4', bg:'rgba(80,20,40,0.4)', bgH:'rgba(255,100,180,0.25)', bdr:'#662244', bdrH:'#ff69b4' },
    hyperKnuckles:  { label:'HYPER KNUCKLES', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'knuckles',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' },
    hyperEm:        { label:'HYPER EMERALD', sub:'Invincible!', drawFn:function(cx,cy){ drawRainbowGem(cx,cy,12,16,12,frame*0.03,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' }
  };

  // Always show Sonic + Shadow (+ Silver if unlocked), plus admin extras
  var hsChars = [];
  var defaults = ['sonic','shadow'];
  if (isCharAvail('silver')) defaults.push('silver');
  for (var di = 0; di < defaults.length; di++) hsChars.push({ mode:defaults[di], data:allHyperChars[defaults[di]] });
  var extraKeys = Object.keys(hyperAllowed);
  for (var ei = 0; ei < extraKeys.length; ei++) {
    var ek = extraKeys[ei];
    if (defaults.indexOf(ek) === -1 && allHyperChars[ek]) {
      hsChars.push({ mode:ek, data:allHyperChars[ek] });
    }
  }

  if (hsChars.length <= 2) {
    // Two buttons layout
    var hl = (hoverBtn === 'sonic');
    rrect(BTN_L.x, BTN_L.y, BTN_L.w, BTN_L.h, 12);
    X.fillStyle = hl ? 'rgba(50,100,255,0.28)' : 'rgba(20,40,80,0.5)'; X.fill();
    X.strokeStyle = hl ? '#5588ff' : '#334488'; X.lineWidth = 3; X.stroke();
    drawSonicChar(BTN_L.x+BTN_L.w/2, BTN_L.y+72, 25, false, Math.sin(frame*0.1)*0.5, true);
    txt('SONIC', BTN_L.x+BTN_L.w/2, BTN_L.y+118, 9, '#5588ff');

    var hl2 = (hoverBtn === 'super');
    rrect(BTN_R.x, BTN_R.y, BTN_R.w, BTN_R.h, 12);
    X.fillStyle = hl2 ? 'rgba(100,20,20,0.4)' : 'rgba(40,10,10,0.5)'; X.fill();
    X.strokeStyle = hl2 ? '#ff4444' : '#442222'; X.lineWidth = 3; X.stroke();
    drawShadowChar(BTN_R.x+BTN_R.w/2, BTN_R.y+72, 25, false, Math.sin(frame*0.1)*0.5, true);
    txt('SHADOW', BTN_R.x+BTN_R.w/2, BTN_R.y+118, 9, '#cc0000');
  } else {
    // Card grid for all allowed characters
    var hsGap = 10, hsRcw = 90, hsRch = 85;
    var hsCurY = 290;
    HYPER_SEL_CARDS = [];
    var hsCols = Math.min(hsChars.length, 4);
    for (var hi = 0; hi < hsChars.length; hi++) {
      var hc = hsChars[hi];
      var c = hc.data;
      var hRow = Math.floor(hi / hsCols);
      var hCol = hi % hsCols;
      var hRowCount = Math.min(hsCols, hsChars.length - hRow * hsCols);
      var rowX = (W - hRowCount*hsRcw - (hRowCount-1)*hsGap) / 2;
      var rx = rowX + hCol*(hsRcw+hsGap);
      var ry = 290 + hRow*(hsRch+hsGap);
      HYPER_SEL_CARDS.push({ x:rx, y:ry, w:hsRcw, h:hsRch, mode:hc.mode });
      var hl = (selHover === HYPER_SEL_CARDS.length-1);
      rrect(rx, ry, hsRcw, hsRch, 8);
      X.fillStyle = hl ? c.bgH : c.bg; X.fill();
      X.strokeStyle = hl ? c.bdrH : c.bdr; X.lineWidth = 2; X.stroke();
      c.drawFn(rx+hsRcw/2, ry+32);
      txt(c.label, rx+hsRcw/2, ry+60, 5, c.col);
      if (c.sub) txt(c.sub, rx+hsRcw/2, ry+73, 4, '#888');
    }
  }

  txt(HYPER_LV.need + ' pipes. No skipping.', W/2, 508, 6, '#ff66ff');
}

function drawFPSelect() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0,0,W,H);

  for (var si = 0; si < 80; si++) {
    X.globalAlpha = 0.3 + 0.7*(Math.sin(frame*0.06+si)*0.5+0.5);
    X.fillStyle = '#fff';
    X.fillRect((si*73+11)%W, (si*43+7)%H, 2, 2);
  }
  X.globalAlpha = 1;

  txt(fpForInfinity ? 'CHARACTER SELECT' : 'FREE PLAY', W/2, 40, 14, fpForInfinity ? '#f5c518' : '#aa22aa');
  txt('CHOOSE CHARACTER', W/2, 65, 7, '#fff');

  var gap = 10;
  var topY = 85;
  FP_CARDS = [];

  // Row 1: 4 emeralds
  var cw = 80, ch = 75;
  var row1X = (W - 4*cw - 3*gap) / 2;
  for (var i = 0; i < 4; i++) {
    var rx = row1X + i*(cw+gap);
    FP_CARDS.push({ x:rx, y:topY, w:cw, h:ch });
    var hl = (fpHover === FP_CARDS.length-1);
    rrect(rx, topY, cw, ch, 8);
    X.fillStyle = hl ? 'rgba(255,255,255,0.15)' : 'rgba(30,30,60,0.6)'; X.fill();
    X.strokeStyle = hl ? EM[i].c : '#334'; X.lineWidth = 2; X.stroke();
    drawGem(rx+cw/2, topY+30, 12, 16, EM[i].c, EM[i].hi, EM[i].sh, 12, frame*0.03+i);
    txt(EM[i].name, rx+cw/2, topY+58, 5, EM[i].c);
  }

  // Row 2: 3 emeralds
  var row2Y = topY + ch + gap;
  var row2X = (W - 3*cw - 2*gap) / 2;
  for (var i = 4; i < 7; i++) {
    var col = i - 4;
    var rx = row2X + col*(cw+gap);
    FP_CARDS.push({ x:rx, y:row2Y, w:cw, h:ch });
    var hl = (fpHover === FP_CARDS.length-1);
    rrect(rx, row2Y, cw, ch, 8);
    X.fillStyle = hl ? 'rgba(255,255,255,0.15)' : 'rgba(30,30,60,0.6)'; X.fill();
    X.strokeStyle = hl ? EM[i].c : '#334'; X.lineWidth = 2; X.stroke();
    drawGem(rx+cw/2, row2Y+30, 12, 16, EM[i].c, EM[i].hi, EM[i].sh, 12, frame*0.03+i);
    txt(EM[i].name, rx+cw/2, row2Y+58, 5, EM[i].c);
  }

  // Helper to draw a character row
  var curY = row2Y + ch + gap + 5;
  var rcw = 90, rch = 85;
  function drawCharRow(cards) {
    var rowX = (W - cards.length*rcw - (cards.length-1)*gap) / 2;
    for (var ci = 0; ci < cards.length; ci++) {
      var c = cards[ci];
      var rx = rowX + ci*(rcw+gap);
      FP_CARDS.push({ x:rx, y:curY, w:rcw, h:rch });
      var hl = (fpHover === FP_CARDS.length-1);
      rrect(rx, curY, rcw, rch, 8);
      X.fillStyle = hl ? c.bgH : c.bg; X.fill();
      X.strokeStyle = hl ? c.bdrH : c.bdr; X.lineWidth = 2; X.stroke();
      c.drawFn(rx+rcw/2, curY+32);
      txt(c.label, rx+rcw/2, curY+60, 5, c.col);
      if (c.sub) txt(c.sub, rx+rcw/2, curY+73, 4, '#888');
    }
    curY += rch + gap;
  }

  // Row 3: Regular forms — Sonic, Shadow (if unlocked), Silver (if unlocked)
  var normRow = [
    { label:'SONIC', sub:'Normal', drawFn:function(cx,cy){ drawSonicChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#5588ff', bg:'rgba(20,40,80,0.5)', bgH:'rgba(50,100,255,0.28)', bdr:'#334488', bdrH:'#5588ff' }
  ];
  if (isCharAvail('shadow')) normRow.push({ label:'SHADOW', sub:'Normal', drawFn:function(cx,cy){ drawShadowChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#cc0000', bg:'rgba(40,10,10,0.5)', bgH:'rgba(100,20,20,0.4)', bdr:'#442222', bdrH:'#ff4444' });
  if (isCharAvail('silver')) normRow.push({ label:'SILVER', sub:'Normal', drawFn:function(cx,cy){ drawSilverChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#00ced1', bg:'rgba(0,30,30,0.5)', bgH:'rgba(0,60,60,0.4)', bdr:'#004444', bdrH:'#00ced1' });
  if (isCharAvail('knuckles')) normRow.push({ label:'KNUCKLES', sub:'Charge: M', drawFn:function(cx,cy){ drawKnucklesChar(cx,cy,16,false,Math.sin(frame*0.1)*0.5,true); }, col:'#cc2200', bg:'rgba(40,10,0,0.5)', bgH:'rgba(100,30,0,0.4)', bdr:'#442200', bdrH:'#ff4400' });
  drawCharRow(normRow);

  // Row 4: Super forms
  var superRow = [];
  if (isCharAvail('super')) superRow.push({ label:'SUPER SONIC', sub:'Invincible!', drawFn:function(cx,cy){ drawSonicChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#f5c518', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' });
  if (isCharAvail('superShadow')) superRow.push({ label:'SUPER SHADOW', sub:'Invincible!', drawFn:function(cx,cy){ drawShadowChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#f5c518', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' });
  if (isCharAvail('superSilver')) superRow.push({ label:'SUPER SILVER', sub:'Invincible!', drawFn:function(cx,cy){ drawSilverChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#ffd700', bg:'rgba(80,60,0,0.4)', bgH:'rgba(255,200,0,0.25)', bdr:'#664400', bdrH:'#ffd84a' });
  if (isCharAvail('superKnuckles')) superRow.push({ label:'SUPER KNUCKLES', sub:'Invincible!', drawFn:function(cx,cy){ drawKnucklesChar(cx,cy,16,true,Math.sin(frame*0.1)*0.5,true); }, col:'#ff69b4', bg:'rgba(80,20,40,0.4)', bgH:'rgba(255,100,180,0.25)', bdr:'#662244', bdrH:'#ff69b4' });
  if (superRow.length > 0) drawCharRow(superRow);

  // Row 5: Hyper forms (only individually unlocked ones)
  var hyperRow = [];
  if (isCharAvail('hyperSonic'))  hyperRow.push({ label:'HYPER SONIC', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'sonic',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' });
  if (isCharAvail('hyperShadow')) hyperRow.push({ label:'HYPER SHADOW', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'shadow',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' });
  if (isCharAvail('hyperSilver')) hyperRow.push({ label:'HYPER SILVER', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'silver',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' });
  if (isCharAvail('hyperKnuckles')) hyperRow.push({ label:'HYPER KNUCKLES', sub:'Invincible!', drawFn:function(cx,cy){ drawHyperChar(cx,cy,16,'knuckles',Math.sin(frame*0.1)*0.5,true,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' });
  if (isCharAvail('hyperEm'))     hyperRow.push({ label:'HYPER EMERALD', sub:'Invincible!', drawFn:function(cx,cy){ drawRainbowGem(cx,cy,12,16,12,frame*0.03,frame); }, col:'#ff66ff', bg:'rgba(30,10,40,0.5)', bgH:'hsla(300,60%,20%,0.5)', bdr:'#442244', bdrH:'#ff66ff' });
  if (hyperRow.length > 0) drawCharRow(hyperRow);
}

function drawWin() {
  frame++;
  X.fillStyle = '#050510'; X.fillRect(0,0,W,H);

  for (var ci = 0; ci < 120; ci++) {
    X.fillStyle = 'hsl(' + ((ci*51+frame*3)%360) + ',100%,65%)';
    var ct = (frame*0.025 + ci*0.628) % (Math.PI*2);
    X.fillRect(W/2+Math.cos(ct)*(55+ci%4*22), H/2+Math.sin(ct*1.8)*110-120+(ci%3)*22, 3, 3);
  }

  for (var wi = 0; wi < 7; wi++) {
    var wa = (wi/7)*Math.PI*2 + frame*0.022;
    drawGem(W/2+Math.cos(wa)*92, H/2-92+Math.sin(wa)*35, 12,17, EM[wi].c, EM[wi].hi, EM[wi].sh, 13, wa);
  }

  var isShadowMode = (mode === 'shadow' || mode === 'superShadow' || mode === 'hyperShadow');
  var isSilverMode = (mode === 'silver' || mode === 'superSilver' || mode === 'hyperSilver');
  var isKnuxMode = (mode === 'knuckles' || mode === 'superKnuckles' || mode === 'hyperKnuckles');
  var isEmeraldMode = (mode === 'em');
  var isHyperEm = (mode === 'hyperEm');
  var isHyper = (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles' || mode === 'hyperEm');
  var isSuper = (mode === 'super' || mode === 'superShadow' || mode === 'superSilver' || mode === 'superKnuckles');

  if (isHyperEm) {
    drawRainbowGem(W/2, H/2+18, 24, 32, 28, frame*0.03, frame);
  } else if (isHyper) {
    var hcT = mode === 'hyperShadow' ? 'shadow' : mode === 'hyperSilver' ? 'silver' : mode === 'hyperKnuckles' ? 'knuckles' : 'sonic';
    drawHyperChar(W/2, H/2+18, 32, hcT, Math.sin(frame*0.15)*1.5, true, frame);
  } else if (isKnuxMode) {
    drawKnucklesChar(W/2, H/2+18, 32, mode==='superKnuckles', Math.sin(frame*0.15)*1.5, true);
  } else if (isEmeraldMode) {
    var we = EM[Math.min(lv, 6)];
    drawGem(W/2, H/2+18, 24, 32, we.c, we.hi, we.sh, 28, frame*0.03);
  } else if (isSilverMode) {
    drawSilverChar(W/2, H/2+18, 32, mode==='superSilver', Math.sin(frame*0.15)*1.5, true);
  } else if (isShadowMode) {
    drawShadowChar(W/2, H/2+18, 32, mode==='superShadow', Math.sin(frame*0.15)*1.5, true);
  } else {
    drawSonicChar(W/2, H/2+18, 32, mode==='super', Math.sin(frame*0.15)*1.5, true);
  }

  var charName = isHyperEm ? 'HYPER EMERALD'
               : isEmeraldMode ? EM[Math.min(lv, 6)].name.toUpperCase() + ' EMERALD'
               : isKnuxMode ? 'KNUCKLES' : isSilverMode ? 'SILVER' : isShadowMode ? 'SHADOW' : 'SONIC';
  var prefix = isHyper && !isHyperEm ? 'HYPER ' : isSuper ? 'SUPER ' : '';
  var wt = (isSuper || isHyper) ? 'PERFECT!' : 'AMAZING!';
  var wc = (isHyper || isHyperEm) ? '#ff66ff'
         : isEmeraldMode ? EM[Math.min(lv, 6)].c
         : isSuper ? '#f5c518' : isKnuxMode ? '#cc2200' : isSilverMode ? '#00ced1' : isShadowMode ? '#cc0000' : '#5588ff';
  txt(wt, W/2, H/2+85, 17, wc);
  txt(prefix + charName + ' WINS!', W/2, H/2+118, 9, '#fff');
  if (frame%60<30) txt('SPACE / TAP TO PLAY AGAIN', W/2, H/2+192, 7, '#aaa');
}
