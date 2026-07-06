// The over-the-shoulder camera that follows Cole. Moving the mouse (while
// the game has captured it) orbits the camera around him. When Cole aims,
// the camera glides in close over his right shoulder and the view narrows —
// like raising a rifle to your eye.

import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.0028;
const DISTANCE = 6;        // metres behind Cole, normally
const AIM_DISTANCE = 2.6;  // tucked in while aiming
const AIM_SHOULDER = 0.8;  // sidestep to the right while aiming
const LOOK_HEIGHT = 1.5;   // aim the camera at Cole's chest, not his boots
const NORMAL_FOV = 60;
const AIM_FOV = 44;        // narrower view = the "focused" feel
const MIN_PITCH = -0.75; // deep enough to aim at water towers and weathervanes
const MAX_PITCH = 1.1;
const FOLLOW_SNAP = 10;    // higher = camera catches up faster

// Scratch objects reused every frame — no `new` in the frame loop.
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export function createCameraRig() {
  return {
    yaw: 0,
    pitch: 0.4,
    aimBlend: 0, // 0 = normal, 1 = fully aimed; glides between the two
    // The camera tracks this smoothed point rather than the player's raw
    // position — raw positions step once per frame, and steps read as
    // shake at riding speed.
    smoothedTarget: new THREE.Vector3(),
    hasTarget: false,
  };
}

export function updateThirdPersonCamera(rig, camera, dt, input, rawTarget, isAiming) {
  if (!rig.hasTarget) {
    rig.smoothedTarget.copy(rawTarget);
    rig.hasTarget = true;
  }
  // Very tight easing: removes per-frame stepping without adding drag.
  rig.smoothedTarget.lerp(rawTarget, 1 - Math.exp(-30 * dt));
  const targetPosition = rig.smoothedTarget;

  // Ease the aim blend toward where it should be.
  const aimTarget = isAiming ? 1 : 0;
  rig.aimBlend += (aimTarget - rig.aimBlend) * Math.min(1, dt * 8);

  // Mouse steers the orbit (slower and steadier while aiming).
  const sensitivity = MOUSE_SENSITIVITY * (1 - rig.aimBlend * 0.55);
  rig.yaw -= input.mouseDX * sensitivity;
  rig.pitch += input.mouseDY * sensitivity;
  rig.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, rig.pitch));

  // Narrow the view while aiming.
  const fov = NORMAL_FOV + (AIM_FOV - NORMAL_FOV) * rig.aimBlend;
  if (Math.abs(camera.fov - fov) > 0.1) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  // Where the camera WANTS to be: on a circle behind Cole (closer while
  // aiming), raised by pitch, shifted a shoulder-width right while aiming.
  const distance = DISTANCE + (AIM_DISTANCE - DISTANCE) * rig.aimBlend;
  const flat = distance * Math.cos(rig.pitch);
  const shoulder = AIM_SHOULDER * rig.aimBlend;
  _desired.set(
    targetPosition.x + Math.sin(rig.yaw) * flat + Math.cos(rig.yaw) * shoulder,
    targetPosition.y + LOOK_HEIGHT + distance * Math.sin(rig.pitch),
    targetPosition.z + Math.cos(rig.yaw) * flat - Math.sin(rig.yaw) * shoulder
  );

  // Glide toward that spot (frame-rate independent smoothing; snappier
  // while aiming so the view feels responsive).
  const smoothing = 1 - Math.exp(-(FOLLOW_SNAP + rig.aimBlend * 14) * dt);
  camera.position.lerp(_desired, smoothing);
  // Looking sharply up swings the camera low — never below the ground.
  if (camera.position.y < 0.35) camera.position.y = 0.35;

  _lookAt.set(
    targetPosition.x + Math.cos(rig.yaw) * shoulder,
    targetPosition.y + LOOK_HEIGHT,
    targetPosition.z - Math.sin(rig.yaw) * shoulder
  );
  camera.lookAt(_lookAt);
}
