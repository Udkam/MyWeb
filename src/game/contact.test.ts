import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { actorAabb, capsuleIntersectsAabb, sampleBladeSegment, sampleClipFrame, sampleWeaponPoint,
  segmentAabbDistanceSquared, type Aabb, type BladeGeometry, type FrameClip, type RigFrame, type Segment,
  type ArtContactData, type PixelPoint } from './contact';
import { ART_CONTACT_DATA } from './art-contact-data';

const box: Aabb = { left: 0, top: 0, right: 10, bottom: 10 };
const near = (actual: number, expected: number, epsilon = 0.000001) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} differs from ${expected}`);

test('segment distance handles crossing, edge closest points, corners and a zero-length blade', () => {
  assert.equal(segmentAabbDistanceSquared({ a: { x: -20, y: 5 }, b: { x: 20, y: 5 } }, box), 0);
  assert.equal(segmentAabbDistanceSquared({ a: { x: 4, y: -10 }, b: { x: 4, y: -5 } }, box), 25);
  assert.equal(segmentAabbDistanceSquared({ a: { x: -10, y: 4 }, b: { x: -5, y: 4 } }, box), 25);
  near(segmentAabbDistanceSquared({ a: { x: -4, y: -3 }, b: { x: -3, y: -4 } }, box), 24.5);
  assert.equal(segmentAabbDistanceSquared({ a: { x: -3, y: -4 }, b: { x: -3, y: -4 } }, box), 25);
  assert.equal(segmentAabbDistanceSquared({ a: { x: 5, y: 5 }, b: { x: 5, y: 5 } }, box), 0);
});

test('a capsule rounds its corners rather than accepting the square corners of an expanded AABB', () => {
  const cornerMiss: Segment = { a: { x: -2, y: 0.5 }, b: { x: 0.5, y: -2 } };
  near(segmentAabbDistanceSquared(cornerMiss, box), 1.125);
  assert.equal(capsuleIntersectsAabb(cornerMiss, 1, box), false);
  assert.equal(capsuleIntersectsAabb(cornerMiss, Math.sqrt(1.125), box), true);
  const tangent: Segment = { a: { x: -5, y: -2 }, b: { x: 15, y: -2 } };
  assert.equal(capsuleIntersectsAabb(tangent, 2, box), true);
  assert.equal(capsuleIntersectsAabb(tangent, 1.999, box), false);
});

test('nearest distance is invariant under reversing a blade, translation and facing reflection', () => {
  const segment: Segment = { a: { x: -8, y: -4 }, b: { x: 3, y: -7 } };
  const expected = segmentAabbDistanceSquared(segment, box);
  near(segmentAabbDistanceSquared({ a: segment.b, b: segment.a }, box), expected);
  near(segmentAabbDistanceSquared({ a: { x: 92, y: 46 }, b: { x: 103, y: 43 } },
    { left: 100, right: 110, top: 50, bottom: 60 }), expected);
  near(segmentAabbDistanceSquared({ a: { x: 8, y: -4 }, b: { x: -3, y: -7 } },
    { left: -10, right: 0, top: 0, bottom: 10 }), expected);
});

test('clip sampling uses exact phase frame order and equal phase fractions, then ordinary frame durations', () => {
  const frames = [{ id: 'a', durationMs: 20 }, { id: 'b', durationMs: 150 }, { id: 'c', durationMs: 30 }];
  const clip = { frames, phaseFrames: { active: [2, 1] } };
  assert.equal(sampleClipFrame(clip, 0, 'active', 80)?.id, 'c');
  assert.equal(sampleClipFrame(clip, 39.999, 'active', 80)?.id, 'c');
  assert.equal(sampleClipFrame(clip, 40, 'active', 80)?.id, 'b');
  assert.equal(sampleClipFrame(clip, 999, 'active', 80)?.id, 'b');
  assert.equal(sampleClipFrame(clip, -10, 'active', 80)?.id, 'c');
  assert.equal(sampleClipFrame(clip, 19.999)?.id, 'a');
  assert.equal(sampleClipFrame(clip, 20)?.id, 'b');
  assert.equal(sampleClipFrame(clip, 200)?.id, 'c');
  assert.equal(sampleClipFrame({ ...clip, loop: true }, 200)?.id, 'a');
  assert.equal(sampleClipFrame({ frames: [] }, 0), undefined);
});

test('rig transforms rotate around the real weapon pivot and mirror the complete body-relative group', () => {
  const frame: RigFrame = { durationMs: 60, anchor: [40, 70], weapon: { hand: [60, 30], angle: Math.PI / 2 } };
  const geometry: BladeGeometry = { pivot: [7, 7], bladeRoot: [10, 7], tip: [31, 7] };
  const right = sampleBladeSegment(frame, geometry, { x: 100, y: 255, facing: 1 })!;
  const left = sampleBladeSegment(frame, geometry, { x: 100, y: 255, facing: -1 })!;
  near(right.a.x, 120); near(right.a.y, 218); near(right.b.x, 120); near(right.b.y, 239);
  near(left.a.x, 80); near(left.a.y, 218); near(left.b.x, 80); near(left.b.y, 239);
  assert.equal(sampleWeaponPoint({ durationMs: 60, anchor: [0, 0] }, [0, 0], [10, 10], { x: 0, y: 0, facing: 1 }), undefined);
});

interface ArtManifest {
  actors: { hero: Record<'640' | '960', { density: number; actions: { attack1: FrameClip<RigFrame> } }> };
  weapons: { cutlass: Record<'640' | '960', BladeGeometry> };
}
function currentAttack1(size: '640' | '960' = '640') {
  const manifest = JSON.parse(readFileSync(new URL('../../public/assets/actors-v2/manifest.json', import.meta.url), 'utf8')) as ArtManifest;
  const variant = manifest.actors.hero[size];
  const frame = sampleClipFrame(variant.actions.attack1, 0, 'active', 80)!;
  return { frame, weapon: manifest.weapons.cutlass[size], density: variant.density };
}

test('current attack1 active geometry is measured from the actual manifest and agrees across source densities', () => {
  const a = currentAttack1();
  const right = sampleBladeSegment(a.frame, a.weapon, { x: 0, y: 0, facing: 1 }, a.density)!;
  near(right.a.x, 35.767, 0.001); near(right.a.y, -43.98, 0.001);
  near(right.b.x, 59.767, 0.001); near(right.b.y, -47.227, 0.001);
  const b = currentAttack1('960');
  const dense = sampleBladeSegment(b.frame, b.weapon, { x: 0, y: 0, facing: 1 }, b.density)!;
  near(dense.a.x, right.a.x, 0.001); near(dense.a.y, right.a.y, 0.001);
  near(dense.b.x, right.b.x, 0.001); near(dense.b.y, right.b.y, 0.001);
});

test('blade contact rejects true height misses instead of treating any nearby body as a hit', () => {
  const { frame, weapon } = currentAttack1();
  const deckFoe = actorAabb({ x: 160, y: 255, width: 26, height: 58 });
  const crateSwing = sampleBladeSegment(frame, weapon, { x: 100, y: 231, facing: 1 })!;
  assert.equal(capsuleIntersectsAabb(crateSwing, 2, deckFoe), false, '24px height difference cannot become a visual air hit');
  assert.ok(segmentAabbDistanceSquared(crateSwing, deckFoe) > 100);
  const sameLevel = sampleBladeSegment(frame, weapon, { x: 100, y: 255, facing: 1 })!;
  assert.equal(capsuleIntersectsAabb(sameLevel, 2, deckFoe), true);
  const leftFoe = actorAabb({ x: 40, y: 255, width: 26, height: 58 });
  const leftSwing = sampleBladeSegment(frame, weapon, { x: 100, y: 255, facing: -1 })!;
  assert.equal(capsuleIntersectsAabb(leftSwing, 2, leftFoe), true);
  assert.equal(capsuleIntersectsAabb(sameLevel, 2, leftFoe), false, 'right-facing blade cannot hit behind');
  assert.equal(capsuleIntersectsAabb(sampleBladeSegment(frame, weapon, { x: 100, y: 207, facing: 1 })!, 2, deckFoe), false);
});

test('the new 68px head can receive a close crate-height graze, but a higher or more distant blade still misses', () => {
  const { frame, weapon } = currentAttack1();
  const closeHead = actorAabb({ x: 160, y: 255, width: 26, height: 68 });
  const farHead = actorAabb({ x: 168, y: 255, width: 26, height: 68 });
  const crateSwing = sampleBladeSegment(frame, weapon, { x: 100, y: 231, facing: 1 })!;
  assert.equal(capsuleIntersectsAabb(crateSwing, 2, closeHead), true);
  assert.equal(capsuleIntersectsAabb(crateSwing, 2, farHead), false);
  assert.equal(capsuleIntersectsAabb(sampleBladeSegment(frame, weapon, { x: 100, y: 255, facing: 1 })!, 2, farHead), true);
  assert.equal(capsuleIntersectsAabb(sampleBladeSegment(frame, weapon, { x: 100, y: 207, facing: 1 })!, 2, closeHead), false);
});

test('generated contact data matches the exact current manifest and every imported rig endpoint', () => {
  const bytes = readFileSync(new URL('../../public/assets/actors-v2/manifest.json', import.meta.url));
  const data: ArtContactData = ART_CONTACT_DATA;
  assert.equal(data.sourceManifestSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(ART_CONTACT_DATA,
    JSON.parse(readFileSync(new URL('../../public/assets/actors-v2/contact-geometry.json', import.meta.url), 'utf8')));
  const manifest = JSON.parse(bytes.toString('utf8')) as {
    actors: Record<string, { '640': { actions: Record<string, FrameClip<RigFrame & { id: string }>> } }>;
    weapons: Record<string, { '640': { pivot: PixelPoint; bladeRoot?: PixelPoint; barrelRoot?: PixelPoint; tip?: PixelPoint; muzzle?: PixelPoint } }>;
  };
  for (const [actor, entry] of Object.entries(data.actors)) for (const [name, clip] of Object.entries(entry.actions)) {
    const original = manifest.actors[actor]!['640'].actions[name]!;
    assert.equal(clip.frames.length, original.frames.length);
    assert.deepEqual(clip.phaseFrames, original.phaseFrames);
    for (const record of clip.frames) {
      const frame = original.frames[record.index]!;
      assert.equal(record.id, frame.id); assert.equal(record.durationMs, frame.durationMs);
      if (!record.weapon) continue;
      const prop = manifest.weapons[record.weapon.id]!['640'];
      for (const [point, source] of [[record.weapon.root, prop.bladeRoot ?? prop.barrelRoot],
        [record.weapon.tip, prop.tip ?? prop.muzzle], [record.weapon.muzzle, prop.muzzle]] as const) {
        if (!point || !source) continue;
        const expected = sampleWeaponPoint(frame, prop.pivot, source, { x: 0, y: 0, facing: 1 })!;
        near(point[0], expected.x, 0.002); near(point[1], expected.y, 0.002);
      }
    }
  }
});
