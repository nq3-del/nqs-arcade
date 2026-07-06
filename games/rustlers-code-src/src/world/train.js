// Vane's pay train. It waits at the railhead, rolls north when Chapter 2
// says so, and splits in two when Cole shoots the coupling: the engine
// steams off in a huff while the cargo section sighs to a stop.
// The track runs north–south at x = 55.

import * as THREE from 'three';

export const TRACK_X = 55;
const ROLL_SPEED = 6.5;   // slower than Biscuit's gallop, so the leap is makeable
const ROOF_HEIGHT = 2.75; // where Cole stands when aboard

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function makeCar(color, length = 4.2) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, length), material(color));
  body.position.y = 1.55;
  car.add(body);
  for (const z of [-length / 3, length / 3]) {
    const wheels = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.7), material(0x2b2b2b));
    wheels.position.set(0, 0.35, z);
    car.add(wheels);
  }
  return car;
}

export function createTrain(scene) {
  // Front section: the engine and its coal tender.
  const front = new THREE.Group();
  const engine = makeCar(0x37424e, 5);
  const boiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 3.4), material(0x2e3640));
  boiler.position.set(0, 2, -1);
  engine.add(boiler);
  const funnel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), material(0x1e242c));
  funnel.position.set(0, 3.15, -2);
  engine.add(funnel);
  const funnelCap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), material(0x1e242c));
  funnelCap.position.set(0, 3.7, -2);
  engine.add(funnelCap);
  const catcher = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 0.7), material(0x8a3a2e));
  catcher.rotation.x = 0.6;
  catcher.position.set(0, 0.6, -2.8);
  engine.add(catcher);
  front.add(engine);
  const tender = makeCar(0x3f4a55, 3.4);
  tender.position.z = 4.6;
  front.add(tender);

  // Rear section: the pay car (safe inside) and the caboose.
  const rear = new THREE.Group();
  const payCar = makeCar(0x6e4a2f, 4.6);
  rear.add(payCar);
  const caboose = makeCar(0x8a3a2e, 3.6);
  caboose.position.z = 4.8;
  rear.add(caboose);

  // The coupling: a bright link between tender and pay car.
  const coupling = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), material(0xd9b23a));
  coupling.position.set(0, 1, -2.6);
  rear.add(coupling);

  // The safe door on the pay car's west side (facing the town).
  const safeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.1), material(0x3f4a55));
  safeDoor.position.set(-1.15, 1.55, 0);
  payCar.add(safeDoor);

  scene.add(front);
  scene.add(rear);

  const train = {
    front, rear, coupling, safeDoor, payCar,
    state: 'parked',    // 'parked' | 'rolling' | 'cut' | 'stopped'
    z: 30,              // rear section's track position
    frontZ: 30,         // front section's (same until the cut)
    rearSpeed: 0,
    frontSpeed: 0,
    aboard: false,      // is Cole standing on the pay car roof?

    depart() {
      if (this.state === 'parked') {
        this.state = 'rolling';
        this.rearSpeed = ROLL_SPEED;
        this.frontSpeed = ROLL_SPEED;
      }
    },

    cut() {
      if (this.state === 'rolling') {
        this.state = 'cut';
        this.coupling.visible = false;
      }
    },

    // Rest the rear section somewhere specific (used when a save resumes
    // mid-heist so the player isn't stranded chasing a ghost train).
    parkRearAt(z) {
      this.state = 'stopped';
      this.z = z;
      this.frontZ = z - 60;
      this.rearSpeed = 0;
      this.frontSpeed = 0;
      this.coupling.visible = false;
    },

    update(dt, cole) {
      if (this.state === 'rolling') {
        this.z -= this.rearSpeed * dt;
        this.frontZ = this.z;
        // If nobody boards in time, the train circles the valley for
        // another pass — the heist can't be missed forever.
        if (this.z < -85) {
          this.z = 85;
          this.frontZ = 85;
        }
      } else if (this.state === 'cut') {
        // Engine huffs off; cargo sighs to a stop.
        this.frontSpeed = Math.min(this.frontSpeed + dt * 3, 14);
        this.rearSpeed = Math.max(0, this.rearSpeed - dt * 2.2);
        this.frontZ -= this.frontSpeed * dt;
        this.z -= this.rearSpeed * dt;
        if (this.rearSpeed === 0) this.state = 'stopped';
      }

      this.front.position.set(TRACK_X, 0, this.frontZ);
      this.rear.position.set(TRACK_X, 0, this.z + 7.4);

      // Cole rides the pay car roof.
      if (this.aboard) {
        cole.group.position.set(TRACK_X, ROOF_HEIGHT, this.z + 7.4);
        cole.group.rotation.y = 0;
      }
    },
  };

  return train;
}
