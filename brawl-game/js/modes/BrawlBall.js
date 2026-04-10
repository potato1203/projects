const WIN_GOALS   = 2;
const GOAL_WIDTH  = 4;   // z-extent of goal opening (-2 to +2)
const GOAL_X_LEFT = -24; // x boundary for left goal
const GOAL_X_RIGHT = 24; // x boundary for right goal
const BALL_DRAG   = 0.88; // velocity multiplier per frame (60fps base)
const BALL_IMPULSE = 8.5; // speed imparted when brawler touches ball
const PROJ_IMPULSE = 3.5; // speed imparted by projectile hit

class BrawlBall extends GameMode {
  constructor(game) {
    super(game);
    this.score     = [0, 0]; // [team0, team1]
    this._ball     = null;
    this._resetTimer = 0;
    this._resetting = false;
  }

  init() {
    const game = this.game;
    const BrawlerClasses = game.BRAWLER_CLASSES;

    // Team 0 left, team 1 right
    const leftPos  = [
      new THREE.Vector3(-12, 0, -2), new THREE.Vector3(-12, 0, 2), new THREE.Vector3(-10, 0, 0),
    ];
    const rightPos = [
      new THREE.Vector3(12, 0, -2), new THREE.Vector3(12, 0, 2), new THREE.Vector3(10, 0, 0),
    ];

    game.player = this._spawnBrawler(game.selectedBrawler.Class, 0, leftPos[0]);
    for (let i = 1; i < 3; i++) {
      this._spawnBot(BrawlerClasses[(i+1) % BrawlerClasses.length], 0, leftPos[i]);
    }
    for (let i = 0; i < 3; i++) {
      this._spawnBot(BrawlerClasses[(i+3) % BrawlerClasses.length], 1, rightPos[i]);
    }

    game.camera.snapTo(leftPos[0]);
    this._spawnBall();
  }

  _spawnBall() {
    if (this._ball) {
      this.game.renderer.effectsGroup.remove(this._ball.mesh);
      this._ball.mesh.geometry.dispose();
    }
    const geo = new THREE.SphereGeometry(0.55, 12, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.55, 0);
    mesh.castShadow = true;
    this.game.renderer.effectsGroup.add(mesh);

    this._ball = {
      mesh,
      x: 0, z: 0,
      vx: 0, vz: 0,
    };
  }

  update(dt) {
    if (this.over) return;
    const game = this.game;

    // Respawn dead brawlers
    for (const b of game.allBrawlers) {
      if (!b.isAlive && b._respawnTimer === undefined) {
        b._respawnTimer = 3.0;
      }
      if (b._respawnTimer !== undefined && b._respawnTimer > 0) {
        b._respawnTimer -= dt;
        if (b._respawnTimer <= 0) {
          const pos = b.team === 0
            ? new THREE.Vector3(-10 + (Math.random()-0.5)*2, 0, (Math.random()-0.5)*4)
            : new THREE.Vector3( 10 + (Math.random()-0.5)*2, 0, (Math.random()-0.5)*4);
          b.respawn(pos);
          b._respawnTimer = undefined;
        }
      }
    }

    if (this._resetting) {
      this._resetTimer -= dt;
      if (this._resetTimer <= 0) {
        this._resetting = false;
        this._spawnBall();
      }
      return;
    }

    if (!this._ball) return;
    const ball = this._ball;

    // Drag
    const drag = Math.pow(BALL_DRAG, dt * 60);
    ball.vx *= drag;
    ball.vz *= drag;

    // Move
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;

    // Wall bounce (simple map bounds)
    const map = game.map;
    if (map.pointSolid(ball.x, ball.z)) {
      ball.vx = -ball.vx * 0.6;
      ball.vz = -ball.vz * 0.6;
      ball.x -= ball.vx * dt * 2;
      ball.z -= ball.vz * dt * 2;
    }

    // Brawler-ball collision → impulse
    for (const b of game.allBrawlers) {
      if (!b.isAlive) continue;
      const dx = ball.x - b.position.x;
      const dz = ball.z - b.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.55 + b.collisionRadius) {
        const nx = dx / Math.max(dist, 0.01);
        const nz = dz / Math.max(dist, 0.01);
        ball.vx = nx * BALL_IMPULSE;
        ball.vz = nz * BALL_IMPULSE;
        // Push ball out of overlap
        ball.x = b.position.x + nx * (0.55 + b.collisionRadius + 0.05);
        ball.z = b.position.z + nz * (0.55 + b.collisionRadius + 0.05);
      }
    }

    // Clamp z
    const halfH = map.halfH - 1;
    if (Math.abs(ball.z) > halfH) { ball.z = Math.sign(ball.z) * halfH; ball.vz *= -0.5; }

    // Goal detection
    if (ball.x <= GOAL_X_LEFT  && Math.abs(ball.z) < GOAL_WIDTH / 2) { this._goal(1); return; }
    if (ball.x >= GOAL_X_RIGHT && Math.abs(ball.z) < GOAL_WIDTH / 2) { this._goal(0); return; }

    // Clamp x (no goal scored)
    const halfW = map.halfW - 1;
    if (Math.abs(ball.x) > halfW) { ball.x = Math.sign(ball.x) * halfW; ball.vx *= -0.5; }

    ball.mesh.position.set(ball.x, 0.55, ball.z);
    ball.mesh.rotation.y += dt * 2;
  }

  _goal(scoringTeam) {
    this.score[scoringTeam]++;
    // Flash effect (just reset ball)
    this._resetting = true;
    this._resetTimer = 1.8;
    if (this._ball) {
      this._ball.mesh.visible = false;
    }

    if (this.score[scoringTeam] >= WIN_GOALS) {
      this._endGame(scoringTeam === 0);
    }
  }

  onBrawlerDied() { /* respawn handled in update */ }

  getHUDData() {
    return {
      modeText: `⚽ <span style="color:#4488ff">${this.score[0]}</span> — <span style="color:#ff4444">${this.score[1]}</span>  (First to ${WIN_GOALS})`,
    };
  }

  getBotGoal(botAI, allBrawlers) {
    const b = botAI.brawler;
    const ball = this._ball;
    if (!ball) return null;
    // Move toward ball, then kick toward opponent's goal
    const isGoalkeeper = botAI._isGoalkeeper;
    if (isGoalkeeper) {
      // Stay near own goal
      const gx = b.team === 0 ? GOAL_X_LEFT + 6 : GOAL_X_RIGHT - 6;
      return { x: gx, z: ball.z * 0.5 };
    }
    return { x: ball.x, z: ball.z };
  }

  cleanup() {
    if (this._ball) {
      this.game.renderer.effectsGroup.remove(this._ball.mesh);
      this._ball.mesh.geometry.dispose();
    }
    for (const b of this.game.allBrawlers) b.remove();
  }
}
