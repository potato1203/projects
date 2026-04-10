class Colt extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name           = 'Colt';
    this.maxHealth      = 2800;
    this.speed          = 3.5;
    this.attackDamage   = 340;
    this.attackRange    = 9.0;
    this.attackCooldown = 0.8;
    this.bodyColor      = 0x1a78c2;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Slim torso
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 1.35, 0.72),
      toonMat(0x1a78c2)
    );
    body.position.y = 0.68;
    body.castShadow = true;
    g.add(body);

    // Vest
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.7, 0.75),
      toonMat(0x8B6914)
    );
    vest.position.y = 0.85;
    g.add(vest);

    // Round head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      toonMat(0xffd5a8)
    );
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);

    // Big cowboy hat (brim + crown)
    const crownMat = toonMat(0x5a3a00);
    const brimMat  = toonMat(0x4a2e00);
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, 0.55, 12),
      crownMat
    );
    crown.position.y = 2.12;
    g.add(crown);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16),
      brimMat
    );
    brim.position.y = 1.87;
    g.add(brim);

    // Eyes
    const eyeW = toonMat(0xffffff);
    const eyeP = toonMat(0x111144);
    [-0.17, 0.17].forEach(x => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), eyeW);
      w.position.set(x, 1.66, 0.37);
      g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), eyeP);
      p.position.set(x, 1.66, 0.47);
      g.add(p);
    });

    // Star badge
    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 5),
      toonMat(0xffdd00)
    );
    badge.position.set(0, 1.0, 0.38);
    g.add(badge);

    // Twin revolvers
    const gunMat = toonMat(0x555555);
    const handleMat = toonMat(0x6b3a10);
    [-0.35, 0.35].forEach(x => {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8),
        gunMat
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x, 0.72, 0.55);
      g.add(barrel);
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.3, 0.16),
        handleMat
      );
      handle.position.set(x, 0.55, 0.3);
      handle.rotation.x = 0.3;
      g.add(handle);
    });

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    [-0.05, 0, 0.05].forEach(a => {
      const cos = Math.cos(a), sin = Math.sin(a);
      projManager.spawn({
        origin: this.position,
        dirX: aimX * cos - aimZ * sin,
        dirZ: aimX * sin + aimZ * cos,
        speed: 20, damage: this.attackDamage,
        owner: this, team: this.team,
        range: this.attackRange, radius: 0.15, type: 'bullet',
      });
    });
    this.chargeSuper(0.15);
  }

  doSuper(aimX, aimZ, projManager) {
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.055;
      const cos = Math.cos(a), sin = Math.sin(a);
      projManager.spawn({
        origin: this.position,
        dirX: aimX * cos - aimZ * sin,
        dirZ: aimX * sin + aimZ * cos,
        speed: 22, damage: this.attackDamage * 0.9,
        owner: this, team: this.team,
        range: 15, radius: 0.15, type: 'bullet',
      });
    }
  }
}
