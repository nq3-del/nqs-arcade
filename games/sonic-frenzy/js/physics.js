// ═══════════════════════════════════════════════════════
// PHYSICS
// ═══════════════════════════════════════════════════════
function spawnPipe() {
  var minGY = 120, maxGY = FLOOR - 120;
  var gy = minGY + Math.random() * (maxGY - minGY);
  var gs;
  if (hyperChallenge) {
    gs = HYPER_LV.gap;
  } else if (freePlay) {
    gs = Math.max(100, 160 - freePlayScore*2);
  } else if (S === 'infinity') {
    gs = Math.max(100, 160 - infScore*2);
  } else if (shadowCampaign) {
    gs = SHADOW_LV[shadowLv].gap;
  } else {
    gs = LV[lv].gap;
  }
  pipes.push({ x: W+PW, gy:gy, gs:gs, scored:false, smashed:false });
}

function hitPipe(pipe) {
  var r = PR * 0.78;
  var gt = pipe.gy - pipe.gs/2, gb = pipe.gy + pipe.gs/2;
  if (P.x+r < pipe.x || P.x-r > pipe.x+PW) return false;
  return (P.y - r < gt || P.y + r > gb);
}

function doDeath() {
  isNewBest = false;
  isNewSuperBest = false;
  if (freePlay) {
    if (mode === 'super' && freePlayScore > bestSuperScore) {
      bestSuperScore = freePlayScore;
      isNewSuperBest = true;
    } else if (mode !== 'super' && freePlayScore > bestScore) {
      bestScore = freePlayScore;
      isNewBest = true;
    }
  }
  sfx.die();
  var deathCol = (mode === 'shadow' || mode === 'superShadow') ? '#cc0000'
               : (mode === 'silver' || mode === 'superSilver') ? '#b8bcc8'
               : isKnucklesMode(mode) ? '#cc2200'
               : mode === 'em' ? EM[lv].c : '#1a4fcc';
  spark(P.x, P.y, deathCol, 12);
  wasInfinity = (S === 'infinity');
  // Save Knuckles charges to carry over to next attempt
  if (isKnucklesMode(mode)) {
    knucklesCarryCharges = knucklesCharges;
  }
  S = 'dead'; frame = 0;
}

function updateGame() {
  frame++;

  // Knuckles charge ability
  if (knucklesCharging) {
    knucklesChargeTimer--;
    if (knucklesChargeTimer <= 0) {
      knucklesCharging = false;
    }
  }
  // Always be charging up the next stored charge (regardless of dashing)
  if (isKnucklesMode(mode)) {
    if (knucklesCooldown <= 0) {
      knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
    }
    knucklesCooldown--;
    if (knucklesCooldown <= 0) {
      knucklesCharges++;
      knucklesCooldown = KNUCKLES_COOLDOWN_DUR;
    }
  }

  // Physics — Knuckles glides level during charge
  if (knucklesCharging) {
    P.y = knucklesChargeY;
    P.vy = 0;
    P.rot = 0;
  } else {
    P.vy += GRAVITY; P.y += P.vy;
    P.rot = Math.min(Math.PI/3, Math.max(-Math.PI/4, P.vy * 0.07));
  }

  // Boundary
  if (P.y - PR < CEIL) { P.y = CEIL + PR; P.vy = 0; }
  if (P.y + PR > FLOOR) {
    if (isInvincible(mode)) { P.y = FLOOR - PR; P.vy = 0; }
    else { doDeath(); return; }
  }

  // Spawn pipes
  if (++pTick >= PSPAWN) { spawnPipe(); pTick = 0; }

  // Pipe speed
  var spd;
  if (hyperChallenge) {
    spd = HYPER_LV.spd + Math.min(1.5, hyperPassed * 0.003);
  } else if (freePlay) {
    spd = 2.5 + Math.min(2, freePlayScore*0.06);
  } else if (S === 'infinity') {
    spd = 2.5 + Math.min(2, infScore*0.08);
  } else if (shadowCampaign) {
    spd = SHADOW_LV[shadowLv].spd;
  } else {
    spd = LV[lv].spd;
  }

  // Knuckles charge — dash forward at high speed
  if (knucklesCharging) spd *= 4;

  for (var i = 0; i < pipes.length; i++) {
    var p = pipes[i];
    p.x -= spd;

    // Score
    if (!p.scored && p.x + PW < P.x) {
      p.scored = true; sfx.score(); spark(P.x, P.y, '#f5c518', 6);

      if (hyperChallenge) {
        hyperPassed++;
        if (hyperPassed >= HYPER_LV.need) {
          sfx.hyperEmerald();
          S = 'hyperCutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
        }
      } else if (freePlay) {
        freePlayScore++;
        checkCodeReveal();
      } else if (S === 'infinity') {
        infScore++;
        if (infScore === INF_WIN) {
          setTimeout(function(){
            S = 'win'; hasBeatenGame = true;
            if (shadowCampaign) { shadowBeaten = true; }
          }, 400);
        }
      } else if (shadowCampaign) {
        shadowPassed++;
        passed++;
        if (shadowPassed >= SHADOW_LV[shadowLv].need) {
          sfx.clear(); S = 'cutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
        }
      } else {
        passed++;
        if (passed >= LV[lv].need) {
          sfx.clear(); S = 'cutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
        }
      }
    }

    // Knuckles charging — smash ANY pipe that crosses his path
    if (!p.smashed && knucklesCharging && isKnucklesMode(mode)) {
      if (p.x < P.x + PR && p.x + PW > P.x - PR) {
        p.smashed = true; sfx.shatter();
        spark(p.x + PW/2, P.y, '#4aaa22', 14);
        if (!p.scored) {
          p.scored = true;
          if (hyperChallenge) {
            hyperPassed++;
            if (hyperPassed >= HYPER_LV.need) {
              sfx.hyperEmerald();
              S = 'hyperCutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
            }
          } else if (freePlay) { freePlayScore++; checkCodeReveal(); }
          else if (S === 'infinity') {
            infScore++;
            if (infScore === INF_WIN) {
              setTimeout(function(){ S = 'win'; hasBeatenGame = true; }, 400);
            }
          } else if (shadowCampaign) {
            shadowPassed++; passed++;
            if (shadowPassed >= SHADOW_LV[shadowLv].need) {
              sfx.clear(); S = 'cutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
            }
          } else {
            passed++;
            if (passed >= LV[lv].need) {
              sfx.clear(); S = 'cutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
            }
          }
        }
      }
    }

    // Collision
    if (!p.smashed && hitPipe(p)) {
      if (isInvincible(mode)) {
        p.smashed = true; sfx.shatter();
        spark(p.x + PW/2, P.y, '#4aaa22', 14);
        // Hyper modes and Knuckles charging get a point for smashing pipes
        if (mode === 'hyperSonic' || mode === 'hyperShadow' || mode === 'hyperSilver' || mode === 'hyperKnuckles' || mode === 'hyperEm' || (mode === 'knuckles' && knucklesCharging)) {
          if (!p.scored) {
            p.scored = true;
            if (hyperChallenge) {
              hyperPassed++;
              if (hyperPassed >= HYPER_LV.need) {
                sfx.hyperEmerald();
                S = 'hyperCutscene'; csT = 0; sonicX = -80; sonicLeg = 0; frame = 0;
              }
            } else if (freePlay) { freePlayScore++; checkCodeReveal(); }
            else if (S === 'infinity') {
              infScore++;
              if (infScore === INF_WIN) {
                setTimeout(function(){ S = 'win'; hasBeatenGame = true; }, 400);
              }
            }
          }
        }
      } else {
        doDeath(); return;
      }
    }
  }

  pipes = pipes.filter(function(p){ return p.x + PW + 20 > 0 && !p.smashed; });
}
