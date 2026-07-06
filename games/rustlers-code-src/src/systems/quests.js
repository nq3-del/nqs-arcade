// The quest engine. Quests are ordered steps in src/data/quests.json; each
// step names the event it's waiting for ("shot:bank_latch"). This file just
// listens, advances, and announces — all story specifics live in the data.

import questData from '../data/quests.json';
import { gameState, saveGame } from '../core/gameState.js';
import { on, off, emit } from '../core/events.js';
import { changeCode } from './codeMeter.js';

const NO_TRIGGERS = []; // shared empty result — never allocate per frame

export function createQuests(hud) {
  let currentListener = null; // { triggers: [names], fn }

  function quest() {
    return questData.find((q) => q.id === gameState.activeQuest);
  }

  function stopListening() {
    if (currentListener) {
      for (const t of currentListener.triggers) off(t, currentListener.fn);
      currentListener = null;
    }
  }

  function listenForStep() {
    stopListening();
    const q = quest();
    if (!q) return;
    const step = q.steps[gameState.questStep];
    // A save can point past the end if steps were trimmed in an update —
    // treat that as the quest being done rather than stranding the player.
    if (!step) {
      completeQuest(q);
      return;
    }

    hud.setObjective(q.title, step.objective);

    // A step's trigger can be one event name or a list (any one advances).
    const triggers = Array.isArray(step.trigger) ? step.trigger : [step.trigger];
    const fn = () => advance();
    currentListener = { triggers, fn };
    for (const t of triggers) on(t, fn);
  }

  function advance() {
    const q = quest();
    stopListening();
    gameState.questStep += 1;
    emit('quest:step', { quest: q.id, step: gameState.questStep });

    if (gameState.questStep >= q.steps.length) {
      completeQuest(q);
    } else {
      listenForStep();
    }
    saveGame();
  }

  function completeQuest(q) {
    gameState.completedQuests.push(q.id);
    gameState.activeQuest = null;
    hud.setObjective('', '');

    // Apply the rewards BEFORE announcing completion, so anything reacting
    // to the announcement (like the ending screen reading the final Code
    // score) sees the finished numbers.
    const done = q.onComplete || {};
    if (done.codeDelta) changeCode(done.codeDelta, 'completed ' + q.title);
    if (done.money) {
      gameState.money += done.money;
      emit('money:changed');
    }
    if (done.chapter) gameState.chapter = done.chapter;
    emit('quest:completed', { quest: q.id });

    if (done.unlocks) {
      // The next quest begins straight away (its first step is usually
      // "talk to someone", so there's no rush pressure).
      start(done.unlocks);
    }
  }

  function start(questId) {
    const q = questData.find((x) => x.id === questId);
    if (!q) {
      console.warn('Quest "' + questId + '" is not in quests.json');
      return;
    }
    gameState.activeQuest = questId;
    gameState.questStep = 0;
    emit('quest:started', { quest: questId });
    listenForStep();
  }

  return {
    start,
    // After loading a save, pick up exactly where the player left off.
    resume() {
      if (gameState.activeQuest) listenForStep();
    },
    isDone(questId) {
      return gameState.completedQuests.includes(questId);
    },
    // What events would advance the current step? (Used so townsfolk the
    // story is waiting on never wander home for the night mid-quest.)
    // Returns the listener's own cached array — called every frame, so it
    // must not allocate (threejs-performance skill).
    currentTriggers() {
      return currentListener ? currentListener.triggers : NO_TRIGGERS;
    },
  };
}
