class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this._mouseNDC = { x: 0, y: 0 };
    this.mouseDown = false;
    this.spacePressed = false;
    this.aimWorld = new THREE.Vector3();

    this._raycaster = new THREE.Raycaster();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    canvas.addEventListener('mousedown', e => { if (e.button === 0) this.mouseDown = true; });
    canvas.addEventListener('mouseup',   e => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); this.spacePressed = true; }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.spacePressed = false;
    });
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this._mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  }

  update(camera) {
    this._raycaster.setFromCamera(this._mouseNDC, camera);
    this._raycaster.ray.intersectPlane(this._groundPlane, this.aimWorld);
  }

  get snapshot() {
    return {
      up:     this.keys['KeyW'] || this.keys['ArrowUp'],
      down:   this.keys['KeyS'] || this.keys['ArrowDown'],
      left:   this.keys['KeyA'] || this.keys['ArrowLeft'],
      right:  this.keys['KeyD'] || this.keys['ArrowRight'],
      attack: this.mouseDown,
      useSuper: this.spacePressed,
      aimWorld: this.aimWorld,
    };
  }
}
