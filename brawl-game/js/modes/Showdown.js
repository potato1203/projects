const ZONE_START_RADIUS = 28;
const ZONE_END_RADIUS   = 2.5;
const ZONE_SHRINK_TIME  = 120; // seconds
const ZONE_DAMAGE       = 220; // per second outside zone

class Showdown extends GameMode {
  constructor(game) {
    super(game);
    this.zoneRadius  = ZONE_START_RADIUS;
    this.shrinkTimer = 0;
    this._zoneMesh   = null;
    this._aliveCount = 10;
  }

  init() {
    const game = this.game;

    // Spawn bots spread around the map
    const botCount = 9;
    const BrawlerClasses = game.BRAWLER_CLASSES;
    const spawnRadius = 22;

    // Player at center-ish
    const playerPos = game.map.randomOpenPosition(3);
    game.player = this._spawnBrawler(game.selectedBrawler.Class, 0, playerPos);
    // Give Poco reference to allBrawlers for super heal
    if (game.player.name === 'Poco') game.player._allBrawlers = game.allBrawlers;

    game.camera.snapTo(playerPos);

    // Bots at evenly spread angles
    for (let i = 0; i < botCount; i++) {
      const angle = (i / botCount) * Math.PI * 2;
      const bpos = new THREE.Vector3(
        Math.cos(angle) * spawnRadius,
        0,
        Math.sin(angle) * spawnRadius
      );
      // Clamp to open tile
      const openPos = game.map.randomOpenPosition(3);
      const Class = BrawlerClasses[i % BrawlerClasses.length];
      const { brawler } = this._spawnBot(Class, 2 + i, openPos);
      brawler._allBrawlers = game.allBrawlers;
    }

    this._aliveCount = game.allBrawlers.length;
    this._buildZoneMesh();
  }

  _buildZoneMesh() {
    // Fog-of-death zone: a large ring showing safe boundary
    const geo = new THREE.RingGeometry(this.zoneRadius - 0.5, this.zoneRadius + 0.5, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff2244, transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    this._zoneMesh = new THREE.Mesh(geo, mat);
    this._zoneMesh.position.y = 0.1;
    this.game.renderer.effectsGroup.add(this._zoneMesh);
  }

  update(dt) {
    if (this.over) return;
    const game = this.game;

    // Shrink zone
    this.shrinkTimer += dt;
    const t = Math.min(1, this.shrinkTimer / ZONE_SHRINK_TIME);
    this.zoneRadius = ZONE_START_RADIUS + (ZONE_END_RADIUS - ZONE_START_RADIUS) * t;

    // Update zone mesh
    if (this._zoneMesh) {
      // Rebuild ring geometry to match new radius
      const newGeo = new THREE.RingGeometry(this.zoneRadius - 0.5, this.zoneRadius + 0.5, 64);
      newGeo.rotateX(-Math.PI / 2);
      this._zoneMesh.geometry.dispose();
      this._zoneMesh.geometry = newGeo;
    }

    // Zone damage
    const r2 = this.zoneRadius * this.zoneRadius;
    for (const b of game.allBrawlers) {
      if (!b.isAlive) continue;
      const dx = b.position.x;
      const dz = b.position.z;
      if (dx * dx + dz * dz > r2) {
        b.takeDamage(ZONE_DAMAGE * dt, null);
      }
    }

    // Check victory
    if (game.player && !game.player.isAlive && !this.over) {
      this._endGame(false);
    }
  }

  onBrawlerDied(brawler) {
    this._aliveCount--;
    if (this.game.player && brawler !== this.game.player && this._aliveCount === 1) {
      // Only player left
      this._endGame(true);
    }
  }

  getHUDData() {
    return {
      modeText: `💀 <b>${this._aliveCount}</b> alive · Zone: ${Math.round(this.zoneRadius)}m`,
    };
  }

  getBotGoal(botAI, allBrawlers) {
    const b = botAI.brawler;
    const r2 = this.zoneRadius * this.zoneRadius;
    const dx = b.position.x;
    const dz = b.position.z;
    // If outside zone, go toward center
    if (dx * dx + dz * dz > r2 * 0.85) {
      return { x: 0, z: 0 };
    }
    return null; // let FSM chase nearest enemy
  }

  cleanup() {
    if (this._zoneMesh) {
      this.game.renderer.effectsGroup.remove(this._zoneMesh);
      this._zoneMesh.geometry.dispose();
    }
    for (const b of this.game.allBrawlers) b.remove();
  }
}
