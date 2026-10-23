import './controller.css';
import { PhoneConnection, pairingToken } from '../systems/PhoneConnection.js';

const params = new URLSearchParams(location.hash.slice(1));
const room = params.get('room'), slot = Number(params.get('slot'));
const status = document.querySelector('#status');
const joinPanel = document.querySelector('#join-panel');
const pointers = new Map();
let connection, connected = false, axes = [0, 0], stickPointer = null, wakeLock;
const token = pairingToken();
const buttons = [...document.querySelectorAll('[data-buttons]')];
const stick = document.querySelector('#stick'), knob = document.querySelector('#knob');
const extraControls = document.querySelector('#extra-controls');
document.querySelector('#more-controls').onclick = () => { reset(); send(); extraControls.showModal(); };
document.querySelector('#close-controls').onclick = () => extraControls.close();
extraControls.addEventListener('close', () => { reset(); send(); });
function send() {
  if (!connected) return;
  connection.send({ type: 'input', axes, buttons: [...new Set([...pointers.values()].flatMap(button => button.dataset.buttons.split(',').map(Number)))] });
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
  if (!/^[a-f0-9]{36}$/.test(room || '') || !params.has('slot') || ![0, 1].includes(slot)) { status.textContent = 'Scan the QR code from Phone controller in the game to join.'; return; }
  if (!connection) connection = new PhoneConnection({
    hello: () => ({ type: 'join', room, slot, token }),
    onState: (state, message) => {
      if (state === 'connected') return;
      connected = false; reset(); buttons.forEach(button => button.disabled = true);
      status.textContent = message || (state === 'connecting' ? 'Connecting…' : 'Reconnecting… Keep the game open.');
      joinPanel.hidden = state === 'connecting';
    },
    onMessage: data => {
    if (data.type === 'joined' || data.type === 'host-online') {
      connected = true; reset(); buttons.forEach(button => button.disabled = false);
      status.textContent = `Player ${slot + 1} · Connected`;
      joinPanel.hidden = true; send(); keepAwake();
    }
    if (data.type === 'host-offline') {
      connected = false; reset(); buttons.forEach(button => button.disabled = true);
      status.textContent = 'Reconnecting to the game… Keep both screens open.';
    }
    },
  });
  connection.start();
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
// Keep drag traffic bounded on high-refresh-rate touchscreens. Buttons and
// releases still send immediately so short taps never disappear.
let lastMove = 0;
stick.addEventListener('pointermove', event => {
  if (performance.now() - lastMove < 32) return;
  lastMove = performance.now(); move(event);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, event => {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null; axes = [0, 0]; knob.style.transform = ''; send();
});
window.addEventListener('blur', () => { reset(); send(); });
window.addEventListener('pagehide', () => { reset(); send(); connection?.stop(); });
document.addEventListener('visibilitychange', () => {
  reset(); send();
  if (document.hidden) connection?.stop();
  else { connect(); keepAwake(); }
});
document.addEventListener('contextmenu', event => event.preventDefault());
document.querySelector('#reconnect').onclick = connect;
setInterval(send, 100);
connect();
