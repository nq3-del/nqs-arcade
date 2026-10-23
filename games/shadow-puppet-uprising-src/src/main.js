import Phaser from "phaser";
import "./style.css";
import "./diorama/presentation.css";
import { Progress } from "./systems/Progress.js";
import { AudioSystem } from "./systems/Audio.js";
import { Controllers } from "./systems/Controllers.js";
import { UI } from "./ui/UI.js";
import { DioramaMenu, DioramaScene } from "./diorama/DioramaScene.js";
import { PHYSICS } from "./data/config.js";

const progress = new Progress();
const services = { progress, audio: new AudioSystem(progress) };
services.ui = new UI(services);
services.controls = new Controllers(services);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#bce9db",
  antialias: true,
  roundPixels: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: PHYSICS.gravity }, debug: false },
  },
  scene: [DioramaMenu, DioramaScene],
  callbacks: {
    preBoot(game) {
      game.registry.set("services", services);
    },
  },
});
services.ui.attach(game);
// Poll while Phaser gameplay is paused as well, so Start can resume and the
// controller can operate menus. Sampling once per animation frame keeps edges.
game.events.on('prestep', () => services.controls.poll());
game.events.once("ready", () => services.ui.menu());
window.addEventListener("pointerdown", () => services.audio.unlock(), {
  once: true,
});
// Development-only inspection for deterministic runtime QA. Never included in production.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa"))
  window.__gameQA = {
    game,
    services,
    get scene() {
      return game.scene.getScene("Game");
    },
  };
