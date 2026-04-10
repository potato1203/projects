class Renderer {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x4a9ab5); // sky blue

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x4a9ab5, 45, 85);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 28, 18);
    this.camera.lookAt(0, 0, 0);

    // ── Lights ──────────────────────────────────────────────────────────────
    // Hemisphere: warm sky above, cool ground below
    const hemi = new THREE.HemisphereLight(0xffeedd, 0x223311, 0.6);
    this.scene.add(hemi);

    // Key light (sun, warm)
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
    sun.position.set(15, 35, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left   = -45;
    sun.shadow.camera.right  =  45;
    sun.shadow.camera.top    =  45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Fill light (cool, opposite side)
    const fill = new THREE.DirectionalLight(0xaaccff, 0.4);
    fill.position.set(-10, 20, -10);
    this.scene.add(fill);

    // ── Scene groups ─────────────────────────────────────────────────────────
    this.mapGroup       = new THREE.Group();
    this.brawlerGroup   = new THREE.Group();
    this.projectileGroup = new THREE.Group();
    this.effectsGroup   = new THREE.Group();
    this.scene.add(this.mapGroup, this.brawlerGroup, this.projectileGroup, this.effectsGroup);

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
