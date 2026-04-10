const OFFSET = new THREE.Vector3(0, 28, 18);
const _target = new THREE.Vector3();

class CameraController {
  constructor(camera) {
    this.camera = camera;
    this._pos = new THREE.Vector3();
  }

  update(dt, playerPos) {
    _target.copy(playerPos).add(OFFSET);
    const alpha = Math.min(1, 0.08 * dt * 60);
    this._pos.lerp(_target, alpha);
    this.camera.position.copy(this._pos);
    this.camera.lookAt(playerPos.x, 0, playerPos.z);
  }

  snapTo(playerPos) {
    this._pos.copy(playerPos).add(OFFSET);
    this.camera.position.copy(this._pos);
    this.camera.lookAt(playerPos.x, 0, playerPos.z);
  }
}
