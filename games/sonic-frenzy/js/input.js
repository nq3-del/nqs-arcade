// ═══════════════════════════════════════════════════════
// INPUT
// Called via initInput() from main.js after C is defined.
// ═══════════════════════════════════════════════════════
function canvasPos(clientX, clientY) {
  var r = C.getBoundingClientRect();
  return { x:(clientX-r.left)*(W/r.width), y:(clientY-r.top)*(H/r.height) };
}

function inBtn(btn, x, y) {
  return x >= btn.x && x <= btn.x+btn.w && y >= btn.y && y <= btn.y+btn.h;
}

function handlePauseClick(p) {
  if (inBtn(GEAR_BTN, p.x, p.y)) {
    paused = !paused;
    return true;
  }
  if (!paused) return false;

  if (inBtn(PAUSE_BTNS.cont, p.x, p.y)) {
    paused = false;
    return true;
  }

  // Skip level — blocked during shadow campaign and hyper challenge
  if (inBtn(PAUSE_BTNS.skipLevel, p.x, p.y) && !hyperChallenge && !shadowCampaign) {
    paused = false;
    if (hyperChallenge) {
      hyperBeaten = true;
      hyperChallenge = false;
      S = 'hyperCutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
    } else if (freePlay) {
      freePlay = false; initLevel(lv);
    } else if (shadowCampaign && S === 'playing') {
      sfx.clear();
      if (shadowLv >= 6) {
        shadowAllEmeralds = true;
        shadowBeaten = true;
        S = 'shadowSelect'; frame = 0;
      } else {
        initShadowLevel(shadowLv + 1);
      }
    } else if (shadowCampaign && S === 'infinity') {
      S = 'win'; hasBeatenGame = true; shadowBeaten = true;
    } else if (S === 'playing') {
      sfx.clear();
      if (lv >= 6) { S = 'select'; frame = 0; allEmeralds = true; }
      else initLevel(lv + 1);
    } else if (S === 'infinity') {
      S = 'win'; hasBeatenGame = true;
    }
    return true;
  }

  if (inBtn(PAUSE_BTNS.switchChar, p.x, p.y) && (allEmeralds || adminChars.changeChar)) {
    paused = false;
    shadowCampaign = false;
    hyperChallenge = false;
    fpForInfinity = true;
    initFreePlay();
    return true;
  }

  if (inBtn(PAUSE_BTNS.freePlay, p.x, p.y) && (allEmeralds || adminChars.freePlayBtn)) {
    paused = false;
    shadowCampaign = false;
    hyperChallenge = false;
    fpForInfinity = false;
    initFreePlay();
    return true;
  }

  // Shadow's Revival button — available after beating main game
  if (inBtn(PAUSE_BTNS.shadowRevival, p.x, p.y) && (allEmeralds || adminChars.shadowRevival)) {
    paused = false;
    freePlay = false;
    hyperChallenge = false;
    initShadowLevel(0);
    return true;
  }

  // Hyper Emerald button — available after Shadow + Super Shadow unlocked
  if (inBtn(PAUSE_BTNS.hyperEmerald, p.x, p.y) && (shadowBeaten || adminChars.hyperAccess)) {
    paused = false;
    freePlay = false;
    shadowCampaign = false;
    S = 'hyperSelect'; frame = 0; hoverBtn = null;
    return true;
  }

  // Save / Load button
  if (inBtn(PAUSE_SAVE, p.x, p.y)) {
    paused = false;
    saveState = 'menu'; saveMessage = '';
    return true;
  }

  // Character Codes button (only after Super Sonic unlocked)
  if ((allEmeralds || adminChars.codesBtn) && inBtn(PAUSE_CODES, p.x, p.y)) {
    paused = false;
    codesState = 'entering'; codesInput = ''; codesLog = '';
    return true;
  }

  // Admin button
  if (inBtn(PAUSE_ADMIN, p.x, p.y)) {
    paused = false;
    adminState = 'password'; adminInput = '';
    return true;
  }

  return true; // absorb click on overlay
}

function initInput() {
  document.addEventListener('keydown', function(e) {
    // Admin password screen
    if (adminState === 'password') {
      e.preventDefault();
      if (e.code === 'Escape') { adminState = 'none'; adminInput = ''; paused = true; return; }
      if (e.code === 'Enter') {
        if (adminInput === ADMIN_CODE) {
          adminState = 'console'; adminInput = ''; adminLog = [];
          adminLog.push('Access granted. Type "help" for commands.');
        } else {
          adminInput = '';
        }
        return;
      }
      if (e.code === 'Backspace') { adminInput = adminInput.slice(0, -1); return; }
      if (e.key.length === 1 && adminInput.length < 10) { adminInput += e.key; }
      return;
    }

    // Save/load screen
    if (saveState === 'menu') {
      if (e.code === 'Escape') {
        e.preventDefault();
        saveState = 'none'; paused = true; return;
      }
    }

    // Code reveal screen
    if (codeRevealState === 'showing') {
      e.preventDefault();
      codeRevealState = 'none';
      return;
    }

    // Character codes screen
    if (codesState === 'entering') {
      e.preventDefault();
      if (e.code === 'Escape') { codesState = 'none'; codesInput = ''; codesLog = ''; paused = true; return; }
      if (e.code === 'Enter') {
        if (CHAR_CODES[codesInput]) {
          unlockedCodes[codesInput] = true;
          codesLog = CHAR_CODES[codesInput].msg;
        } else {
          codesLog = 'Invalid code.';
        }
        codesInput = '';
        return;
      }
      if (e.code === 'Backspace') { codesInput = codesInput.slice(0, -1); return; }
      if (e.key >= '0' && e.key <= '9' && codesInput.length < 5) { codesInput += e.key; }
      return;
    }

    // Admin console screen
    if (adminState === 'console') {
      e.preventDefault();
      if (e.code === 'Escape') { adminState = 'none'; adminInput = ''; paused = true; return; }
      if (e.code === 'Enter') {
        processAdminCommand(adminInput);
        adminInput = '';
        return;
      }
      if (e.code === 'Backspace') { adminInput = adminInput.slice(0, -1); return; }
      if (e.key.length === 1 && adminInput.length < 40) { adminInput += e.key; }
      return;
    }

    if ((e.code === 'Escape' || e.code === 'KeyP') && (S === 'playing' || S === 'infinity')) {
      e.preventDefault(); paused = !paused; return;
    }
    if (e.code === 'KeyM' && (S === 'playing' || S === 'infinity') && !paused) {
      e.preventDefault(); startCharge(); return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doJump(); }
  });

  C.addEventListener('mousemove', function(e) {
    var p = canvasPos(e.clientX, e.clientY);

    if (S === 'fpselect') {
      fpHover = -1;
      for (var fi = 0; fi < FP_CARDS.length; fi++) {
        if (inBtn(FP_CARDS[fi], p.x, p.y)) { fpHover = fi; break; }
      }
      C.style.cursor = fpHover >= 0 ? 'pointer' : 'default';
      return;
    }

    if (S === 'shadowSelect') {
      hoverBtn = inBtn(BTN_L,p.x,p.y) ? 'sonic' : inBtn(BTN_R,p.x,p.y) ? 'super' : null;
      C.style.cursor = hoverBtn ? 'pointer' : 'default';
      return;
    }

    if (S === 'hyperSelect') {
      if (HYPER_SEL_CARDS.length > 0) {
        selHover = -1;
        for (var hi = 0; hi < HYPER_SEL_CARDS.length; hi++) {
          if (inBtn(HYPER_SEL_CARDS[hi], p.x, p.y)) { selHover = hi; break; }
        }
        C.style.cursor = selHover >= 0 ? 'pointer' : 'default';
      } else {
        hoverBtn = inBtn(BTN_L,p.x,p.y) ? 'sonic' : inBtn(BTN_R,p.x,p.y) ? 'super' : null;
        C.style.cursor = hoverBtn ? 'pointer' : 'default';
      }
      return;
    }

    if (S === 'select') {
      hoverBtn = inBtn(BTN_L,p.x,p.y) ? 'sonic' : inBtn(BTN_R,p.x,p.y) ? 'super' : null;
      C.style.cursor = hoverBtn ? 'pointer' : 'default';
      return;
    }
    hoverBtn = null; C.style.cursor = 'default';
  });

  C.addEventListener('click', function(e) {
    resumeAC();
    var p = canvasPos(e.clientX, e.clientY);

    if (codeRevealState === 'showing') { codeRevealState = 'none'; return; }

    if (saveState === 'confirmOverwrite') {
      if (inBtn(SAVE_YES, p.x, p.y)) { saveProgress(); saveState = 'menu'; return; }
      if (inBtn(SAVE_NO, p.x, p.y)) { saveState = 'menu'; saveMessage = 'Save cancelled.'; return; }
      return;
    }
    if (saveState === 'confirmDelete') {
      if (inBtn(SAVE_YES, p.x, p.y)) { deleteSaveFile(); saveState = 'menu'; return; }
      if (inBtn(SAVE_NO, p.x, p.y)) { saveState = 'menu'; saveMessage = 'Delete cancelled.'; return; }
      return;
    }
    if (saveState === 'menu') {
      if (inBtn(SAVE_BTN, p.x, p.y)) {
        if (hasSaveFile()) { saveState = 'confirmOverwrite'; }
        else { saveProgress(); }
        return;
      }
      if (inBtn(LOAD_BTN, p.x, p.y)) { loadProgress(); return; }
      if (inBtn(DELETE_BTN, p.x, p.y)) {
        if (hasSaveFile()) { saveState = 'confirmDelete'; }
        else { saveMessage = 'No save file to delete.'; }
        return;
      }
      if (inBtn(SAVE_BACK, p.x, p.y)) { saveState = 'none'; paused = true; return; }
      return;
    }

    if ((S === 'playing' || S === 'infinity') && handlePauseClick(p)) return;

    if (S === 'dead' && freePlay && inBtn(RETRY_BTN, p.x, p.y)) {
      retryFreePlay();
      return;
    }

    if (S === 'fpselect') {
      for (var fi = 0; fi < FP_CARDS.length; fi++) {
        if (inBtn(FP_CARDS[fi], p.x, p.y)) {
          if (fpForInfinity) {
            freePlay = false;
            var fp = fpModeForIndex(fi);
            var m = fp.m;
            lv = fp.l;
            if (m === 'super' || m === 'superShadow' || m === 'superSilver') sfx.transform();
            if (m === 'hyperSonic' || m === 'hyperShadow' || m === 'hyperSilver' || m === 'hyperEm') sfx.hyperTransform();
            initInfinity(m);
          } else { startFreePlay(fi); }
          return;
        }
      }
      return;
    }

    if (S === 'select') {
      if (inBtn(BTN_L, p.x, p.y)) initInfinity('sonic');
      else if (inBtn(BTN_R, p.x, p.y)) { sfx.transform(); initInfinity('super'); }
      return;
    }

    // Shadow select — Shadow or Super Shadow for infinity
    if (S === 'shadowSelect') {
      if (inBtn(BTN_L, p.x, p.y)) { shadowCampaign = true; initInfinity('shadow'); }
      else if (inBtn(BTN_R, p.x, p.y)) { shadowCampaign = true; sfx.transform(); initInfinity('superShadow'); }
      return;
    }

    // Hyper select — Sonic or Shadow (+ supers if cheat on)
    if (S === 'hyperSelect') {
      if (HYPER_SEL_CARDS.length > 0) {
        for (var hi = 0; hi < HYPER_SEL_CARDS.length; hi++) {
          if (inBtn(HYPER_SEL_CARDS[hi], p.x, p.y)) {
            initHyperLevel(HYPER_SEL_CARDS[hi].mode);
            return;
          }
        }
      } else {
        if (inBtn(BTN_L, p.x, p.y)) initHyperLevel('sonic');
        else if (inBtn(BTN_R, p.x, p.y)) initHyperLevel('shadow');
      }
      return;
    }

    doJump();
  });

  C.addEventListener('touchstart', function(e) {
    e.preventDefault(); resumeAC();
    var p = canvasPos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (codeRevealState === 'showing') { codeRevealState = 'none'; return; }
    if (saveState === 'confirmOverwrite') {
      if (inBtn(SAVE_YES, p.x, p.y)) { saveProgress(); saveState = 'menu'; return; }
      if (inBtn(SAVE_NO, p.x, p.y)) { saveState = 'menu'; saveMessage = 'Save cancelled.'; return; }
      return;
    }
    if (saveState === 'confirmDelete') {
      if (inBtn(SAVE_YES, p.x, p.y)) { deleteSaveFile(); saveState = 'menu'; return; }
      if (inBtn(SAVE_NO, p.x, p.y)) { saveState = 'menu'; saveMessage = 'Delete cancelled.'; return; }
      return;
    }
    if (saveState === 'menu') {
      if (inBtn(SAVE_BTN, p.x, p.y)) {
        if (hasSaveFile()) { saveState = 'confirmOverwrite'; }
        else { saveProgress(); }
        return;
      }
      if (inBtn(LOAD_BTN, p.x, p.y)) { loadProgress(); return; }
      if (inBtn(DELETE_BTN, p.x, p.y)) {
        if (hasSaveFile()) { saveState = 'confirmDelete'; }
        else { saveMessage = 'No save file to delete.'; }
        return;
      }
      if (inBtn(SAVE_BACK, p.x, p.y)) { saveState = 'none'; paused = true; return; }
      return;
    }
    if ((S === 'playing' || S === 'infinity') && handlePauseClick(p)) return;
    if (S === 'dead' && freePlay && inBtn(RETRY_BTN, p.x, p.y)) { retryFreePlay(); return; }

    if (S === 'fpselect') {
      for (var fi = 0; fi < FP_CARDS.length; fi++) {
        if (inBtn(FP_CARDS[fi], p.x, p.y)) {
          if (fpForInfinity) {
            freePlay = false;
            var fp = fpModeForIndex(fi);
            var m = fp.m;
            lv = fp.l;
            if (m === 'super' || m === 'superShadow' || m === 'superSilver') sfx.transform();
            if (m === 'hyperSonic' || m === 'hyperShadow' || m === 'hyperSilver' || m === 'hyperEm') sfx.hyperTransform();
            initInfinity(m);
          } else { startFreePlay(fi); }
          return;
        }
      }
      return;
    }

    if (S === 'select') {
      if (inBtn(BTN_L, p.x, p.y)) initInfinity('sonic');
      else if (inBtn(BTN_R, p.x, p.y)) { sfx.transform(); initInfinity('super'); }
      return;
    }

    if (S === 'shadowSelect') {
      if (inBtn(BTN_L, p.x, p.y)) { shadowCampaign = true; initInfinity('shadow'); }
      else if (inBtn(BTN_R, p.x, p.y)) { shadowCampaign = true; sfx.transform(); initInfinity('superShadow'); }
      return;
    }

    if (S === 'hyperSelect') {
      if (HYPER_SEL_CARDS.length > 0) {
        for (var hi = 0; hi < HYPER_SEL_CARDS.length; hi++) {
          if (inBtn(HYPER_SEL_CARDS[hi], p.x, p.y)) { initHyperLevel(HYPER_SEL_CARDS[hi].mode); return; }
        }
      } else {
        if (inBtn(BTN_L, p.x, p.y)) initHyperLevel('sonic');
        else if (inBtn(BTN_R, p.x, p.y)) initHyperLevel('shadow');
      }
      return;
    }

    doJump();
  }, { passive:false });
}
