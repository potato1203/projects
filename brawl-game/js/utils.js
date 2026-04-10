// ── Shared visual utilities ──────────────────────────────────────────────────

let _toonGradient = null;

function getToonGradient() {
  if (_toonGradient) return _toonGradient;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const ctx = c.getContext('2d');
  // shadow | midtone | base | highlight
  ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#777'; ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#bbb'; ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = '#fff'; ctx.fillRect(3, 0, 1, 1);
  _toonGradient = new THREE.CanvasTexture(c);
  _toonGradient.magFilter = THREE.NearestFilter;
  _toonGradient.minFilter = THREE.NearestFilter;
  return _toonGradient;
}

// Create a MeshToonMaterial with the shared gradient
function toonMat(color, options = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    ...options,
  });
}

// Add black outline to every mesh inside a Group using the BackSide trick.
// IMPORTANT: collect meshes first, THEN add outlines — adding during traverse
// causes infinite recursion because traverse re-reads children.length after callback.
function addOutline(group, thickness = 0.07, color = 0x111111) {
  const meshes = [];
  group.traverse(child => {
    if (child.isMesh) meshes.push(child);
  });
  for (const child of meshes) {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    const outline = new THREE.Mesh(child.geometry, mat);
    outline.scale.setScalar(1 + thickness);
    outline.renderOrder = -1;
    child.add(outline);
  }
}

// Floor texture: hex grid on a grassy base
function makeFloorTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Base grass fill
  ctx.fillStyle = '#4a7c3a';
  ctx.fillRect(0, 0, size, size);

  // Hex tile grid
  const R = 28;
  const hexW = R * Math.sqrt(3);
  const hexH = R * 2;

  for (let row = -1; row <= Math.ceil(size / (hexH * 0.75)) + 1; row++) {
    for (let col = -1; col <= Math.ceil(size / hexW) + 1; col++) {
      const x = col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
      const y = row * hexH * 0.75;

      // Slight per-tile brightness variation for visual interest
      const v = (Math.sin(col * 7.3 + row * 13.1) * 0.5 + 0.5) * 18;
      const r = Math.round(74 + v), g = Math.round(124 + v), b = Math.round(58 + v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + R * Math.cos(a);
        const py = y + R * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// Wall texture: stone brick
function makeWallTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  // Stone base
  ctx.fillStyle = '#6b5f50';
  ctx.fillRect(0, 0, size, size);

  // Brick rows
  const brickH = 24, brickW = 40;
  for (let row = 0; row < Math.ceil(size / brickH) + 1; row++) {
    const y = row * brickH;
    const offsetX = (row % 2 === 0) ? 0 : brickW / 2;
    for (let col = -1; col < Math.ceil(size / brickW) + 1; col++) {
      const x = col * brickW + offsetX;
      // Brick color with slight variation
      const v = (Math.sin(col * 5 + row * 11) * 0.5 + 0.5) * 20;
      const r = Math.round(100 + v), g = Math.round(85 + v), b = Math.round(70 + v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
    }
    // Mortar lines
    ctx.fillStyle = '#3a3028';
    ctx.fillRect(0, y, size, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

// Shared wall material (created once)
let _wallMat = null;
function getWallMat() {
  if (!_wallMat) {
    _wallMat = new THREE.MeshToonMaterial({
      map: makeWallTexture(),
      gradientMap: getToonGradient(),
    });
  }
  return _wallMat;
}

// Shared floor material (created once)
let _floorMat = null;
function getFloorMat() {
  if (!_floorMat) {
    _floorMat = new THREE.MeshToonMaterial({
      map: makeFloorTexture(),
      gradientMap: getToonGradient(),
    });
  }
  return _floorMat;
}
