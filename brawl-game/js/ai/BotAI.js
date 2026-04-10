// Finite State Machine bot controller
const BOT_STATES = { IDLE: 'idle', SEEK: 'seek', CHASE: 'chase', ATTACK: 'attack', FLEE: 'flee' };
const FSM_TICK = 0.18; // seconds between full FSM evaluations

const _mv = { x: 0, z: 0 };

class BotAI {
  constructor(brawler) {
    this.brawler = brawler;
    this.state = BOT_STATES.IDLE;
    this.target = null;
    this.goalPos = null; // THREE.Vector3 or {x,z}
    this._fsmTimer = Math.random() * FSM_TICK; // stagger bots
    this._stuckTimer = 0;
    this._lastPos = { x: 0, z: 0 };
    this._moveDir = { x: 0, z: 0 };
    this._aimDir  = { x: 0, z: -1 };
  }

  // Returns an input snapshot for brawler.update()
  update(dt, gameMode, allBrawlers, map) {
    if (!this.brawler.isAlive) return { moveDir: _mv, aimDir: _mv, attack: false, useSuper: false };

    this._fsmTimer -= dt;
    if (this._fsmTimer <= 0) {
      this._fsmTimer = FSM_TICK;
      this._updateFSM(gameMode, allBrawlers, map);
    }

    // Stuck detection
    const b = this.brawler;
    const dx = b.position.x - this._lastPos.x;
    const dz = b.position.z - this._lastPos.z;
    if (dx * dx + dz * dz < 0.01) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 1.2) {
        // Wiggle out
        this._moveDir.x = (Math.random() - 0.5) * 2;
        this._moveDir.z = (Math.random() - 0.5) * 2;
        this._stuckTimer = 0;
      }
    } else {
      this._stuckTimer = 0;
    }
    this._lastPos.x = b.position.x;
    this._lastPos.z = b.position.z;

    const attack = this.state === BOT_STATES.ATTACK && this.target;
    const useSuper = attack && b.superCharge >= 1;

    return {
      moveDir: this._moveDir,
      aimDir:  this._aimDir,
      attack,
      useSuper,
      aimWorld: this.target ? this.target.position : null,
    };
  }

  _updateFSM(gameMode, allBrawlers, map) {
    const b = this.brawler;
    const hpPct = b.health / b.maxHealth;

    // Find nearest enemy
    this.target = this._findNearestEnemy(allBrawlers);
    // Get mode-specific goal
    this.goalPos = gameMode.getBotGoal(this, allBrawlers);

    const distToTarget = this.target ? this._dist(b.position, this.target.position) : Infinity;
    const inRange = distToTarget <= b.attackRange * 0.9;

    // FSM transitions
    if (hpPct < 0.25) {
      this.state = BOT_STATES.FLEE;
    } else if (inRange && this.target) {
      this.state = BOT_STATES.ATTACK;
    } else if (this.target && distToTarget < b.attackRange * 2.5) {
      this.state = BOT_STATES.CHASE;
    } else if (this.goalPos) {
      this.state = BOT_STATES.SEEK;
    } else {
      this.state = BOT_STATES.IDLE;
    }

    this._computeMove(map);
  }

  _computeMove(map) {
    const b = this.brawler;

    if (this.state === BOT_STATES.IDLE) {
      this._moveDir.x = 0;
      this._moveDir.z = 0;
      return;
    }

    let gx, gz;

    if (this.state === BOT_STATES.FLEE) {
      // Move away from nearest threat
      if (this.target) {
        gx = b.position.x + (b.position.x - this.target.position.x);
        gz = b.position.z + (b.position.z - this.target.position.z);
      } else {
        gx = 0; gz = 0;
      }
    } else if (this.state === BOT_STATES.ATTACK) {
      // Circle-strafe around target at attack range
      if (this.target) {
        const tx = this.target.position.x;
        const tz = this.target.position.z;
        const dx = b.position.x - tx;
        const dz = b.position.z - tz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const desired = b.attackRange * 0.75;
        if (dist > desired + 0.5) {
          gx = tx; gz = tz; // move closer
        } else if (dist < desired - 0.5) {
          gx = b.position.x + dx; gz = b.position.z + dz; // back off
        } else {
          // Strafe: perpendicular movement
          this._moveDir.x = -dz / dist * 0.7;
          this._moveDir.z = dx / dist * 0.7;
          // Aim at target
          this._aimDir.x = -dx / dist;
          this._aimDir.z = -dz / dist;
          return;
        }
      }
    } else if ((this.state === BOT_STATES.CHASE) && this.target) {
      gx = this.target.position.x;
      gz = this.target.position.z;
    } else if (this.state === BOT_STATES.SEEK && this.goalPos) {
      gx = this.goalPos.x;
      gz = this.goalPos.z;
    }

    // Aim at target while moving
    if (this.target) {
      const tx = this.target.position.x - b.position.x;
      const tz = this.target.position.z - b.position.z;
      const td = Math.sqrt(tx * tx + tz * tz);
      if (td > 0) { this._aimDir.x = tx / td; this._aimDir.z = tz / td; }
    }

    if (gx !== undefined && gz !== undefined) {
      let dx = gx - b.position.x;
      let dz = gz - b.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.5) { this._moveDir.x = 0; this._moveDir.z = 0; return; }

      dx /= dist; dz /= dist;

      // Wall avoidance: if blocked, try perpendicular directions
      if (map.pointSolid(b.position.x + dx * 0.8, b.position.z + dz * 0.8)) {
        const perp1x = -dz, perp1z = dx;
        const perp2x = dz,  perp2z = -dx;
        if (!map.pointSolid(b.position.x + perp1x * 0.8, b.position.z + perp1z * 0.8)) {
          dx = perp1x; dz = perp1z;
        } else if (!map.pointSolid(b.position.x + perp2x * 0.8, b.position.z + perp2z * 0.8)) {
          dx = perp2x; dz = perp2z;
        }
      }

      this._moveDir.x = dx;
      this._moveDir.z = dz;
    }
  }

  _findNearestEnemy(allBrawlers) {
    const b = this.brawler;
    let nearest = null;
    let minDist = Infinity;
    for (const other of allBrawlers) {
      if (other === b || !other.isAlive) continue;
      if (other.team === b.team) continue;
      // Leon stealth check
      if (other.isStealthed) continue;
      const dx = other.position.x - b.position.x;
      const dz = other.position.z - b.position.z;
      const d = dx * dx + dz * dz;
      if (d < minDist) { minDist = d; nearest = other; }
    }
    return nearest;
  }

  _dist(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
