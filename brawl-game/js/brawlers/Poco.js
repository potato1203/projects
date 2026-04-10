class Poco extends Brawler {
  constructor(scene, brawlerGroup, effectsGroup) {
    super(scene, brawlerGroup, effectsGroup);
    this.name           = 'Poco';
    this.maxHealth      = 3200;
    this.speed          = 3.3;
    this.attackDamage   = 220;
    this.attackRange    = 6.5;
    this.attackCooldown = 1.0;
    this.bodyColor      = 0xFFD700;
    this._allBrawlers   = null;
  }

  _buildMesh() {
    const g = new THREE.Group();

    // Body with colorful jacket
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.35, 0.78),
      toonMat(0xFFD700)
    );
    body.position.y = 0.68;
    body.castShadow = true;
    g.add(body);

    // Jacket lapels
    const lapelMat = toonMat(0xff6600);
    [-0.25, 0.25].forEach(x => {
      const lapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.6, 0.1),
        lapelMat
      );
      lapel.position.set(x, 0.95, 0.4);
      lapel.rotation.z = x < 0 ? 0.2 : -0.2;
      g.add(lapel);
    });

    // Round friendly head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 12, 10),
      toonMat(0xffd5a8)
    );
    head.position.y = 1.68;
    head.castShadow = true;
    g.add(head);

    // Big happy eyes
    const eyeW = toonMat(0xffffff);
    const eyeP = toonMat(0x222200);
    [-0.2, 0.2].forEach(x => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeW);
      w.position.set(x, 1.75, 0.38);
      g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeP);
      p.position.set(x, 1.74, 0.51);
      g.add(p);
      // Eyebrow
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.05, 0.05),
        toonMat(0x553300)
      );
      brow.position.set(x, 1.9, 0.38);
      brow.rotation.z = x < 0 ? 0.2 : -0.2;
      g.add(brow);
    });

    // Smile
    const smileMat = toonMat(0x331100);
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI),
      smileMat
    );
    smile.position.set(0, 1.58, 0.42);
    smile.rotation.x = -0.3;
    g.add(smile);

    // Bandana/bow tie
    const bow = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.18, 0.1),
      toonMat(0xff3300)
    );
    bow.position.set(0, 1.28, 0.4);
    g.add(bow);

    // Guitar body
    const guitarMat = toonMat(0xaa5500);
    const gBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 8),
      guitarMat
    );
    gBody.scale.set(1, 1.3, 0.4);
    gBody.position.set(0.7, 0.72, 0.18);
    gBody.rotation.z = 0.35;
    g.add(gBody);

    // Guitar neck
    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.72, 0.1),
      toonMat(0xcc7722)
    );
    neck.position.set(0.88, 1.28, 0.18);
    neck.rotation.z = 0.35;
    g.add(neck);

    // Guitar sound hole
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 10),
      toonMat(0x331100)
    );
    hole.position.set(0.7, 0.72, 0.32);
    g.add(hole);

    // Strings (thin lines)
    const strMat = toonMat(0xdddddd);
    for (let i = 0; i < 3; i++) {
      const str = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.65, 0.02),
        strMat
      );
      str.position.set(0.85 + i * 0.02, 1.28, 0.18);
      str.rotation.z = 0.35;
      g.add(str);
    }

    return g;
  }

  doAttack(aimX, aimZ, projManager) {
    [-0.45, 0, 0.45].forEach(a => {
      const cos = Math.cos(a), sin = Math.sin(a);
      projManager.spawn({
        origin: this.position,
        dirX: aimX * cos - aimZ * sin,
        dirZ: aimX * sin + aimZ * cos,
        speed: 10, damage: this.attackDamage,
        owner: this, team: this.team,
        range: this.attackRange, radius: 0.28, type: 'wave', pierce: true,
      });
    });
    this.chargeSuper(0.18);
  }

  doSuper(aimX, aimZ, projManager) {
    if (!this._allBrawlers) return;
    const HealAmount = 1500;
    const radius = 8;

    // Visual expanding ring
    const ringGeo = new THREE.RingGeometry(0.1, radius, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffff44, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(this.position.x, 0.1, this.position.z);
    this.effectsGroup.add(ring);
    let t = 0;
    const iv = setInterval(() => {
      t += 0.06;
      ring.material.opacity = Math.max(0, 0.6 * (1 - t));
      ring.scale.setScalar(1 + t);
      if (t >= 1) { clearInterval(iv); this.effectsGroup.remove(ring); }
    }, 16);

    for (const b of this._allBrawlers) {
      if (!b.isAlive || b.team !== this.team) continue;
      const dx = b.position.x - this.position.x;
      const dz = b.position.z - this.position.z;
      if (dx * dx + dz * dz <= radius * radius) b.heal(HealAmount);
    }
  }
}
