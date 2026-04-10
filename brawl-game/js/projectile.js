const _v = new THREE.Vector3();

class ProjectileManager {
  constructor(scene, projectileGroup) {
    this.projectileGroup = projectileGroup;
    this.projectiles = [];
    this._puddles = []; // Barley splash puddles
  }

  spawn(config) {
    // config: { origin, dirX, dirZ, speed, damage, owner, team, range, radius, arc, pierce, onHit }
    const p = new Projectile(config, this.projectileGroup);
    this.projectiles.push(p);
    return p;
  }

  update(dt, physics, allBrawlers, map) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.update(dt, physics, allBrawlers, map);
    }
  }

  removeAll() {
    for (const p of this.projectiles) p.destroy();
    this.projectiles = [];
  }
}

// Color, size, emissive for each type
const PROJ_CONFIG = {
  bullet: { color: 0xffee22, emissive: 0xff9900, size: 0.18, speed: 1 },
  shell:  { color: 0xff8800, emissive: 0xff4400, size: 0.22, speed: 1 },
  rocket: { color: 0xff3300, emissive: 0xff1100, size: 0.30, speed: 1 },
  blade:  { color: 0x88ddff, emissive: 0x44aaff, size: 0.20, speed: 1 },
  bottle: { color: 0x44ff88, emissive: 0x00cc44, size: 0.26, speed: 1 },
  wave:   { color: 0xff88ff, emissive: 0xcc00cc, size: 0.32, speed: 1 },
};

class Projectile {
  constructor(cfg, group) {
    this.owner  = cfg.owner;
    this.team   = cfg.team;
    this.damage = cfg.damage;
    this.speed  = cfg.speed;
    this.range  = cfg.range;
    this.radius = cfg.radius ?? 0.18;
    this.pierce = cfg.pierce ?? false;
    this.arc    = cfg.arc ?? false;
    this.onHit  = cfg.onHit ?? null;
    this.type   = cfg.type ?? 'bullet';
    this.active = true;
    this.hitBrawlers = new Set();

    this.pos = new THREE.Vector3(cfg.origin.x, cfg.origin.y ?? 0.7, cfg.origin.z);
    this.dirX = cfg.dirX;
    this.dirZ = cfg.dirZ;
    this.distTraveled = 0;

    // Arc params
    this._arcT = 0;
    this._startY = this.pos.y;
    this._arcTime = this.range / this.speed;

    // Mesh — glowing style with emissive
    const pCfg = PROJ_CONFIG[this.type] ?? PROJ_CONFIG.bullet;
    let geo;
    if (this.type === 'bottle') {
      geo = new THREE.SphereGeometry(pCfg.size, 8, 8);
    } else if (this.type === 'wave') {
      geo = new THREE.TorusGeometry(pCfg.size, pCfg.size * 0.35, 6, 10);
    } else if (this.type === 'rocket') {
      geo = new THREE.CylinderGeometry(pCfg.size * 0.5, pCfg.size, pCfg.size * 2.4, 8);
    } else {
      geo = new THREE.SphereGeometry(pCfg.size, 8, 8);
    }
    const mat = new THREE.MeshBasicMaterial({ color: pCfg.color });
    this.mesh = new THREE.Mesh(geo, mat);

    // Outer glow sphere
    const glowGeo = new THREE.SphereGeometry(pCfg.size * 1.7, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: pCfg.emissive, transparent: true, opacity: 0.35,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(glow);

    // Point light for dynamic lighting
    const light = new THREE.PointLight(pCfg.emissive, 1.8, 5.0);
    this.mesh.add(light);

    this.mesh.position.copy(this.pos);
    group.add(this.mesh);
  }

  update(dt, physics, allBrawlers, map) {
    if (!this.active) return;

    const step = this.speed * dt;
    this.distTraveled += step;

    // Move
    this.pos.x += this.dirX * step;
    this.pos.z += this.dirZ * step;

    // Arc Y
    if (this.arc) {
      this._arcT += dt / this._arcTime;
      const t = this._arcT;
      this.pos.y = this._startY + 4 * t * (1 - t) * 3.5; // parabola, max height 3.5
    }

    this.mesh.position.copy(this.pos);

    // Check range
    if (this.distTraveled >= this.range) {
      if (this.onHit) this.onHit(null, this.pos);
      this.destroy();
      return;
    }

    // Check wall collision (skip for arc projectiles in flight)
    if (!this.arc && map.pointSolid(this.pos.x, this.pos.z)) {
      this.destroy();
      return;
    }

    // Check brawler hits
    for (const b of allBrawlers) {
      if (b === this.owner) continue;
      if (b.team === this.team) continue;
      if (!b.isAlive) continue;
      if (this.hitBrawlers.has(b)) continue;

      const dx = this.pos.x - b.position.x;
      const dz = this.pos.z - b.position.z;
      if (dx * dx + dz * dz < (this.radius + b.collisionRadius) * (this.radius + b.collisionRadius)) {
        b.takeDamage(this.damage, this.owner);
        if (this.onHit) this.onHit(b, this.pos);
        if (this.pierce) {
          this.hitBrawlers.add(b);
        } else {
          this.destroy();
          return;
        }
      }
    }
  }

  destroy() {
    this.active = false;
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}

// Splash/AoE puddle effect
class Puddle {
  constructor(scene, effectsGroup, wx, wz, radius, damage, duration) {
    this.scene = scene;
    this.effectsGroup = effectsGroup;
    this.x = wx;
    this.z = wz;
    this.radius = radius;
    this.damage = damage; // damage/sec
    this.timeLeft = duration;
    this.active = true;

    const geo = new THREE.CircleGeometry(radius, 12);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.55 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(wx, 0.05, wz);
    effectsGroup.add(this.mesh);
  }

  update(dt, allBrawlers) {
    if (!this.active) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.destroy(); return; }

    for (const b of allBrawlers) {
      if (!b.isAlive) continue;
      const dx = b.position.x - this.x;
      const dz = b.position.z - this.z;
      if (dx * dx + dz * dz < this.radius * this.radius) {
        b.takeDamage(this.damage * dt, null);
      }
    }
  }

  destroy() {
    this.active = false;
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}
