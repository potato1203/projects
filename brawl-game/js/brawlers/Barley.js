class Barley extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name           = 'Barley';
    this.maxHealth      = 2600;
    this.speed          = 3.0;
    this.attackDamage   = 280;
    this.attackRange    = 7.0;
    this.attackCooldown = 1.2;
    this.bodyColor      = 0x9932CC;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Rotund belly body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 12, 10),
      toonMat(0x7a1fa0)
    );
    body.scale.set(1, 1.3, 1);
    body.position.y = 0.72;
    body.castShadow = true;
    g.add(body);

    // White apron
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.85, 0.12),
      toonMat(0xf0f0f0)
    );
    apron.position.set(0, 0.72, 0.6);
    g.add(apron);

    // Round face
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 12, 10),
      toonMat(0xffd5a8)
    );
    head.position.y = 1.68;
    head.castShadow = true;
    g.add(head);

    // Rosy cheeks
    const cheekMat = toonMat(0xffaaaa, { transparent: true, opacity: 0.7 });
    [-0.24, 0.24].forEach(x => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), cheekMat);
      cheek.position.set(x, 1.62, 0.4);
      g.add(cheek);
    });

    // Eyes (happy squint)
    const eyeW = toonMat(0xffffff);
    const eyeP = toonMat(0x223300);
    [-0.18, 0.18].forEach(x => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeW);
      w.scale.y = 0.65; // squint
      w.position.set(x, 1.72, 0.4);
      g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeP);
      p.position.set(x, 1.72, 0.51);
      g.add(p);
    });

    // Big floppy hat
    const hatMat = toonMat(0x4a1a6a);
    const brimMat = toonMat(0x3a0e55);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.44, 0.55, 12),
      hatMat
    );
    crown.position.y = 2.12;
    g.add(crown);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.09, 16),
      brimMat
    );
    brim.position.y = 1.87;
    g.add(brim);

    // Bottle (held in hand)
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.55, 10),
      toonMat(0x44cc88, { transparent: true, opacity: 0.85 })
    );
    bottle.position.set(0.6, 0.88, 0.2);
    bottle.rotation.z = -0.5;
    bottle.rotation.x = 0.3;
    g.add(bottle);

    // Bottle top/cork
    const cork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8),
      toonMat(0xaa6633)
    );
    cork.position.set(0.82, 1.1, 0.3);
    cork.rotation.z = -0.5;
    cork.rotation.x = 0.3;
    g.add(cork);

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    const self = this;
    projManager.spawn({
      origin: this.position, dirX: aimX, dirZ: aimZ,
      speed: 8, damage: this.attackDamage,
      owner: this, team: this.team,
      range: this.attackRange, radius: 0.24, type: 'bottle',
      arc: true,
      onHit: (brawler, pos) => {
        const puddle = new Puddle(self.scene, self.effectsGroup, pos.x, pos.z, 1.2, 200, 1.5);
        projManager._puddles.push(puddle);
      },
    });
    this.chargeSuper(0.22);
  }

  doSuper(aimX, aimZ, projManager) {
    const self = this;
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.35;
      const cos = Math.cos(a), sin = Math.sin(a);
      const dx = aimX * cos - aimZ * sin;
      const dz = aimX * sin + aimZ * cos;
      projManager.spawn({
        origin: this.position, dirX: dx, dirZ: dz,
        speed: 8, damage: this.attackDamage * 0.9,
        owner: this, team: this.team,
        range: this.attackRange * 1.2, radius: 0.24, type: 'bottle',
        arc: true,
        onHit: (brawler, pos) => {
          projManager._puddles.push(new Puddle(self.scene, self.effectsGroup, pos.x, pos.z, 1.0, 180, 1.2));
        },
      });
    }
  }
}
