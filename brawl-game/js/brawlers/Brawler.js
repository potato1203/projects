// Base class for all brawlers (player & bots)
class Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    this.scene = scene;
    this.brawlerGroup = brawlerGroup;
    this.effectsGroup = effectsGroup;

    // --- Override in subclass ---
    this.name           = 'Brawler';
    this.maxHealth      = 3000;
    this.speed          = 3.5;
    this.attackDamage   = 300;
    this.attackRange    = 7;
    this.attackCooldown = 1.2;
    this.collisionRadius = 0.65;
    this.bodyColor      = 0x888888;
    this.team           = 0;

    // --- Runtime ---
    this.health      = this.maxHealth;
    this.superCharge = 0;
    this.isAlive     = true;
    this.position    = new THREE.Vector3();
    this._atkTimer   = 0;
    this._superTimer = 0;
    this._invincibleTimer = 0;

    // Health bar (sprite above head)
    this._hpCanvas = document.createElement('canvas');
    this._hpCanvas.width  = 128;
    this._hpCanvas.height = 20;
    this._hpCtx = this._hpCanvas.getContext('2d');
    this._hpTex = new THREE.CanvasTexture(this._hpCanvas);
    this._lastHpDrawn = -1;

    this.mesh      = null;
    this._hpSprite = null;
    this._teamRing = null;
  }

  // Call after setting team/position
  init(pos) {
    this.position.copy(pos);
    this.health      = this.maxHealth;
    this.superCharge = 0;
    this.isAlive     = true;
    this._atkTimer   = 0;

    this.mesh = this._buildMesh();
    this.mesh.position.set(pos.x, 0, pos.z);
    this.mesh.castShadow = true;

    // ── Outline ──────────────────────────────────────────────────────────────
    addOutline(this.mesh, 0.075, 0x111111);

    // ── Team ground ring ─────────────────────────────────────────────────────
    const ringColor = this.team === 0 ? 0x2299ff : 0xff2244;
    const ringGeo = new THREE.RingGeometry(this.collisionRadius + 0.08, this.collisionRadius + 0.45, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor, transparent: true, opacity: 0.75, side: THREE.DoubleSide,
    });
    this._teamRing = new THREE.Mesh(ringGeo, ringMat);
    this._teamRing.position.y = 0.04;
    this.mesh.add(this._teamRing);

    // ── Health bar sprite ─────────────────────────────────────────────────────
    this._hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._hpTex, depthTest: false }));
    this._hpSprite.scale.set(2.2, 0.35, 1);
    this._hpSprite.position.y = 3.2;
    this.mesh.add(this._hpSprite);
    this._drawHealthBar();

    this.brawlerGroup.add(this.mesh);
  }

  // Override in subclasses to build character-specific mesh
  _buildMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10),
      toonMat(this.bodyColor)
    );
    body.position.y = 0.6;
    body.castShadow = true;
    g.add(body);
    return g;
  }

  _drawHealthBar() {
    const pct = Math.max(0, this.health / this.maxHealth);
    if (Math.abs(pct - this._lastHpDrawn) < 0.004) return;
    this._lastHpDrawn = pct;

    const ctx = this._hpCtx;
    const W = this._hpCanvas.width, H = this._hpCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 2, r = H / 2 - pad;

    // Dark background with border
    ctx.fillStyle = '#111';
    this._roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, r);
    ctx.fill();

    // White border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, r);
    ctx.stroke();

    // Bar fill
    const barW = (W - pad * 2 - 2) * pct;
    if (barW > 0) {
      const hue = pct * 120; // green→red
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,   `hsl(${hue},90%,35%)`);
      grad.addColorStop(0.5, `hsl(${hue},90%,55%)`);
      grad.addColorStop(1,   `hsl(${hue},90%,40%)`);
      ctx.fillStyle = grad;
      this._roundRect(ctx, pad + 1, pad + 1, barW, H - pad * 2 - 2, r - 1);
      ctx.fill();

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      this._roundRect(ctx, pad + 1, pad + 1, barW, (H - pad * 2 - 2) * 0.45, r - 1);
      ctx.fill();
    }

    this._hpTex.needsUpdate = true;
  }

  _roundRect(ctx, x, y, w, h, r) {
    if (w < 0) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  update(dt, input, projManager) {
    if (!this.isAlive) return;

    this._atkTimer = Math.max(0, this._atkTimer - dt);
    if (this._invincibleTimer > 0) this._invincibleTimer -= dt;

    // Movement
    let mx = 0, mz = 0;
    if (input.up)    mz -= 1;
    if (input.down)  mz += 1;
    if (input.left)  mx -= 1;
    if (input.right) mx += 1;
    if (input.moveDir) { mx = input.moveDir.x; mz = input.moveDir.z; }

    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) {
      mx /= len; mz /= len;
      this.position.x += mx * this.speed * dt;
      this.position.z += mz * this.speed * dt;
    }

    // Aim direction
    let aimX = 0, aimZ = -1;
    if (input.aimWorld) {
      const dx = input.aimWorld.x - this.position.x;
      const dz = input.aimWorld.z - this.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.1) { aimX = dx / d; aimZ = dz / d; }
    } else if (input.aimDir) {
      aimX = input.aimDir.x; aimZ = input.aimDir.z;
    }

    // Face direction of aim
    if (aimX !== 0 || aimZ !== 0) {
      this.mesh.rotation.y = Math.atan2(aimX, aimZ);
    }

    // Bob idle animation
    this.mesh.position.y = Math.sin(Date.now() * 0.003 + this.position.x) * 0.04;

    // Attack
    if (input.attack && this._atkTimer <= 0 && projManager) {
      this._atkTimer = this.attackCooldown;
      this.doAttack(aimX, aimZ, projManager);
    }

    // Super
    if (input.useSuper && this.superCharge >= 1 && projManager) {
      this.superCharge = 0;
      this.doSuper(aimX, aimZ, projManager);
    }

    // Super timer
    if (this._superTimer > 0) {
      this._superTimer -= dt;
      this.onSuperTick(dt);
    }

    // Sync mesh to position
    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
    this._drawHealthBar();
  }

  doAttack(aimX, aimZ, projManager) {
    projManager.spawn({
      origin: this.position, dirX: aimX, dirZ: aimZ,
      speed: 14, damage: this.attackDamage,
      owner: this, team: this.team,
      range: this.attackRange, radius: 0.2, type: 'bullet',
    });
    this.chargeSuper(0.08);
  }

  doSuper(aimX, aimZ, projManager) {}
  onSuperTick(dt) {}

  chargeSuper(amount) {
    this.superCharge = Math.min(1, this.superCharge + amount);
  }

  takeDamage(amount, source) {
    if (!this.isAlive || this._invincibleTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.chargeSuper(0.04);
    this._flashRed();
    if (this.health <= 0) this.die();
    this._drawHealthBar();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this._drawHealthBar();
  }

  _flashRed() {
    this.mesh.traverse(child => {
      if (!child.isMesh) return;
      if (child.material.side === THREE.BackSide) return; // skip outline meshes
      child.material.emissive?.setHex(0xff2200);
      child.material.emissiveIntensity = 1.0;
      setTimeout(() => {
        if (child.material) {
          child.material.emissive?.setHex(0x000000);
          child.material.emissiveIntensity = 0;
        }
      }, 100);
    });
  }

  die() {
    this.isAlive = false;
    let t = 0;
    const iv = setInterval(() => {
      t += 0.07;
      this.mesh.scale.setScalar(Math.max(0, 1 - t));
      if (t >= 1) { clearInterval(iv); this.mesh.visible = false; }
    }, 16);
    if (this.onDeath) this.onDeath(this);
  }

  respawn(pos) {
    this.isAlive     = true;
    this.health      = this.maxHealth;
    this.superCharge = 0;
    this._atkTimer   = 0;
    this.position.copy(pos);
    this.mesh.scale.setScalar(1);
    this.mesh.visible = true;
    this.mesh.position.set(pos.x, 0, pos.z);
    this._drawHealthBar();
  }

  remove() {
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    this._hpTex.dispose();
  }
}
