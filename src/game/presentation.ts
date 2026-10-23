import { FIXED_MS, GRAVITY, PLATFORMS, WORLD, type Hero } from './model';

/** Let an airborne defeated hero settle without advancing combat or mutating its result. */
export function defeatedHeroPose(hero: Hero, elapsedMs: number): { x: number; y: number } {
  if (hero.grounded || elapsedMs <= 0) return { x: hero.x, y: hero.y };
  let y = hero.y;
  let vy = hero.vy;
  let remaining = Math.min(1500, Math.max(0, elapsedMs));
  while (remaining > 0) {
    const dt = Math.min(FIXED_MS, remaining) / 1000;
    remaining -= dt * 1000;
    vy += GRAVITY * dt;
    let nextY = y + vy * dt;
    for (const platform of PLATFORMS) {
      if (hero.x + hero.width / 2 <= platform.x || hero.x - hero.width / 2 >= platform.x + platform.width) continue;
      if (vy >= 0 && y <= platform.y && nextY >= platform.y) return { x: hero.x, y: platform.y };
      const underside = platform.y + platform.height;
      if (vy < 0 && y - hero.height >= underside && nextY - hero.height <= underside) {
        nextY = underside + hero.height;
        vy = 0;
      }
    }
    if (nextY >= WORLD.floor) return { x: hero.x, y: WORLD.floor };
    y = nextY;
  }
  return { x: hero.x, y };
}
