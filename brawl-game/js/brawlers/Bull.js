class Bull extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name            = 'Bull';
    this.maxHealth       = 5000;
    this.speed           = 2.8;
    this.attackDamage    = 420;
    this.attackRange     = 4.5;
    this.attackCooldown  = 1.5;
    this.collisionRadius = 0.72;
    this.bodyColor       = 0x8B4513;
    this._isDashing      = false;
    this._dashDirX       = 0;
    this._dashDirZ       = 0;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Wide stocky body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.5, 1.1),
      toonMat(0x7a3b10)
    );
    body.position.y = 0.75;
    body.castShadow = true;
    g.add(body);

    // Belt
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.22, 1.13),
      toonMat(0x3d200a)
    );
    belt.position.y = 0.42;
    g.add(belt);

    // Big round head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 12, 10),
      toonMat(0x9a4f1a)
    );
    head.position.set(0, 1.78, 0.18);
    head.castShadow = true;
    g.add(head);

    // Snout
    const snout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.22, 10),
      toonMat(0xcc8855)
    );
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.68, 0.72);
    g.add(snout);

    // Nostrils
    const nostrilMat = toonMat(0x331100);
    [-0.1, 0.1].forEach(x => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), nostrilMat);
      n.position.set(x, 1.66, 0.84);
      g.add(n);
    });

    // Eyes (white + pupil)
    const eyeWhiteMat = toonMat(0xffffff);
    const eyePupilMat = toonMat(0x111111);
    [-0.22, 0.22].forEach(x => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeWhiteMat);
      white.position.set(x, 1.9, 0.52);
      g.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), eyePupilMat);
      pupil.position.set(x, 1.9, 0.65);
      g.add(pupil);
    });

    // Curved horns
    const hornMat = toonMat(0xddccaa);
    [-1, 1].forEach(side => {
      const hornGeo = new THREE.CylinderGeometry(0.07, 0.14, 0.65, 8);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.48, 2.18, 0.08);
      horn.rotation.z = side * 0.55;
      horn.rotation.x = -0.2;
      horn.castShadow = true;
      g.add(horn);
    });

    // Muscular arms
    const armMat = toonMat(0x7a3b10);
    const armGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.8, 8);
    [-1, 1].forEach(side => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(side * 0.88, 0.95, 0);
      arm.rotation.z = side * 0.45;
      arm.castShadow = true;
      g.add(arm);
      // Fist
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), toonMat(0x9a4f1a));
      fist.position.set(side * 1.2, 0.6, 0.1);
      g.add(fist);
    });

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    const spread = 0.28;
    const angles = [-spread * 1.5, -spread * 0.5, spread * 0.5, spread * 1.5];
    angles.forEach(a => {
      const cos = Math.cos(a), sin = Math.sin(a);
      projManager.spawn({
        origin: this.position,
        dirX: aimX * cos - aimZ * sin,
        dirZ: aimX * sin + aimZ * cos,
        speed: 12, damage: this.attackDamage,
        owner: this, team: this.team,
        range: this.attackRange, radius: 0.25, type: 'shell',
      });
    });
    this.chargeSuper(0.25);
  }

  doSuper(aimX, aimZ, projManager) {
    this._isDashing = true;
    this._superTimer = 0.28;
    this._dashDirX = aimX;
    this._dashDirZ = aimZ;
    this._invincibleTimer = 0.28;
  }

  update(dt, input, projManager) {
    if (this._isDashing) {
      this.position.x += this._dashDirX * 22 * dt;
      this.position.z += this._dashDirZ * 22 * dt;
    }
    super.update(dt, input, projManager);
  }

  onSuperTick(dt) {
    if (this._superTimer <= 0) this._isDashing = false;
  }
}
