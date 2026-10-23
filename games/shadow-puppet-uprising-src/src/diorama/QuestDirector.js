import * as THREE from "three";
import { adventureFor } from "../data/adventures.js";
import { distance } from "./Actors.js";

export class QuestDirector {
  constructor(scene) {
    this.scene = scene;
    this.tasks = adventureFor(scene.levelId);
    const saved = scene.services.progress.data.adventures[scene.levelId];
    this.step = Math.min(
      this.tasks.length,
      saved?.revision === 2
        ? saved.step
        : Math.floor(((saved?.step || 0) / 8) * this.tasks.length),
    );
    this.hits = new Set(saved?.revision === 2 ? saved.hits : []);
    this.wave = saved?.revision === 2 ? saved.wave || 0 : 0;
    this.turns = saved?.revision === 2 ? saved.turns || {} : {};
    this.objects = [];
    this.labels = [];
    this.patrol = [];
    this.opened = false;
    this.begin();
  }
  get complete() {
    return this.step >= this.tasks.length;
  }
  get task() {
    return this.tasks[this.step];
  }
  save() {
    const p = this.scene.services.progress;
    p.data.adventures[this.scene.levelId] = {
      revision: 2,
      step: this.step,
      hits: [...this.hits],
      wave: this.wave,
      turns: this.turns,
    };
    p.save();
  }
  clean() {
    const s = this.scene;
    this.objects.forEach((o) => {
      s.view.remove(o.view);
      s.view.remove(o.goal);
      if (o.guard?.active) o.guard.remove();
      if (o.prop) s.props = s.props.filter((p) => p !== o.prop);
    });
    this.labels.forEach(({ label }) => label.remove());
    this.objects = [];
    this.labels = [];
    this.patrol.forEach((e) => {
      if (e?.active) e.remove();
    });
    this.patrol = [];
  }
  begin() {
    this.clean();
    this.opened = false;
    this.flight = null;
    if (this.complete) return;
    const s = this.scene,
      v = s.view,
      t = this.task;
    if (t.kind === "escort") {
      const at = t.points[Math.max(0, this.hits.size - 1)],
        view = v.group(at[0], 0.35, at[1]);
      if (t.item === "cart") {
        v.box(0, 0.45, 0, 1.5, 0.55, 1.1, "#b79a70", view);
        for (const x of [-0.6, 0.6])
          for (const z of [-0.5, 0.5])
            v.cylinder(
              x,
              0.1,
              z,
              0.25,
              0.25,
              0.13,
              "#657478",
              view,
            ).rotation.z = Math.PI / 2;
        v.box(0, 0.86, 0, 0.9, 0.3, 0.7, "#8b9d9c", view);
        v.tube(
          [
            [-0.5, 0.8, -0.5],
            [-0.5, 1.3, -0.8],
            [0.5, 1.3, -0.8],
            [0.5, 0.8, -0.5],
          ],
          0.04,
          "#dbbe8d",
          view,
        );
      } else {
        v.sphere(0, 0.7, 0, 0.35, 0.45, 0.35, "#daeaa3", view).material =
          v.material("#dfeaab", {
            emissive: "#d9ec9c",
            emissiveIntensity: 0.8,
          });
        for (const x of [-0.12, 0.12])
          v.sphere(x, 0.77, 0.3, 0.04, 0.06, 0.03, "#59685e", view);
      }
      this.cart = { x: at[0], z: at[1], view, i: 0 };
      this.objects = [this.cart];
      return;
    }
    t.points.forEach(([x, z], i) => {
      if (this.hits.has(i)) return;
      let view, guard, prop, goal;
      if (t.kind === "power")
        view = v.prop(s.levelId === 4 ? "barrier" : "crystal", x, z);
      else if (t.kind === "ally") {
        if (t.ally === "grandad") {
          prop = s.prop("machine", x, z);
          view = prop.view;
        } else {
          guard = s.spawnEnemy(x, z, s.worldData.owner, true);
          view = v.marker(x, z, "#c0dcc2");
        }
      } else if (t.kind === "dash") {
        view = v.makePortal(x, z);
        view.scale.setScalar(0.6);
      } else if (t.kind === "sequence" || t.kind === "valve") {
        view = v.prop("machine", x, z);
        if (t.kind === "valve") {
          const flower = v.flower(x, z + 0.5, 0.9);
          view.add(flower);
          flower.position.set(0, 1.8, 0);
        }
      } else if (t.kind === "mirror") {
        view = v.group(x, 0.3, z);
        v.cylinder(0, 0.7, 0, 0.07, 0.12, 1.4, "#bdac89", view);
        const disk = v.mesh(
          new THREE.CircleGeometry(0.7, 32),
          "#93c8cf",
          view,
          { side: THREE.DoubleSide, metalness: 0.6, roughness: 0.14 },
        );
        disk.position.y = 1.6;
        v.ring(0, 1.6, 0.02, 0.77, "#dec495", view).rotation.x = 0;
        view.rotation.y = ((this.turns[i] || 0) * Math.PI) / 2;
        v.box(0, 0.04, 1.15, 0.07, 0.03, 2.3, "#f0d993", view, 0.01).material =
          v.material("#f0d993", {
            emissive: "#e9d48c",
            emissiveIntensity: 0.7,
          });
        const angle = (t.turns[i] * Math.PI) / 2;
        goal = v.marker(
          x + Math.sin(angle) * 2.5,
          z + Math.cos(angle) * 2.5,
          "#efda9a",
        );
      } else if (t.kind === "collect") view = v.questItem(t.item, x, z);
      else if (t.kind === "sport") {
        view = v.projectile("ball", x, z);
        const [gx, gz] = t.goals[i];
        goal = v.marker(gx, gz, "#ede2ab");
        goal.scale.setScalar(1.5);
        const net = v.group(gx, 0, gz);
        v.tube(
          [
            [-1, 0, 0],
            [-1, 1.3, 0],
            [1, 1.3, 0],
            [1, 0, 0],
          ],
          0.06,
          "#e4e9d9",
          net,
        );
        goal.add(net);
        net.position.set(0, 0, 0);
      } else if (t.kind === "hoops") {
        view = v.group(x, 2.6, z);
        v.ring(0, 0, 0, 0.6, '#ef9d4e', view).rotation.x = 0;
        v.floaters.push({mesh:view,kind:'mote',base:view.position.clone(),phase:i});
      } else view = v.marker(x, z);
      const o = { x, z, i, view, guard, prop, goal, moving: false };
      this.objects.push(o);
      if (["sequence", "valve", "mirror"].includes(t.kind)) {
        const label = document.createElement("span");
        label.className = "quest-number";
        label.textContent = t.kind === "mirror" ? "↻" : String(i + 1);
        document.querySelector("#game-shell").appendChild(label);
        this.labels.push({ label, o });
      }
    });
  }
  resetCurrent() {
    if (this.complete) return;
    this.wave = 0;
    this.hits.clear();
    this.turns = {};
    this.save();
    this.begin();
    this.scene.services.ui.toast(
      "This objective is ready to try again. Earlier progress is safe.",
    );
  }
  hit(o) {
    if (this.hits.has(o.i)) return;
    this.hits.add(o.i);
    this.scene.view.remove(o.view);
    this.scene.view.remove(o.goal);
    if (o.guard?.active) o.guard.remove();
    this.scene.view.effect(o.x, o.z, "#e7d49e", 22);
    this.scene.services.audio.play("star");
    this.save();
    if (this.hits.size >= this.task.points.length) this.advance();
  }
  advance() {
    const s = this.scene,
      t = this.task,
      at = t.destination || t.points.at(-1);
    this.step++;
    this.hits.clear();
    this.turns = {};
    this.wave = 0;
    this.save();
    s.checkpointReached = true;
    s.spawn = { x: at[0], z: at[1] };
    s.services.progress.setCheckpoint(s.levelId, true, s.spawn);
    for (const p of s.players) {
      p.health = Math.min(p.maxHealth, p.health + 2);
    }
    s.storyFocus = { x: at[0], z: at[1] };
    this.begin();
    if (this.complete)
      s.playCinema(
        [
          t.line,
          "The silver thread leads straight to the Ultimate Shadow.",
          "Dodge the warning. Strike when the pale green ring appears.",
        ],
        () => {},
        "quest",
      );
    else
      s.playCinema(
        [
          t.beat || "The way ahead is opening.",
          this.task.title + ". " + this.task.hint,
        ],
        () => {},
        "event",
      );
  }
  interact(player = this.scene.player) {
    if (this.complete) return false;
    const t = this.task,
      s = this.scene;
    if (
      ![
        "collect",
        "sequence",
        "valve",
        "mirror",
        "catapult",
        "finish",
      ].includes(t.kind)
    )
      return false;
    const o = this.objects.find(
      (o) => !this.hits.has(o.i) && distance(o, player) < 2.2,
    );
    if (!o) return false;
    if (t.kind === "sequence" && o.i !== this.hits.size) {
      s.services.ui.toast(
        `Follow the lights to relay ${this.hits.size + 1}. Nothing is lost.`,
      );
      return true;
    }
    if (t.kind === "mirror") {
      this.turns[o.i] = ((this.turns[o.i] || 0) + 1) % 4;
      o.view.rotation.y = (this.turns[o.i] * Math.PI) / 2;
      this.save();
      if (this.turns[o.i] === t.turns[o.i]) this.hit(o);
      else s.services.ui.toast("Turn it again. Aim at the golden light.", 1200);
      return true;
    }
    if (t.kind === "catapult") {
      if (!this.flight) {
        this.flight = {
          player,
          from: { x: player.x, z: player.z },
          to: t.destination,
          start: s.time.now,
          o,
        };
        player.launched = true;
        player.invulnerableUntil = s.time.now + 4000;
        s.services.audio.play("dash");
      }
      return true;
    }
    this.hit(o);
    return true;
  }
  action(kind, player = this.scene.player) {
    if (this.complete) return;
    const t = this.task;
    if (t.kind === "sport" && (kind === "basic" || kind === "power")) {
      const o = this.objects.find(
        (o) => !o.moving && !this.hits.has(o.i) && distance(o, player) < 2.5,
      );
      if (o) {
        o.moving = true;
        o.from = { x: o.x, z: o.z };
        o.start = this.scene.time.now;
        this.scene.services.audio.play("pop");
      }
      return;
    }
    if (t.kind !== kind) return;
    const o = this.objects.find(
      (o) =>
        !this.hits.has(o.i) &&
        distance(o, player) < (kind === "power" ? 3 : 1.8),
    );
    if (o) this.hit(o);
  }
  onAlly(id, player) {
    if (!this.complete && this.task.kind==='sport' && id==='daddy') {
      const ball=this.objects.find(o=>!o.moving&&!this.hits.has(o.i)&&distance(o,player)<4);
      if(ball){ball.moving=true;ball.kickedByDaddy=true;ball.from={x:ball.x,z:ball.z};ball.start=this.scene.time.now;}
      return;
    }
    if (this.complete || this.task.kind !== "ally" || this.task.ally !== id)
      return;
    const s = this.scene;
    for (const o of [...this.objects])
      if (!this.hits.has(o.i) && distance(o, player) < 4) {
        if (
          id === "grandad"
            ? o.prop.done
            : id === "nana"
              ? o.guard?.friendlyUntil > s.time.now
              : o.guard?.poseUntil > s.time.now
        )
          this.hit(o);
        if (this.task?.kind !== "ally") break;
      }
  }
  spawnPatrol(x, z) {
    const s = this.scene;
    this.patrol = [
      [-0.9, 0],
      [1, 0.3],
      [0, -1],
    ].map(([dx, dz]) => s.spawnEnemy(x + dx, z + dz, s.worldData.owner));
  }
  patrolClear() {
    const s = this.scene;
    return this.patrol.every(
      (e) =>
        !e.active || e.friendlyUntil > s.time.now || e.poseUntil > s.time.now,
    );
  }
  update(dt = 0.016) {
    if (this.complete) return;
    const s = this.scene,
      t = this.task,
      v = s.view;
    if (t.kind === "hoops")
      for (const p of s.players)
        if ((p.form === "B" || (s.replayMode && p.superPower.active)) && p.y > 1.55) {
          const o = this.objects.find(
            (o) => !this.hits.has(o.i) && distance(o, p) < 2,
          );
          if (o) this.hit(o);
          if (this.task !== t) return;
        }
    if (t.kind === "ally")
      for (const o of this.objects)
        if (o.guard && !o.guard.active && !this.hits.has(o.i))
          o.guard = s.spawnEnemy(o.x, o.z, s.worldData.owner, true);
    if (this.flight) {
      const f = this.flight,
        progress = Math.min(1, (s.time.now - f.start) / 2400);
      f.player.x = THREE.MathUtils.lerp(f.from.x, f.to[0], progress);
      f.player.z = THREE.MathUtils.lerp(f.from.z, f.to[1], progress);
      f.player.y = Math.sin(progress * Math.PI) * 7;
      f.player.sync(dt);
      if (progress === 1) {
        f.player.launched = false;
        f.player.y = 0;
        this.flight = null;
        this.hit(f.o);
      }
      return;
    }
    if (t.kind === "sport")
      for (const o of [...this.objects])
        if (o.moving) {
          const a = Math.min(1, (s.time.now - o.start) / 1200),
            goal = t.goals[o.i];
          o.x = THREE.MathUtils.lerp(o.from.x, goal[0], a);
          o.z = THREE.MathUtils.lerp(o.from.z, goal[1], a);
          o.view.position.set(o.x, 0.4 + Math.sin(a * Math.PI) * 1.5, o.z);
          o.view.rotation.x += dt * 8;
          if (a === 1) {
            o.moving=false;
            if(o.kickedByDaddy)s.discoverVini();
            this.hit(o);
          }
        }
    if (t.kind === "escort") {
      const cart = this.cart,
        targetIndex = Math.min(this.hits.size, t.points.length - 1),
        [x, z] = t.points[targetIndex];
      if (
        s.players.some((p) => !p.downed && distance(p, cart) < 6) &&
        this.patrolClear()
      ) {
        const d = Math.hypot(x - cart.x, z - cart.z),
          travel = Math.min(d, dt * 2.1);
        if (d) {
          cart.x += ((x - cart.x) / d) * travel;
          cart.z += ((z - cart.z) / d) * travel;
          cart.view.rotation.y = Math.atan2(x - cart.x, z - cart.z);
        }
        cart.view.position.set(cart.x, 0.35, cart.z);
        if (d < 0.3) {
          this.hits.add(targetIndex);
          this.save();
          if (this.hits.size >= t.points.length) {
            this.advance();
            return;
          }
          if (targetIndex > 0 && targetIndex <= t.waves)
            this.spawnPatrol(cart.x + 3, cart.z - 1);
        }
      }
    }
    if (t.kind === "encounter") {
      const at = t.points[Math.min(this.wave, t.points.length - 1)];
      if (
        !this.opened &&
        s.players.some((p) => distance(p, { x: at[0], z: at[1] }) < 4)
      ) {
        this.opened = true;
        this.spawnPatrol(...at);
        s.services.ui.toast(
          `Patrol ${this.wave + 1} of ${t.waves}. Watch the warnings!`,
        );
      }
      if (this.opened && this.patrolClear()) {
        this.patrol.forEach((e) => {
          if (e.active) e.remove();
        });
        this.wave++;
        this.opened = false;
        this.save();
        if (this.wave >= t.waves) {
          this.advance();
          return;
        }
      }
    }
    this.labels.forEach(({ label, o }) => {
      const p = v.project(o.x, 2.4, o.z);
      label.style.left = `${p.x}%`;
      label.style.top = `${p.y}%`;
      label.hidden = !!s.cinematic || this.hits.has(o.i);
    });
  }
  target() {
    if (this.complete) return null;
    if (this.task.kind === "escort") return this.cart;
    if (this.task.kind === "encounter") {
      const at =
        this.task.points[Math.min(this.wave, this.task.points.length - 1)];
      return { x: at[0], z: at[1] };
    }
    return this.objects.find((o) => !this.hits.has(o.i));
  }
  hint() {
    if (this.complete) return "";
    const t = this.task,
      count = t.kind === "encounter" ? this.wave : this.hits.size;
    return `${this.step + 1}/${this.tasks.length} · ${t.title} · ${count}/${t.points.length} — ${t.hint}`;
  }
  destroy() {
    this.labels.forEach(({ label }) => label.remove());
  }
}
