class Leon extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name           = 'Leon';
    this.maxHealth      = 2600;
    this.speed          = 4.2;
    this.attackDamage   = 600;
    this.attackRange    = 5.5;
    this.attackCooldown = 1.3;
    this.bodyColor      = 0x2d6b8a;
    this.isStealthed    = false;
    this._stealthTimer  = 0;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Sleek ninja body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.44, 1.22, 12),
      toonMat(0x1a4a60)
    );
    body.position.y = 0.61;
    body.castShadow = true;
    g.add(body);

    // Ninja hood/mask (dark cylinder around head)
    const mask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.5, 12),
      toonMat(0x0a2030)
    );
    mask.position.y = 1.52;
    g.add(mask);

    // Head peeking above mask
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 10),
      toonMat(0xffd5a8)
    );
    head.position.y = 1.68;
    head.castShadow = true;
    g.add(head);

    // Headband
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.1, 12),
      toonMat(0xff2200)
    );
    band.position.y = 1.82;
    g.add(band);

    // Menacing eyes (red glow pupils)
    const eyeW = toonMat(0xffffff);
    const eyeR = toonMat(0xff1100);
    [-0.17, 0.17].forEach(x => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeW);
      w.position.set(x, 1.72, 0.35);
      g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeR);
      p.position.set(x, 1.72, 0.45);
      g.add(p);
    });

    // Scarf tail
    const scarfMat = toonMat(0x0a2030);
    const scarf = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.55, 0.12),
      scarfMat
    );
    scarf.position.set(-0.1, 1.1, -0.35);
    scarf.rotation.x = 0.4;
    g.add(scarf);

    // Dual curved blades (prominent)
    const bladeMat = toonMat(0xaadeee);
    const bladeShineMat = toonMat(0xffffff);
    [-1, 1].forEach(side => {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.72, 0.05),
        bladeMat
      );
      blade.position.set(side * 0.62, 0.72, 0.22);
      blade.rotation.z = side * 0.35;
      blade.castShadow = true;
      g.add(blade);

      // Blade shine line
      const shine = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.72, 0.06),
        bladeShineMat
      );
      shine.position.set(side * 0.62 + side * 0.02, 0.72, 0.25);
      shine.rotation.z = side * 0.35;
      g.add(shine);

      // Handle wrap
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8),
        toonMat(0x3a2200)
      );
      handle.position.set(side * 0.62, 0.34, 0.22);
      handle.rotation.z = side * 0.35;
      g.add(handle);
    });

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    const spread = 0.22;
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * spread;
      const cos = Math.cos(a), sin = Math.sin(a);
      projManager.spawn({
        origin: this.position,
        dirX: aimX * cos - aimZ * sin,
        dirZ: aimX * sin + aimZ * cos,
        speed: 12, damage: this.attackDamage / 4,
        owner: this, team: this.team,
        range: this.attackRange, radius: 0.2, type: 'blade',
      });
    }
    if (this.isStealthed) this._endStealth();
    this.chargeSuper(0.22);
  }

  doSuper(aimX, aimZ, projManager) {
    this.isStealthed = true;
    this._stealthTimer = 5.0;
    this._superTimer   = 5.0;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material.side !== THREE.BackSide) {
        child.material.transparent = true;
        child.material.opacity = 0.15;
      }
    });
  }

  _endStealth() {
    this.isStealthed = false;
    this._stealthTimer = 0;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material.side !== THREE.BackSide) {
        child.material.opacity = 1.0;
        if (child.material.color && child.material.color.getHex() !== 0x111111) {
          child.material.transparent = false;
        }
      }
    });
  }

  update(dt, input, projManager) {
    super.update(dt, input, projManager);
    if (this.isStealthed) {
      this._stealthTimer -= dt;
      if (this._stealthTimer <= 0) this._endStealth();
    }
  }
}
