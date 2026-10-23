import Phaser from "phaser";
import {
  makeTextures,
  background,
  platformArt,
  portal,
} from "../systems/Art.js";
import { WORLDS } from "../data/levels.js";
export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create() {
    makeTextures(this);
    background(this, WORLDS[0], true);
    platformArt(this, 1010, 508, 575, 250, WORLDS[0]);
    platformArt(this, 720, 395, 170, 40, WORLDS[0]);
    platformArt(this, 1150, 282, 210, 44, WORLDS[0]);
    portal(this, 1150, 207).setScale(0.65);
    const a = this.add
      .image(840, 407, "heroA")
      .setScale(2.1)
      .setAngle(-5)
      .setDepth(6);
    const b = this.add
      .image(1010, 417, "heroB")
      .setScale(1.65)
      .setAngle(7)
      .setDepth(5);
    this.tweens.add({
      targets: a,
      y: 398,
      angle: 1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: b,
      y: 410,
      angle: 2,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    for (let i = 0; i < 8; i++) {
      const star = this.add
        .image(670 + i * 75, 265 + Math.sin(i) * 47, "star")
        .setScale(i % 2 ? 0.6 : 0.8)
        .setAngle(i * 23);
      this.tweens.add({
        targets: star,
        y: star.y - 9,
        angle: star.angle + 15,
        duration: 1000 + i * 110,
        yoyo: true,
        repeat: -1,
      });
    }
    const puppet = this.add
      .image(1170, 465, "shadow-grandad")
      .setScale(0.8)
      .setAngle(8);
    this.tweens.add({
      targets: puppet,
      angle: -8,
      y: 460,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
    const banner = this.add
      .text(920, 590, "THE ADVENTURE STARTS WITH YOU", {
        fontFamily: "Trebuchet MS",
        fontSize: 12,
        fontStyle: "bold",
        color: "#edf1d5",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    banner.setAngle(-2);
    this.events.once("shutdown", () => this.tweens.killAll());
  }
}
