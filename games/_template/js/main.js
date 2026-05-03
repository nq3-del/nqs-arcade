// ═══════════════════════════════════════════════════════
// MAIN — Canvas bootstrap + game loop
// This script loads last. Declare C and X here so they're
// available when initInput() attaches event listeners.
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
  // Route to the correct draw function based on game state
  // e.g.: if (S === 'menu') drawMenu();
  requestAnimationFrame(loop);
}

initInput(); // defined in input.js
loop();
