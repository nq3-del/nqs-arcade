// ═══════════════════════════════════════════════════════
// WORLDS COLLIDE — Babylon.js Full Rebuild
// Proper physics, PBR materials, open world
// ═══════════════════════════════════════════════════════

(async function () {
  'use strict';

  // ─── ENGINE SETUP ─────────────────────────────────────
  var canvas = document.getElementById('renderCanvas');
  var engine = new BABYLON.Engine(canvas, true, { stencil: true });
  engine.setHardwareScalingLevel(1 / window.devicePixelRatio);

  var scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.92, 1);
  scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.35);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.003;
  scene.fogColor = new BABYLON.Color3(0.7, 0.85, 0.95);

  // ─── PHYSICS (Havok or fallback) ──────────────────────
  var gravityVector = new BABYLON.Vector3(0, -20, 0);
  try {
    var havok = await HavokPhysics();
    var havokPlugin = new BABYLON.HavokPlugin(true, havok);
    scene.enablePhysics(gravityVector, havokPlugin);
  } catch (e) {
    console.warn('Havok failed, using no physics plugin — collision will be manual');
  }

  // ─── CAMERA ───────────────────────────────────────────
  var camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 14, BABYLON.Vector3.Zero(), scene);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 25;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = 1.4;
  camera.angularSensibilityX = 800;
  camera.angularSensibilityY = 800;
  camera.inertia = 0.85;
  camera.attachControl(canvas, true);

  // ─── LIGHTING ─────────────────────────────────────────
  var sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.5), scene);
  sun.intensity = 1.8;
  sun.diffuse = new BABYLON.Color3(1, 0.96, 0.88);

  var hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.5;
  hemi.diffuse = new BABYLON.Color3(0.85, 0.9, 1);
  hemi.groundColor = new BABYLON.Color3(0.3, 0.5, 0.3);

  // Shadows
  var shadowGen = new BABYLON.ShadowGenerator(2048, sun);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 16;
  shadowGen.darkness = 0.3;

  // ─── SKYBOX ───────────────────────────────────────────
  var skyMat = new BABYLON.StandardMaterial('skyMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
  skyMat.emissiveColor = new BABYLON.Color3(0.53, 0.81, 0.92);
  var skybox = BABYLON.MeshBuilder.CreateBox('skybox', { size: 500 }, scene);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;

  // ─── GROUND / TERRAIN ─────────────────────────────────
  var groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.35, 0.6, 0.25);
  groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

  var ground = BABYLON.MeshBuilder.CreateGround('ground', {
    width: 300, height: 300, subdivisions: 80, updatable: false
  }, scene);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Apply height map to ground vertices
  var positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  for (var i = 0; i < positions.length; i += 3) {
    var x = positions[i];
    var z = positions[i + 2];
    var h = 0;
    h += Math.sin(x * 0.03) * 2 + Math.cos(z * 0.02) * 1.5;
    h += Math.sin(x * 0.01 + z * 0.015) * 2.5;
    // Hilltop north
    var dh = Math.sqrt(x * x + Math.pow(z + 70, 2));
    if (dh < 25) h += Math.max(0, (25 - dh) * 0.4);
    // Canyon east
    if (x > 35 && x < 80 && z < -25 && z > -60) h -= 6;
    // Flatten spawn
    var ds = Math.sqrt(x * x + z * z);
    if (ds < 12) h *= ds / 12;
    positions[i + 1] = h;
  }
  ground.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  ground.createNormals(true);

  // Physics on ground
  if (scene.getPhysicsEngine()) {
    var groundBody = new BABYLON.PhysicsBody(ground, BABYLON.PhysicsMotionType.STATIC, false, scene);
    var groundShape = new BABYLON.PhysicsShapeMesh(ground, scene);
    groundBody.shape = groundShape;
    groundBody.setMassProperties({ mass: 0 });
  }

  // ─── HELPER: Get height at position ───────────────────
  function getGroundHeight(x, z) {
    var ray = new BABYLON.Ray(new BABYLON.Vector3(x, 100, z), new BABYLON.Vector3(0, -1, 0), 200);
    var hit = scene.pickWithRay(ray, function (mesh) { return mesh === ground; });
    if (hit && hit.hit) return hit.pickedPoint.y;
    return 0;
  }

  // ─── PLATFORMS ────────────────────────────────────────
  var platformMat = new BABYLON.StandardMaterial('platMat', scene);
  platformMat.diffuseColor = new BABYLON.Color3(0.35, 0.55, 0.2);
  platformMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  var platformConfigs = [
    { x: 5, y: 3, z: -8, w: 3, h: 0.5, d: 3 },
    { x: 10, y: 5, z: -12, w: 2.5, h: 0.5, d: 2.5 },
    { x: 15, y: 7, z: -10, w: 3, h: 0.5, d: 2 },
    { x: 8, y: 9, z: -16, w: 3.5, h: 0.5, d: 2 },
    { x: 30, y: 4, z: -20, w: 3, h: 0.6, d: 3 },
    { x: 35, y: 7, z: -25, w: 2.5, h: 0.5, d: 2.5 },
    { x: 38, y: 10, z: -28, w: 3, h: 0.5, d: 3 },
    { x: -30, y: 4, z: -10, w: 3, h: 0.5, d: 3 },
    { x: -35, y: 7, z: -15, w: 2.5, h: 0.5, d: 2.5 },
  ];

  platformConfigs.forEach(function (p) {
    var plat = BABYLON.MeshBuilder.CreateBox('plat', { width: p.w, height: p.h, depth: p.d }, scene);
    plat.position.set(p.x, p.y, p.z);
    plat.material = platformMat;
    plat.receiveShadows = true;
    shadowGen.addShadowCaster(plat);
    if (scene.getPhysicsEngine()) {
      var pb = new BABYLON.PhysicsBody(plat, BABYLON.PhysicsMotionType.STATIC, false, scene);
      pb.shape = new BABYLON.PhysicsShapeBox(new BABYLON.Vector3(0, 0, 0), new BABYLON.Quaternion(), new BABYLON.Vector3(p.w, p.h, p.d), scene);
      pb.setMassProperties({ mass: 0 });
    }
  });

  // ─── RINGS ────────────────────────────────────────────
  var ringMat = new BABYLON.StandardMaterial('ringMat', scene);
  ringMat.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
  ringMat.specularColor = new BABYLON.Color3(1, 1, 0.5);
  ringMat.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0);

  var rings = [];
  var ringPositions = [
    [3,1.5,-3],[5,1.5,-3],[7,1.5,-3],[9,1.5,-5],[11,1.5,-5],
    [-3,1.5,-4],[-5,1.5,-6],[0,2.5,-15],[0,3.5,-25],
    [5,4,-8],[10,6,-12],[30,5,-20],[35,8,-25],
    [15,1.5,5],[18,1.5,3],[-10,1.5,8],[20,1.5,-10],
    [-25,1.5,-5],[-28,1.5,-8],[-32,1.5,-10],
  ];

  ringPositions.forEach(function (pos) {
    var ring = BABYLON.MeshBuilder.CreateTorus('ring', { diameter: 0.6, thickness: 0.12, tessellation: 24 }, scene);
    ring.position.set(pos[0], pos[1], pos[2]);
    ring.material = ringMat;
    shadowGen.addShadowCaster(ring);
    rings.push({ mesh: ring, collected: false, baseY: pos[1] });
  });

  // ─── TREES ────────────────────────────────────────────
  var trunkMat = new BABYLON.StandardMaterial('trunkMat', scene);
  trunkMat.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.13);
  var leafMat = new BABYLON.StandardMaterial('leafMat', scene);
  leafMat.diffuseColor = new BABYLON.Color3(0.15, 0.45, 0.12);
  leafMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

  var treePositions = [
    [-10,-3],[-15,-10],[20,-8],[12,-15],[-8,-20],[18,-25],
    [-20,5],[25,3],[-5,10],[30,-12],[-25,-15],[15,8],
    [-35,-5],[-40,-12],[-30,2],[-38,-20],[-32,-8],
  ];

  treePositions.forEach(function (tp) {
    var h = getGroundHeight(tp[0], tp[1]);
    var s = 0.8 + Math.random() * 0.6;

    var trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 2.5 * s, diameterTop: 0.2 * s, diameterBottom: 0.35 * s }, scene);
    trunk.position.set(tp[0], h + 1.25 * s, tp[1]);
    trunk.material = trunkMat;
    shadowGen.addShadowCaster(trunk);

    var leaf = BABYLON.MeshBuilder.CreateSphere('leaf', { diameter: 2.5 * s, segments: 10 }, scene);
    leaf.position.set(tp[0], h + 3.2 * s, tp[1]);
    leaf.material = leafMat;
    shadowGen.addShadowCaster(leaf);

    var leaf2 = BABYLON.MeshBuilder.CreateSphere('leaf2', { diameter: 2 * s, segments: 8 }, scene);
    leaf2.position.set(tp[0] + 0.3 * s, h + 3.8 * s, tp[1] + 0.2 * s);
    leaf2.material = leafMat;
    shadowGen.addShadowCaster(leaf2);
  });

  // ─── WATER ────────────────────────────────────────────
  var waterMat = new BABYLON.StandardMaterial('waterMat', scene);
  waterMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.7);
  waterMat.specularColor = new BABYLON.Color3(0.8, 0.8, 1);
  waterMat.alpha = 0.7;

  var water = BABYLON.MeshBuilder.CreateDisc('water', { radius: 18, tessellation: 32 }, scene);
  water.rotation.x = Math.PI / 2;
  water.position.set(-25, -1, -40);
  water.material = waterMat;

  // ─── CHARACTER CREATION ───────────────────────────────
  var CHARS = {
    dash: { speed: 14, jump: 12, sprint: 1.8, doubleJump: true, color: [0.08, 0.33, 0.75] },
    turbo: { speed: 10, jump: 13, sprint: 1.4, doubleJump: false, color: [0.8, 0, 0] },
    murphy: { speed: 9, jump: 10, sprint: 1.3, doubleJump: false, color: [1, 0.71, 0.76] }
  };

  var selectedChar = 'dash';
  var player = null;
  var playerBody = null;

  function createCharacter(charKey) {
    var stats = CHARS[charKey];

    // Main body capsule
    var body = BABYLON.MeshBuilder.CreateCapsule('player', {
      height: 1.8, radius: 0.35, tessellation: 16, subdivisions: 6
    }, scene);
    body.position.set(0, 3, 0);

    var mat = new BABYLON.StandardMaterial('charMat', scene);
    mat.diffuseColor = new BABYLON.Color3(stats.color[0], stats.color[1], stats.color[2]);
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    body.material = mat;
    body.receiveShadows = true;
    shadowGen.addShadowCaster(body);

    // Head
    var head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 0.55, segments: 16 }, scene);
    head.parent = body;
    head.position.y = 0.85;

    var headMat = new BABYLON.StandardMaterial('headMat', scene);
    if (charKey === 'murphy') {
      headMat.diffuseColor = new BABYLON.Color3(1, 0.71, 0.76);
    } else {
      headMat.diffuseColor = new BABYLON.Color3(0.82, 0.63, 0.42);
    }
    headMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    head.material = headMat;

    // Helmet (for Dash and Turbo)
    if (charKey !== 'murphy') {
      var helmet = BABYLON.MeshBuilder.CreateSphere('helmet', { diameter: 0.6, segments: 16 }, scene);
      helmet.parent = body;
      helmet.position.y = 0.87;
      var hMat = new BABYLON.StandardMaterial('hMat', scene);
      hMat.diffuseColor = new BABYLON.Color3(stats.color[0], stats.color[1], stats.color[2]);
      hMat.specularColor = new BABYLON.Color3(1, 1, 1);
      hMat.specularPower = 64;
      helmet.material = hMat;

      // Visor
      var visor = BABYLON.MeshBuilder.CreateSphere('visor', { diameter: 0.5, segments: 12, slice: 0.35 }, scene);
      visor.parent = body;
      visor.position.set(0, 0.85, 0.15);
      var vMat = new BABYLON.StandardMaterial('vMat', scene);
      vMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
      vMat.specularColor = new BABYLON.Color3(1, 1, 1);
      vMat.specularPower = 128;
      vMat.alpha = 0.85;
      visor.material = vMat;
    }

    // Murphy extras (snout, ears)
    if (charKey === 'murphy') {
      var snout = BABYLON.MeshBuilder.CreateCylinder('snout', { height: 0.12, diameterTop: 0.18, diameterBottom: 0.2, tessellation: 12 }, scene);
      snout.parent = body;
      snout.position.set(0, 0.75, 0.28);
      snout.rotation.x = Math.PI / 2;
      snout.material = headMat;

      [-1, 1].forEach(function (side) {
        var ear = BABYLON.MeshBuilder.CreateSphere('ear', { diameter: 0.18, segments: 8 }, scene);
        ear.parent = body;
        ear.position.set(side * 0.22, 1.05, -0.05);
        ear.scaling.set(0.5, 1, 0.4);
        ear.material = headMat;
      });
    }

    // Physics body
    if (scene.getPhysicsEngine()) {
      var pb = new BABYLON.PhysicsBody(body, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);
      var shape = new BABYLON.PhysicsShapeCapsule(
        new BABYLON.Vector3(0, -0.55, 0),
        new BABYLON.Vector3(0, 0.55, 0),
        0.35, scene
      );
      pb.shape = shape;
      pb.setMassProperties({ mass: 1, inertia: new BABYLON.Vector3(0, 0, 0) });
      pb.setLinearDamping(0.1);
      pb.setAngularDamping(100); // prevent rotation
      playerBody = pb;
    }

    return body;
  }

  // ─── INPUT ────────────────────────────────────────────
  var keys = {};
  var gamepadInput = { lx: 0, lz: 0, rx: 0 };
  var grounded = false;
  var canDoubleJump = false;
  var velocity = new BABYLON.Vector3(0, 0, 0);
  var dashCooldown = 0;

  scene.onKeyboardObservable.add(function (info) {
    if (info.type === BABYLON.KeyboardEventTypes.KEYDOWN) keys[info.event.code] = true;
    if (info.type === BABYLON.KeyboardEventTypes.KEYUP) keys[info.event.code] = false;
  });

  // Gamepad
  var gamepadManager = new BABYLON.GamepadManager();
  gamepadManager.onGamepadConnectedObservable.add(function (gp) {
    var el = document.getElementById('controller-status');
    if (el) el.textContent = gp.id.substring(0, 20);
    gp.onleftstickchanged(function (v) { gamepadInput.lx = v.x; gamepadInput.lz = v.y; });
    gp.onrightstickchanged(function (v) { gamepadInput.rx = v.x; });
  });

  function getInput() {
    var mx = 0, mz = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (keys['KeyW'] || keys['ArrowUp']) mz += 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz -= 1;
    if (Math.abs(gamepadInput.lx) > 0.15) mx = gamepadInput.lx;
    if (Math.abs(gamepadInput.lz) > 0.15) mz = -gamepadInput.lz;
    return { mx: mx, mz: mz };
  }

  // ─── GAME STATE ───────────────────────────────────────
  var STATE = 'menu';
  var totalRings = 0;
  var menuEl = document.getElementById('menu-overlay');
  var hudEl = document.getElementById('hud');

  // Menu
  var charOptions = document.querySelectorAll('.char-option');
  charOptions.forEach(function (opt) {
    opt.addEventListener('click', function () {
      charOptions.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      selectedChar = opt.getAttribute('data-char');
    });
  });

  document.getElementById('btn-start').addEventListener('click', function () {
    startGame();
  });

  function startGame() {
    if (STATE === 'playing') return;
    STATE = 'playing';
    menuEl.style.display = 'none';
    hudEl.style.display = 'flex';
    if (player) { player.dispose(); }
    player = createCharacter(selectedChar);
    totalRings = 0;
  }

  // ─── GAME LOOP ────────────────────────────────────────
  var prevJump = false;
  var prevAbility = false;
  var prevAttack = false;

  scene.registerBeforeRender(function () {
    if (STATE !== 'playing' || !player) return;

    var dt = engine.getDeltaTime() / 1000;
    if (dt > 0.1) dt = 0.016;
    var stats = CHARS[selectedChar];

    // ─── Movement (camera-relative) ─────────────────────
    var input = getInput();
    var sprint = keys['ShiftLeft'] || keys['ShiftRight'] ? stats.sprint : 1;
    var speed = stats.speed * sprint;

    // Camera forward/right vectors (flattened to XZ)
    var camForward = camera.getForwardRay().direction;
    var forward = new BABYLON.Vector3(camForward.x, 0, camForward.z).normalize();
    var right = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), forward).normalize();

    var moveDir = forward.scale(input.mz).add(right.scale(input.mx));
    if (moveDir.length() > 1) moveDir.normalize();

    // Apply movement
    if (scene.getPhysicsEngine() && playerBody) {
      var currentVel = playerBody.getLinearVelocity();
      var targetVel = new BABYLON.Vector3(
        moveDir.x * speed,
        currentVel.y,
        moveDir.z * speed
      );

      // Smooth acceleration
      var lerpFactor = grounded ? 8 * dt : 3 * dt;
      var newVel = BABYLON.Vector3.Lerp(currentVel, targetVel, Math.min(lerpFactor, 1));
      newVel.y = currentVel.y;
      playerBody.setLinearVelocity(newVel);

      // Ground check (raycast down)
      var rayOrigin = player.position.clone();
      rayOrigin.y -= 0.6;
      var ray = new BABYLON.Ray(rayOrigin, new BABYLON.Vector3(0, -1, 0), 0.5);
      var hit = scene.pickWithRay(ray, function (m) { return m !== player && m.isPickable; });
      grounded = hit && hit.hit && hit.distance < 0.4;

      // Jump
      var jumpPress = keys['Space'];
      if (jumpPress && !prevJump && grounded) {
        var v = playerBody.getLinearVelocity();
        v.y = stats.jump;
        playerBody.setLinearVelocity(v);
        grounded = false;
        canDoubleJump = stats.doubleJump;
      } else if (jumpPress && !prevJump && canDoubleJump && !grounded) {
        var v2 = playerBody.getLinearVelocity();
        v2.y = stats.jump * 0.8;
        playerBody.setLinearVelocity(v2);
        canDoubleJump = false;
      }
      prevJump = jumpPress;

      // Abilities
      if (dashCooldown > 0) dashCooldown -= dt;

      var abilityPress = keys['KeyK'];
      if (abilityPress && !prevAbility && dashCooldown <= 0) {
        var facing = forward.scale(input.mz || 1).add(right.scale(input.mx));
        if (facing.length() < 0.1) facing = forward;
        facing.normalize();

        if (selectedChar === 'dash' && grounded) {
          // Speed Boost
          var bv = playerBody.getLinearVelocity();
          bv.x = facing.x * 35;
          bv.z = facing.z * 35;
          playerBody.setLinearVelocity(bv);
          dashCooldown = 0.7;
        } else if (selectedChar === 'turbo' && grounded) {
          // Rocket Jump
          var rv = playerBody.getLinearVelocity();
          rv.y = stats.jump * 2.2;
          rv.x += facing.x * 5;
          rv.z += facing.z * 5;
          playerBody.setLinearVelocity(rv);
          dashCooldown = 0.8;
        } else if (selectedChar === 'murphy' && !grounded) {
          // Ground Pound
          var gv = playerBody.getLinearVelocity();
          gv.y = -30;
          gv.x *= 0.2;
          gv.z *= 0.2;
          playerBody.setLinearVelocity(gv);
          dashCooldown = 0.5;
        }
      }
      prevAbility = abilityPress;

      var attackPress = keys['KeyJ'];
      if (attackPress && !prevAttack && dashCooldown <= 0) {
        var facing2 = forward.scale(input.mz || 1).add(right.scale(input.mx));
        if (facing2.length() < 0.1) facing2 = forward;
        facing2.normalize();

        if (selectedChar === 'dash' && grounded) {
          // Drift Slide
          var dv = playerBody.getLinearVelocity();
          dv.x = facing2.x * 25;
          dv.z = facing2.z * 25;
          playerBody.setLinearVelocity(dv);
          dashCooldown = 0.6;
        } else if (selectedChar === 'turbo' && !grounded) {
          // Nitro Kick
          var nv = playerBody.getLinearVelocity();
          nv.x = facing2.x * 28;
          nv.z = facing2.z * 28;
          nv.y = 2;
          playerBody.setLinearVelocity(nv);
          dashCooldown = 0.5;
        } else if (selectedChar === 'murphy' && grounded) {
          // Roll Attack
          var mv = playerBody.getLinearVelocity();
          mv.x = facing2.x * 22;
          mv.z = facing2.z * 22;
          playerBody.setLinearVelocity(mv);
          dashCooldown = 0.8;
        }
      }
      prevAttack = attackPress;

      // Face movement direction
      if (moveDir.length() > 0.1) {
        var targetRot = Math.atan2(moveDir.x, moveDir.z);
        var diff = targetRot - player.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        player.rotation.y += diff * 8 * dt;
      }

      // Prevent physics rotation
      playerBody.setAngularVelocity(BABYLON.Vector3.Zero());

    } else {
      // Fallback: manual movement (no physics engine)
      var moveSpeed = speed * dt;
      velocity.x = moveDir.x * speed;
      velocity.z = moveDir.z * speed;
      velocity.y -= 25 * dt;

      player.position.x += velocity.x * dt;
      player.position.z += velocity.z * dt;
      player.position.y += velocity.y * dt;

      // Ground collision (raycast)
      var groundY = getGroundHeight(player.position.x, player.position.z);
      if (player.position.y < groundY + 0.9) {
        player.position.y = groundY + 0.9;
        velocity.y = 0;
        grounded = true;
      } else {
        grounded = false;
      }

      // Jump
      var jPress = keys['Space'];
      if (jPress && !prevJump && grounded) {
        velocity.y = stats.jump;
        grounded = false;
        canDoubleJump = stats.doubleJump;
      } else if (jPress && !prevJump && canDoubleJump && !grounded) {
        velocity.y = stats.jump * 0.8;
        canDoubleJump = false;
      }
      prevJump = jPress;

      // Face direction
      if (moveDir.length() > 0.1) {
        player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
      }
    }

    // ─── Camera follow ──────────────────────────────────
    camera.target = BABYLON.Vector3.Lerp(camera.target, player.position, 5 * dt);

    // ─── Ring collection ────────────────────────────────
    rings.forEach(function (r) {
      if (r.collected) return;
      r.mesh.rotation.y += 2 * dt;
      r.mesh.position.y = r.baseY + Math.sin(Date.now() * 0.003 + r.mesh.position.x) * 0.15;
      if (BABYLON.Vector3.Distance(player.position, r.mesh.position) < 1.5) {
        r.collected = true;
        r.mesh.isVisible = false;
        totalRings++;
      }
    });

    // ─── Fall reset ─────────────────────────────────────
    if (player.position.y < -15) {
      player.position.set(0, 5, 0);
      if (playerBody) playerBody.setLinearVelocity(BABYLON.Vector3.Zero());
      velocity.set(0, 0, 0);
    }

    // ─── HUD ────────────────────────────────────────────
    document.getElementById('hud-char').textContent = selectedChar.toUpperCase();
    document.getElementById('hud-rings').textContent = '\u2666 ' + (totalRings * 10);

    var px = player.position.x, pz = player.position.z;
    var zone = 'MEADOW VILLAGE';
    if (px < -20 && px > -50 && pz > -35) zone = 'FOREST GROVE';
    if (pz < -55) zone = 'HILLTOP RUINS';
    if (px > 30 && pz < -20) zone = 'CANYON PASS';
    if (px > 25 && player.position.y > 8) zone = 'SKY ISLANDS';
    if (px < -15 && pz < -30 && pz > -55) zone = 'CRYSTAL LAKE';
    document.getElementById('hud-zone').textContent = zone;
  });

  // ─── RENDER LOOP ──────────────────────────────────────
  engine.runRenderLoop(function () {
    scene.render();
  });

  window.addEventListener('resize', function () {
    engine.resize();
  });

})();
