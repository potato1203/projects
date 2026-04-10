class PhysicsEngine {
  // Push brawlers out of walls and separate overlapping brawlers
  resolveCollisions(brawlers, map) {
    for (const b of brawlers) {
      if (!b.isAlive) continue;
      const r = b.collisionRadius;
      const pos = b.position;

      // Wall resolution (multiple passes for corners)
      for (let pass = 0; pass < 2; pass++) {
        const resolved = map.resolveWallCollision(pos.x, pos.z, r);
        pos.x = resolved.x;
        pos.z = resolved.z;
      }

      // World bounds
      pos.x = Math.max(-map.halfW + r, Math.min(map.halfW - r, pos.x));
      pos.z = Math.max(-map.halfH + r, Math.min(map.halfH - r, pos.z));

      // Update mesh position
      b.mesh.position.set(pos.x, 0, pos.z);
    }

    // Brawler-brawler separation (circle vs circle)
    for (let i = 0; i < brawlers.length; i++) {
      const a = brawlers[i];
      if (!a.isAlive) continue;
      for (let j = i + 1; j < brawlers.length; j++) {
        const b = brawlers[j];
        if (!b.isAlive) continue;
        const minDist = a.collisionRadius + b.collisionRadius;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 < minDist * minDist && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const nz = dz / dist;
          a.position.x -= nx * push;
          a.position.z -= nz * push;
          b.position.x += nx * push;
          b.position.z += nz * push;
          a.mesh.position.set(a.position.x, 0, a.position.z);
          b.mesh.position.set(b.position.x, 0, b.position.z);
        }
      }
    }
  }

  // Check if a point is inside any brawler's collision circle (except owner)
  // Returns the hit brawler or null
  findHitBrawler(px, pz, radius, owner, allBrawlers) {
    for (const b of allBrawlers) {
      if (b === owner || !b.isAlive) continue;
      const dx = px - b.position.x;
      const dz = pz - b.position.z;
      const minDist = radius + b.collisionRadius;
      if (dx * dx + dz * dz < minDist * minDist) return b;
    }
    return null;
  }
}
