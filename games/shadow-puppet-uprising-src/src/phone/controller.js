import './controller.css';

const params = new URLSearchParams(location.hash.slice(1));
const room = params.get('room'), slot = Number(params.get('slot'));
const status = document.querySelector('#status');
const joinPanel = document.querySelector('#join-panel');
const pointers = new Map();
let socket, connected = false, axes = [0, 0], stickPointer = null, wakeLock;
const buttons = [...document.querySelectorAll('[data-buttons]')];
const stick = document.querySelector('#stick'), knob = document.querySelector('#knob');
const extraControls = document.querySelector('#extra-controls');
document.querySelector('#more-controls').onclick = () => { reset(); send(); extraControls.showModal(); };
document.querySelector('#close-controls').onclick = () => extraControls.close();
extraControls.addEventListener('close', () => { reset(); send(); });
function send() {
  if (!connected || socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 4096) { reset(); socket.close(); return; }
  socket.send(JSON.stringify({ type: 'input', axes, buttons: [...new Set([...pointers.values()].flatMap(button => button.dataset.buttons.split(',').map(Number)))] }));
}
function reset() {
  pointers.clear(); axes = [0, 0]; stickPointer = null;
  buttons.forEach(button => button.classList.remove('held'));
  knob.style.transform = '';
}
async function keepAwake() {
  try { if (!wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* Local HTTP may not offer a wake lock. */ }
}
function connect() {
  if (!room || ![0, 1].includes(slot)) { status.textContent = 'Scan the QR code from Phone controller in the game to join.'; return; }
  if (socket?.readyState <= 1) return;
  status.textContent = 'Connecting…'; joinPanel.hidden = true;
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/phone-socket`);
  socket.onopen = () => socket.send(JSON.stringify({ type: 'join', room, slot }));
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.type === 'joined') {
      connected = true; reset(); buttons.forEach(button => button.disabled = false);
      status.textContent = `Player ${slot + 1} · Connected`;
      joinPanel.hidden = true; send(); keepAwake();
    }
    if (data.type === 'error') { status.textContent = data.message; socket.pairingError = true; }
  };
  socket.onclose = () => {
    connected = false; reset(); buttons.forEach(button => button.disabled = true);
    if (!socket.pairingError) status.textContent = 'Disconnected. Keep the game open and reconnect.';
    joinPanel.hidden = false;
  };
  socket.onerror = () => { status.textContent = 'Cannot reach the game. Check your Wi-Fi connection.'; };
}
buttons.forEach(button => {
  button.disabled = true;
  button.addEventListener('pointerdown', event => {
    if (!connected) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button); button.classList.add('held'); send(); keepAwake();
  });
  const release = event => {
    pointers.delete(event.pointerId);
    if (![...pointers.values()].includes(button)) button.classList.remove('held');
    send();
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, release);
});
function move(event) {
  if (event.pointerId !== stickPointer) return;
  const rect = stick.getBoundingClientRect(), radius = rect.width * .32;
  let x = (event.clientX - rect.left - rect.width / 2) / radius;
  let y = (event.clientY - rect.top - rect.height / 2) / radius;
  const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
  axes = [x, y]; knob.style.transform = `translate(${x * radius}px,${y * radius}px)`; send();
}
stick.addEventListener('pointerdown', event => {
  if (!connected || stickPointer !== null) return;
  event.preventDefault(); stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); move(event); keepAwake();
});
stick.addEventListener('pointermove', move);
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, event => {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null; axes = [0, 0]; knob.style.transform = ''; send();
});
window.addEventListener('blur', () => { reset(); send(); });
window.addEventListener('pagehide', () => { reset(); send(); socket?.close(); });
document.addEventListener('visibilitychange', () => {
  reset(); send();
  if (document.hidden) socket?.close();
  else { connect(); keepAwake(); }
});
document.addEventListener('contextmenu', event => event.preventDefault());
document.querySelector('#reconnect').onclick = connect;
setInterval(send, 100);
connect();
