// Tile types
const TILE_OPEN = 0;
const TILE_WALL = 1;
const TILE_BUSH = 2;

const TILE_SIZE = 2;

// Map layouts: 0=open, 1=wall, 2=bush
// Each row is a string: . open, W wall, B bush
function parseMiniMap(rows) {
  return rows.map(row => [...row].map(c => c === 'W' ? TILE_WALL : c === 'B' ? TILE_BUSH : TILE_OPEN));
}

// 30x30 Showdown map
const SHOWDOWN_ROWS = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W............................WW',
  'W.WW..........WW..........WW.W',
  'W.W...BB....BB...BB....BB..W.W',
  'W....BB......BB.BB......BB...W',
  'W.............................W',
  'W..WW...............WW........W',
  'W.....BB.......BB.............W',
  'W..........................WW.W',
  'W.WW..........................W',
  'W.....BB.......BB.............W',
  'W..............................W',
  'WW..............WW............W',
  'W..............................W',
  'W.......BB.........BB.........W',
  'W..............................W',
  'W..............................W',
  'W.......BB.........BB.........W',
  'W..............................W',
  'WW..............WW............W',
  'W..............................W',
  'W.....BB.......BB.............W',
  'W.WW..........................W',
  'W..........................WW.W',
  'W.....BB.......BB.............W',
  'W..WW...............WW........W',
  'W.............................W',
  'W....BB......BB.BB......BB...W',
  'W.WW..........WW..........WW.W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
];

// 23x23 Gem Grab map (symmetric)
const GEMGRAB_ROWS = [
  'WWWWWWWWWWWWWWWWWWWWWWW',
  'W.....................W',
  'W.WW...BB.....BB..WW.W',
  'W.W.................W.W',
  'W..........WW..........W',
  'W.BB.................BB.W',
  'W......WW.....WW......W',
  'W.....................W',
  'W..BB.........BB.....W',
  'W......WW.WW.........W',
  'W.....................W',
  'W...........W.........W',
  'W.....................W',
  'W......WW.WW.........W',
  'W..BB.........BB.....W',
  'W.....................W',
  'W......WW.....WW......W',
  'W.BB.................BB.W',
  'W..........WW..........W',
  'W.W.................W.W',
  'W.WW...BB.....BB..WW.W',
  'W.....................W',
  'WWWWWWWWWWWWWWWWWWWWWWW',
];

// 25x17 Brawl Ball map
const BRAWLBALL_ROWS = [
  'WWWWWWWWWWWWWWWWWWWWWWWWW',
  'W.......................W',
  'W.WW.............WW..W',
  'W.....................W',
  '.....BB.........BB.....',
  'W.....................W',
  'W....WW.......WW....W',
  'W.....................W',
  'W...........W.........W',
  'W.....................W',
  'W....WW.......WW....W',
  'W.....................W',
  '.....BB.........BB.....',
  'W.....................W',
  'W.WW.............WW..W',
  'W.......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWWW',
];

const MAP_DEFS = {
  showdown:  { rows: SHOWDOWN_ROWS,  cols: 30, rowCount: 30 },
  gemgrab:   { rows: GEMGRAB_ROWS,   cols: 23, rowCount: 23 },
  brawlball: { rows: BRAWLBALL_ROWS, cols: 25, rowCount: 17 },
};

class GameMap {
  constructor(scene, mapGroup, mode) {
    this.scene = scene;
    this.mapGroup = mapGroup;
    this.mode = mode;

    const def = MAP_DEFS[mode];
    this.tiles = parseMiniMap(def.rows.map(r => r.padEnd(def.cols, '.')));
    this.rowCount = def.rows.length;
    this.colCount = def.cols;
    this.halfW = (this.colCount * TILE_SIZE) / 2;
    this.halfH = (this.rowCount * TILE_SIZE) / 2;

    // Goal positions for BrawlBall (x at edges, open rows 4 and 12)
    this.goalLeft  = { x: -this.halfW, z: 0 };
    this.goalRight = { x:  this.halfW, z: 0 };

    this._buildMeshes();
  }

  _buildMeshes() {
    // ── Floor ────────────────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(this.colCount * TILE_SIZE, this.rowCount * TILE_SIZE, 1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, getFloorMat());
    floor.receiveShadow = true;
    floor.position.y = -0.01;
    this.mapGroup.add(floor);

    // ── Wall & bush geometry/material (shared) ───────────────────────────────
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, 2.4, TILE_SIZE);
    const wallMat = getWallMat();

    // Top cap (lighter tone, separate face colour trick via a second material)
    const capMat = toonMat(0x8a7560);

    // Bush: multi-sphere cluster look
    const bushBaseMat = toonMat(0x2d8a1e, { transparent: true, opacity: 0.88 });
    const bushTopMat  = toonMat(0x3db42a, { transparent: true, opacity: 0.88 });

    for (let row = 0; row < this.rowCount; row++) {
      for (let col = 0; col < this.colCount; col++) {
        const tile = this.tiles[row]?.[col] ?? TILE_OPEN;
        const wx = col * TILE_SIZE - this.halfW + TILE_SIZE / 2;
        const wz = row * TILE_SIZE - this.halfH + TILE_SIZE / 2;

        if (tile === TILE_WALL) {
          // Main block with brick texture
          const block = new THREE.Mesh(wallGeo, wallMat);
          block.position.set(wx, 1.2, wz);
          block.castShadow = true;
          block.receiveShadow = true;
          this.mapGroup.add(block);
          // Light top cap
          const cap = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, 0.22, TILE_SIZE), capMat);
          cap.position.set(wx, 2.41, wz);
          this.mapGroup.add(cap);
        } else if (tile === TILE_BUSH) {
          // Rounded bush cluster
          const g = new THREE.Group();
          const baseGeo = new THREE.SphereGeometry(0.82, 8, 6);
          const base = new THREE.Mesh(baseGeo, bushBaseMat);
          base.scale.set(1, 0.55, 1);
          base.position.y = 0.45;
          g.add(base);
          // Top sphere
          const topGeo = new THREE.SphereGeometry(0.55, 8, 6);
          const top = new THREE.Mesh(topGeo, bushTopMat);
          top.position.set(0.1, 0.85, -0.05);
          g.add(top);
          const top2 = new THREE.Mesh(topGeo, bushTopMat);
          top2.position.set(-0.2, 0.78, 0.1);
          g.add(top2);
          g.position.set(wx, 0, wz);
          this.mapGroup.add(g);
        }
      }
    }

    // Goal posts for BrawlBall
    if (this.mode === 'brawlball') {
      this._addGoalPosts();
    }

    // Gem mine indicator for GemGrab
    if (this.mode === 'gemgrab') {
      const mineGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.2, 12);
      const mineMat = toonMat(0x9b59b6);
      const mine = new THREE.Mesh(mineGeo, mineMat);
      mine.position.set(0, 0.1, 0);
      this.mapGroup.add(mine);
      // Pulsing ring
      const ringGeo = new THREE.RingGeometry(1.5, 2.0, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xcc44ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.12, 0);
      this.mapGroup.add(ring);
    }
  }

  _addGoalPosts() {
    // Left goal: blue
    const leftMat  = toonMat(0x3388ff);
    const rightMat = toonMat(0xff3344);
    const postGeo  = new THREE.CylinderGeometry(0.2, 0.2, 2.8, 10);
    const crossGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8);

    // Left goal (blue)
    [-2, 2].forEach(z => {
      const p = new THREE.Mesh(postGeo, leftMat);
      p.position.set(-this.halfW + 0.4, 1.4, z);
      p.castShadow = true;
      this.mapGroup.add(p);
    });
    const lcross = new THREE.Mesh(crossGeo, leftMat);
    lcross.rotation.z = Math.PI / 2;
    lcross.position.set(-this.halfW + 0.4, 2.7, 0);
    this.mapGroup.add(lcross);

    // Right goal (red)
    [-2, 2].forEach(z => {
      const p = new THREE.Mesh(postGeo, rightMat);
      p.position.set(this.halfW - 0.4, 1.4, z);
      p.castShadow = true;
      this.mapGroup.add(p);
    });
    const rcross = new THREE.Mesh(crossGeo, rightMat);
    rcross.rotation.z = Math.PI / 2;
    rcross.position.set(this.halfW - 0.4, 2.7, 0);
    this.mapGroup.add(rcross);
  }

  // Returns true if the world-space circle (cx, cz, radius) overlaps a solid tile
  circleCollidesWall(cx, cz, radius) {
    // Check 4-tile neighbourhood
    const minCol = Math.floor((cx - radius - (-this.halfW)) / TILE_SIZE);
    const maxCol = Math.floor((cx + radius - (-this.halfW)) / TILE_SIZE);
    const minRow = Math.floor((cz - radius - (-this.halfH)) / TILE_SIZE);
    const maxRow = Math.floor((cz + radius - (-this.halfH)) / TILE_SIZE);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.isSolid(col, row)) {
          // Closest point on tile AABB to circle center
          const tx = col * TILE_SIZE - this.halfW;
          const tz = row * TILE_SIZE - this.halfH;
          const nearX = Math.max(tx, Math.min(cx, tx + TILE_SIZE));
          const nearZ = Math.max(tz, Math.min(cz, tz + TILE_SIZE));
          const dx = cx - nearX;
          const dz = cz - nearZ;
          if (dx * dx + dz * dz < radius * radius) return true;
        }
      }
    }
    return false;
  }

  // Push a circle out of walls, returns {x, z}
  resolveWallCollision(cx, cz, radius) {
    let nx = cx, nz = cz;
    const minCol = Math.floor((cx - radius - (-this.halfW)) / TILE_SIZE);
    const maxCol = Math.floor((cx + radius - (-this.halfW)) / TILE_SIZE);
    const minRow = Math.floor((cz - radius - (-this.halfH)) / TILE_SIZE);
    const maxRow = Math.floor((cz + radius - (-this.halfH)) / TILE_SIZE);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (!this.isSolid(col, row)) continue;
        const tx = col * TILE_SIZE - this.halfW;
        const tz = row * TILE_SIZE - this.halfH;
        const nearX = Math.max(tx, Math.min(nx, tx + TILE_SIZE));
        const nearZ = Math.max(tz, Math.min(nz, tz + TILE_SIZE));
        const dx = nx - nearX;
        const dz = nz - nearZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius && dist > 0) {
          const push = radius - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else if (dist === 0) {
          nx += radius;
        }
      }
    }
    return { x: nx, z: nz };
  }

  // Check if a point is solid
  pointSolid(wx, wz) {
    const col = Math.floor((wx + this.halfW) / TILE_SIZE);
    const row = Math.floor((wz + this.halfH) / TILE_SIZE);
    return this.isSolid(col, row);
  }

  isSolid(col, row) {
    if (col < 0 || row < 0 || row >= this.rowCount || col >= this.colCount) return true;
    return this.tiles[row]?.[col] === TILE_WALL;
  }

  // Returns world center of a tile
  tileCenter(col, row) {
    return {
      x: col * TILE_SIZE - this.halfW + TILE_SIZE / 2,
      z: row * TILE_SIZE - this.halfH + TILE_SIZE / 2,
    };
  }

  // Get a random open world position
  randomOpenPosition(margin = 2) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const col = margin + Math.floor(Math.random() * (this.colCount - margin * 2));
      const row = margin + Math.floor(Math.random() * (this.rowCount - margin * 2));
      if (!this.isSolid(col, row)) {
        return new THREE.Vector3(
          col * TILE_SIZE - this.halfW + TILE_SIZE / 2,
          0,
          row * TILE_SIZE - this.halfH + TILE_SIZE / 2
        );
      }
    }
    return new THREE.Vector3(0, 0, 0);
  }

  // Has line of sight between two world points (simple ray march)
  hasLOS(ax, az, bx, bz) {
    const steps = 20;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = ax + (bx - ax) * t;
      const mz = az + (bz - az) * t;
      if (this.pointSolid(mx, mz)) return false;
    }
    return true;
  }

  cleanup() {
    this.mapGroup.clear();
  }
}
