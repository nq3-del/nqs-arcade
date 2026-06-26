// ═══════════════════════════════════════════════════════
// MAIN — Canvas bootstrap + game loop
// Loads last; C and X become available to all other
// modules once this script executes.
// ═══════════════════════════════════════════════════════
var C = document.getElementById('c');
var X = C.getContext('2d');
C.width = W; C.height = H;

function resize() {
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  C.style.width  = W * s + 'px';
  C.style.height = H * s + 'px';
}
resize();
window.addEventListener('resize', resize);

function loop() {
  X.clearRect(0, 0, W, H);
  frame++;
  if      (codeRevealState === 'showing')             drawCodeReveal();
  else if (saveState === 'confirmOverwrite')          drawSaveOverwriteConfirm();
  else if (saveState === 'confirmDelete')             drawSaveDeleteConfirm();
  else if (saveState === 'menu')                      drawSaveScreen();
  else if (codesState === 'menu')                    drawCodesMenu();
  else if (codesState === 'list')                    drawCodesList();
  else if (codesState === 'entering')                 drawCodesScreen();
  else if (adminState === 'password')                drawAdminPassword();
  else if (adminState === 'console')                 drawAdminConsole();
  else if (S === 'menu')                             drawMenu();
  else if (S === 'playing' || S === 'infinity')      { if (!paused) updateGame(); drawGame(); }
  else if (S === 'dead')                             drawDead();
  else if (S === 'cutscene')                         drawCutscene();
  else if (S === 'hyperCutscene')                    drawHyperCutscene();
  else if (S === 'select')                           drawSelect();
  else if (S === 'shadowSelect')                     drawShadowSelect();
  else if (S === 'hyperSelect')                      drawHyperSelect();
  else if (S === 'fpselect')                         drawFPSelect();
  else if (S === 'win')                              drawWin();
  requestAnimationFrame(loop);
}

// Attach all event listeners now that C is defined
initInput();

// Start the game loop
loop();
