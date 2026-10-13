import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRun } from '../src/engine.js';
import { loadArt, render, assetStatus, directionColumn } from '../src/renderer.js';

// Pixel dimensions are read from the actual PNG headers. This catches bad source
// rectangles and atlas substitutions; it is not a replacement for browser QA.
const manifest = JSON.parse(readFileSync(new URL('../src/assets/manifest.json', import.meta.url), 'utf8'));
test('curated files retain their original hashes and PNG dimensions', () => {
  for (const row of manifest.files) {
    const bytes = readFileSync(new URL(`../src/assets/${row.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.file);
    if (row.dimensions) assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], row.dimensions, row.file);
  }
});
test('sprite directions map to source columns, not animation rows', () => {
  assert.deepEqual([Math.PI / 2, -Math.PI / 2, Math.PI, 0].map(directionColumn), [0, 1, 2, 3]);
});
test('every actor phase uses valid rectangles and title never mutates the run', async () => {
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  let checked = 0;
  const context = new Proxy({
    drawImage(image, ...args) {
      assert.ok(args.every(Number.isFinite), `non-finite drawImage ${image.src || 'canvas'}`);
      if (args.length === 8 && image.src) {
        const [x, y, w, h] = args;
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= image.width && y + h <= image.height, `out-of-range ${image.src}: ${args}`);
        checked++;
      }
    },
    createRadialGradient() { return { addColorStop() {} }; },
    measureText(text) { return { width: text.length * 7 }; },
  }, { get(target, key) { return target[key] ?? (() => {}); }, set(target, key, value) { target[key] = value; return true; } });
  globalThis.Image = class {
    set src(value) {
      this._src = value; const bytes = readFileSync(fileURLToPath(value));
      this.width = bytes.readUInt32BE(16); this.height = bytes.readUInt32BE(20);
      queueMicrotask(() => this.onload());
    }
    get src() { return this._src; }
  };
  globalThis.document = { createElement() { return { width: 0, height: 0, getContext: () => context }; } };
  try {
    await loadArt(); assert.equal(assetStatus.ready, true); assert.deepEqual(assetStatus.failed, []);
    const state = createRun({ seed: 14 });
    state.enemies = ['slime','shooter','charger','caster','sentinel','warden'].map((type, index) => ({ id: index, type, x: 120 + index * 140, y: 220, r: index > 3 ? 29 : 14, hp: 50, maxHp: 60, vx: 10, vy: 0, angle: .7, stage: 2, burnTime: 1, coldTime: 1 }));
    state.effects = [{ type: 'nova', x: 300, y: 300, radius: 70, life: .3, maxLife: .5 }, { type: 'lightning', x: 100, y: 100, x2: 200, y2: 180, life: .1, maxLife: .2 }];
    for (const phase of ['spawn','chase','windup','charge','recover']) {
      for (const e of state.enemies) Object.assign(e, { phase, windup: .4, windupMax: .8, telegraph: { kind: e.id % 2 ? 'line' : 'fan', angle: .7, range: 180, width: 30, spread: .8 } });
      for (const time of [0, .11, .42, .93, 1.77, 4.1]) {
        state.time = time; render(context, state, { width: 1440, height: 900 });
        render(context, state, { width: 390, height: 844, reduceMotion: true });
      }
    }
    state.enemies.forEach(e => e.hitFlash = .06); render(context, state, { width: 1440, height: 900 });
    const before = JSON.stringify(state); render(context, state, { width: 1440, height: 900, title: true });
    assert.equal(JSON.stringify(state), before); assert.ok(checked > 1000);
  } finally { globalThis.Image = oldImage; globalThis.document = oldDocument; }
});
