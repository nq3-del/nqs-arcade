// Chapter 3 — High Noon, No Bullets. The Kestrel finally corners Cole, and
// the "duel" is a trick-shot contest of escalating absurdity: a bottle, a
// tossed coin at the top of its arc, and a ricochet off Preacher's frying
// pan into the chapel weathervane. The loser tips their hat. Nobody was
// ever going to get hurt — that's the whole joke, played straight.

import * as THREE from 'three';
import { on, emit } from '../core/events.js';
import { gameState } from '../core/gameState.js';
import { registerTarget } from './targets.js';
import { createNpc, updateNpc, npcGreeting } from '../entities/npc.js';
import npcData from '../data/npcs.json';

function material(color) {
  return new THREE.MeshLambertMaterial({ color });
}

const COIN_FLIGHT_TIME = 1.5;
const COIN_PEAK = 5.5;

const KESTREL_MISS_LINES = [
  'The ground wins that round.',
  'Gravity remains undefeated. Again?',
  'I have all day, Mr Calloway. The counties can wait.',
];

export function setupChapter3(ctx) {
  const { scene, interactions, effects, hud, dialogue, cole } = ctx;

  let kestrel = null;
  let coin = null;
  let coinState = 'idle'; // 'idle' | 'flying' | 'done'
  let coinTimer = 0;
  let missIndex = 0;
  let vane = null;
  const coinStart = new THREE.Vector3();

  function chapterActive() {
    return gameState.activeQuest === 'ch3_high_noon';
  }

  // The duel furniture only appears once the chapter arrives.
  function buildDuelProps() {
    // Round 1: a bottle on a barrel, down the street.
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), material(0x6e4a2f));
    barrel.position.set(3, 0.45, -13);
    scene.add(barrel);
    const bottle = new THREE.Group();
    const bottleBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), material(0x5f8f6a));
    const bottleNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), material(0x5f8f6a));
    bottleNeck.position.y = 0.18;
    bottle.add(bottleBody, bottleNeck);
    bottle.position.set(3, 1.05, -13);
    scene.add(bottle);
    registerTarget(bottle, {
      tag: 'duel_bottle',
      name: 'Bottle',
      kind: 'shootable',
      onShot() {
        if (!chapterActive() || gameState.questStep !== 1) return;
        bottle.visible = false;
        emit('duel:bottle');
      },
    });

    // Round 2: the coin (waiting in the Kestrel's pocket until called for).
    coin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), material(0xffd26e));
    coin.visible = false;
    scene.add(coin);
    registerTarget(coin, {
      tag: 'duel_coin',
      name: 'Coin',
      kind: 'shootable',
      onShot(point) {
        if (coinState !== 'flying') return;
        coinState = 'done';
        coin.visible = false;
        effects.spawnPuff(point, 0.7);
        emit('duel:coin');
      },
    });

    // Round 3: Preacher's frying pan on a post, and the chapel weathervane.
    const panPost = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), material(0x7a6248));
    panPost.position.set(5.5, 0.9, -2);
    scene.add(panPost);
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.07), material(0x2f2f33));
    pan.rotation.z = 0.9;
    pan.position.set(5.5, 1.9, -2);
    scene.add(pan);

    const vanePost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), material(0x555555));
    vanePost.position.set(10, 5.8, 6);
    scene.add(vanePost);
    vane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), material(0xd9b23a));
    vane.position.set(10, 6.2, 6);
    scene.add(vane);

    registerTarget(pan, {
      tag: 'duel_pan',
      name: "Preacher's frying pan",
      kind: 'shootable',
      onShot(point) {
        if (!chapterActive() || gameState.questStep !== 3) return;
        // The ricochet: pan rings, the shot pings off to the weathervane.
        emit('audio:ricochet');
        effects.addSpin(pan, 10, 'z');
        effects.spawnTracer(point, vane.position);
        effects.spawnPuff(vane.position, 0.8);
        effects.addSpin(vane, 16);
        emit('duel:pan');
      },
    });
  }

  // She talks, tosses and judges — one E-prompt that changes with the round.
  function spawnKestrel() {
    if (kestrel) return;
    const def = npcData.npcs.find((n) => n.id === 'kestrel');
    kestrel = createNpc(scene, def);
    buildDuelProps();

    interactions.register('kestrel', kestrel.group, 3.2, () => {
      if (chapterActive()) {
        if (gameState.questStep === 0) return 'Speak to the stranger in the road';
        if (gameState.questStep === 2 && coinState !== 'flying') return 'Call for the coin toss';
        if (gameState.questStep === 4) return 'Tip your hat';
      }
      return 'Talk to The Kestrel';
    }, () => {
      if (chapterActive() && gameState.questStep === 0) {
        dialogue.start('ch3_kestrel_intro');
      } else if (chapterActive() && gameState.questStep === 2 && coinState !== 'flying') {
        coinState = 'flying';
        coinTimer = 0;
        coinStart.copy(kestrel.group.position);
        coinStart.y = 1.6;
        coin.visible = true;
        hud.showSubtitle('The Kestrel', 'Heads you win. Tails you aim faster.');
      } else if (chapterActive() && gameState.questStep === 4) {
        dialogue.start('ch3_kestrel_end');
      } else if (gameState.chapter >= 4) {
        // The duel's done — she lingers, politely investigating Vane.
        dialogue.start('chatter_kestrel_3');
      } else {
        hud.showSubtitle(def.name, npcGreeting(kestrel));
      }
    });
  }

  // The Kestrel rides into town when Chapter 3 opens (or was already here,
  // if the save says the duel's done).
  on('quest:started', ({ quest }) => {
    if (quest === 'ch3_high_noon') {
      spawnKestrel();
      hud.showSubtitle('Newt', 'Cole! HAWK CALL! There is a VERY calm lady in the road asking for you!', 4);
    }
  });
  if (gameState.chapter >= 3) spawnKestrel();

  return {
    update(dt) {
      if (kestrel) updateNpc(kestrel, dt, cole.group.position);

      // The coin's flight: up, a hang at the top, and down. If it lands,
      // the Kestrel has a dry word and the toss can be called again.
      if (coinState === 'flying') {
        coinTimer += dt;
        const t = coinTimer / COIN_FLIGHT_TIME;
        if (t >= 1) {
          coinState = 'idle';
          coin.visible = false;
          hud.showSubtitle('The Kestrel', KESTREL_MISS_LINES[missIndex++ % KESTREL_MISS_LINES.length]);
        } else {
          coin.position.set(
            coinStart.x + t * 2.5,
            coinStart.y + Math.sin(t * Math.PI) * COIN_PEAK,
            coinStart.z + t * 1.5
          );
          coin.rotation.x += dt * 12; // end over end, catching the sun
        }
      }
    },
  };
}
