const WIN_GEMS   = 10;
const HOLD_TIME  = 16; // seconds to hold 10 gems to win
const GEM_SPAWN_INTERVAL = 7;

class Gem {
  constructor(pos, scene, effectsGroup) {
    this.x = pos.x; this.z = pos.z;
    this.holder = null;
    this.active = true;

    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x9b59b6, emissive: 0x6c3483, emissiveIntensity: 0.6 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(pos.x, 0.5, pos.z);
    this._bob = Math.random() * Math.PI * 2;
    effectsGroup.add(this.mesh);
    this._effectsGroup = effectsGroup;
  }

  update(dt) {
    if (!this.active || this.holder) return;
    this._bob += dt * 2;
    this.mesh.position.y = 0.5 + Math.sin(this._bob) * 0.15;
    this.mesh.rotation.y += dt * 1.5;
  }

  pickup(brawler) {
    this.holder = brawler;
    this.mesh.visible = false;
    this.active = false;
  }

  drop(x, z) {
    this.holder = null;
    this.x = x; this.z = z;
    this.mesh.position.set(x, 0.5, z);
    this.mesh.visible = true;
    this.active = true;
  }

  destroy() {
    this._effectsGroup.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
}

class GemGrab extends GameMode {
  constructor(game) {
    super(game);
    this.gems       = [];
    this.teamGems   = [0, 0]; // [team0 count, team1 count]
    this.holdTimer  = [0, 0];
    this._spawnTimer = 0;
    this._gemCountEl = null;
  }

  init() {
    const game = this.game;
    const BrawlerClasses = game.BRAWLER_CLASSES;
    const map = game.map;

    // Team 0 spawns left, team 1 right
    const leftPositions  = [
      new THREE.Vector3(-16, 0, -2), new THREE.Vector3(-16, 0, 2), new THREE.Vector3(-14, 0, 0),
    ];
    const rightPositions = [
      new THREE.Vector3(16, 0, -2), new THREE.Vector3(16, 0, 2), new THREE.Vector3(14, 0, 0),
    ];

    // Team 0: player + 2 bots
    game.player = this._spawnBrawler(game.selectedBrawler.Class, 0, leftPositions[0]);
    if (game.player.name === 'Poco') game.player._allBrawlers = game.allBrawlers;

    for (let i = 1; i < 3; i++) {
      const Class = BrawlerClasses[(i + 1) % BrawlerClasses.length];
      const { brawler } = this._spawnBot(Class, 0, leftPositions[i]);
      brawler._allBrawlers = game.allBrawlers;
    }

    // Team 1: 3 enemy bots
    for (let i = 0; i < 3; i++) {
      const Class = BrawlerClasses[(i + 3) % BrawlerClasses.length];
      const { brawler } = this._spawnBot(Class, 1, rightPositions[i]);
      brawler._allBrawlers = game.allBrawlers;
    }

    game.camera.snapTo(leftPositions[0]);

    // Spawn initial gems from center mine
    this._spawnGems(5);
  }

  _spawnGems(count) {
    const map = this.game.map;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 1 + Math.random() * 2;
      const pos = { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
      const gem = new Gem(pos, this.game.renderer.scene, this.game.renderer.effectsGroup);
      this.gems.push(gem);
    }
  }

  update(dt) {
    if (this.over) return;
    const game = this.game;

    // Respawn dead brawlers
    for (const b of game.allBrawlers) {
      if (!b.isAlive && !b._respawnTimer) {
        b._respawnTimer = 3.0;
      }
      if (b._respawnTimer !== undefined && b._respawnTimer > 0) {
        b._respawnTimer -= dt;
        if (b._respawnTimer <= 0) {
          const pos = b.team === 0
            ? new THREE.Vector3(-14 + Math.random() * 2 - 1, 0, Math.random() * 4 - 2)
            : new THREE.Vector3(14  + Math.random() * 2 - 1, 0, Math.random() * 4 - 2);
          b.respawn(pos);
          b._respawnTimer = undefined;
        }
      }
    }

    // Gem spawner
    this._spawnTimer += dt;
    if (this._spawnTimer >= GEM_SPAWN_INTERVAL) {
      this._spawnTimer = 0;
      this._spawnGems(1);
    }

    // Update gem animations
    this.gems.forEach(g => g.update(dt));

    // Gem pickup detection
    this.teamGems = [0, 0];
    for (const gem of this.gems) {
      if (!gem.active) {
        if (gem.holder) this.teamGems[gem.holder.team]++;
        continue;
      }
      // Check if any brawler walks over it
      for (const b of game.allBrawlers) {
        if (!b.isAlive) continue;
        const dx = b.position.x - gem.x;
        const dz = b.position.z - gem.z;
        if (dx * dx + dz * dz < 1.0) {
          gem.pickup(b);
          this.teamGems[b.team]++;
          break;
        }
      }
    }

    // Win condition: hold WIN_GEMS for HOLD_TIME
    for (let t = 0; t < 2; t++) {
      if (this.teamGems[t] >= WIN_GEMS) {
        this.holdTimer[t] += dt;
        if (this.holdTimer[t] >= HOLD_TIME) {
          this._endGame(t === 0);
          return;
        }
      } else {
        this.holdTimer[t] = 0;
      }
    }

    // Check if player died permanently (no... always respawn)
  }

  onBrawlerDied(brawler) {
    // Drop held gems
    const dropped = [];
    for (const gem of this.gems) {
      if (gem.holder === brawler) {
        gem.drop(brawler.position.x + (Math.random()-0.5)*2, brawler.position.z + (Math.random()-0.5)*2);
      }
    }
  }

  getHUDData() {
    const t = this.holdTimer[0] > 0 ? ` (${Math.ceil(HOLD_TIME - this.holdTimer[0])}s)` :
              this.holdTimer[1] > 0 ? ` (${Math.ceil(HOLD_TIME - this.holdTimer[1])}s)` : '';
    return {
      modeText: `💎 <span style="color:#4488ff">Team: ${this.teamGems[0]}</span> · <span style="color:#ff4444">${this.teamGems[1]} :Enemy</span>${t}`,
    };
  }

  getBotGoal(botAI, allBrawlers) {
    const b = botAI.brawler;
    // Find nearest unclaimed gem
    let nearest = null, minD = Infinity;
    for (const gem of this.gems) {
      if (!gem.active) continue;
      const dx = gem.x - b.position.x;
      const dz = gem.z - b.position.z;
      const d = dx * dx + dz * dz;
      if (d < minD) { minD = d; nearest = gem; }
    }
    if (nearest && this.teamGems[b.team] < WIN_GEMS - 2) {
      return { x: nearest.x, z: nearest.z };
    }
    // Defend — go toward own base
    return b.team === 0 ? { x: -14, z: 0 } : { x: 14, z: 0 };
  }

  cleanup() {
    for (const gem of this.gems) gem.destroy();
    this.gems = [];
    for (const b of this.game.allBrawlers) b.remove();
  }
}
