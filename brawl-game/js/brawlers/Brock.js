class Brock extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name           = 'Brock';
    this.maxHealth      = 2400;
    this.speed          = 3.2;
    this.attackDamage   = 700;
    this.attackRange    = 12.0;
    this.attackCooldown = 1.8;
    this.bodyColor      = 0x228B22;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Tall athletic body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.55, 0.8),
      toonMat(0x1a6a1a)
    );
    body.position.y = 0.78;
    body.castShadow = true;
    g.add(body);

    // Tactical vest
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.94, 0.8, 0.84),
      toonMat(0x2a4a2a)
    );
    vest.position.y = 0.95;
    g.add(vest);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 10),
      toonMat(0xffd5a8)
    );
    head.position.y = 1.72;
    head.castShadow = true;
    g.add(head);

    // Spiky orange hair
    const hairMat = toonMat(0xff6600);
    [0, 0.18, -0.18].forEach((x, i) => {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.35, 6),
        hairMat
      );
      spike.position.set(x, 2.12 + i * 0.03, -0.05);
      spike.rotation.z = x * 1.5;
      g.add(spike);
    });

    // Cool sunglasses (visor strip)
    const glassMat = toonMat(0x111144, { transparent: true, opacity: 0.8 });
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.13, 0.08),
      glassMat
    );
    visor.position.set(0, 1.74, 0.37);
    g.add(visor);

    // Eyes (under visor, just barely visible)
    const eyeP = toonMat(0x0022ff);
    [-0.16, 0.16].forEach(x => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeP);
      p.position.set(x, 1.72, 0.38);
      g.add(p);
    });

    // Rocket launcher (large, prominent)
    const launcherMat = toonMat(0x444444);
    const launcher = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 1.4, 10),
      launcherMat
    );
    launcher.rotation.x = Math.PI / 2;
    launcher.position.set(0.45, 1.05, 0.6);
    launcher.castShadow = true;
    g.add(launcher);

    // Rocket tip (red)
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.32, 10),
      toonMat(0xff2200)
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0.45, 1.05, 1.28);
    g.add(tip);

    // Fins
    const finMat = toonMat(0x888888);
    [-1, 1].forEach(s => {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.32, 0.28),
        finMat
      );
      fin.position.set(0.45 + s * 0.2, 1.05, 0.25);
      g.add(fin);
    });

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    projManager.spawn({
      origin: this.position, dirX: aimX, dirZ: aimZ,
      speed: 17, damage: this.attackDamage,
      owner: this, team: this.team,
      range: this.attackRange, radius: 0.28, type: 'rocket',
    });
    this.chargeSuper(0.3);
  }

  doSuper(aimX, aimZ, projManager) {
    const cx = this.position.x + aimX * 8;
    const cz = this.position.z + aimZ * 8;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!projManager) return;
        projManager.spawn({
          origin: { x: cx + (Math.random()-0.5)*6, y: 0.7, z: cz + (Math.random()-0.5)*6 },
          dirX: 0, dirZ: 0,
          speed: 0.01, damage: this.attackDamage * 0.8,
          owner: this, team: this.team,
          range: 0.1, radius: 1.4, type: 'rocket',
        });
      }, i * 250);
    }
  }
}
