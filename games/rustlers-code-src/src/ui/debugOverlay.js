// A small performance readout (FPS, draw calls, triangles) in the top-left
// corner, hidden by default — press the backtick key ` to show/hide it.
// The threejs-performance skill requires this so speed problems are spotted
// the moment they appear, not three milestones later.

export function createDebugOverlay(renderer) {
  const box = document.createElement('div');
  box.style.cssText = [
    'position: absolute',
    'top: 8px',
    'left: 8px',
    'padding: 6px 10px',
    'background: rgba(0, 0, 0, 0.6)',
    'color: #9f9',
    'font: 12px/1.5 monospace',
    'border-radius: 4px',
    'display: none', // hidden until toggled
    'white-space: pre',
  ].join(';');
  document.getElementById('ui-overlay').appendChild(box);

  let visible = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
      visible = !visible;
      box.style.display = visible ? 'block' : 'none';
    }
  });

  // Count frames and refresh the readout four times a second.
  let frames = 0;
  let timer = 0;

  return {
    tick(dt) {
      if (!visible) return;
      frames += 1;
      timer += dt;
      if (timer >= 0.25) {
        const fps = Math.round(frames / timer);
        const info = renderer.info.render;
        box.textContent =
          `FPS        ${fps}\n` +
          `draw calls ${info.calls}\n` +
          `triangles  ${info.triangles}`;
        frames = 0;
        timer = 0;
      }
    },
  };
}
