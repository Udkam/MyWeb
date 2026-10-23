/** Art/contact geometry uses the same feet-centre origin and screen axes as the model. */
export interface Point { x: number; y: number }
export interface Segment { a: Point; b: Point }
export interface Aabb { left: number; top: number; right: number; bottom: number }
export type PixelPoint = readonly [number, number];
export type ContactPhase = 'windup' | 'active' | 'recovery';
export interface TimedFrame { durationMs: number }
export interface FrameClip<T extends TimedFrame> {
  frames: readonly T[];
  loop?: boolean;
  holdLast?: boolean;
  phaseFrames?: Readonly<Record<string, readonly number[] | undefined>>;
}
export interface RigFrame extends TimedFrame {
  anchor: PixelPoint;
  weapon?: { hand: PixelPoint; angle: number };
}
export interface BladeGeometry { pivot: PixelPoint; bladeRoot: PixelPoint; tip: PixelPoint }
export interface ContactPose extends Point { facing: -1 | 1 }
export interface ArtContactFrame extends TimedFrame {
  index: number;
  id: string;
  bodyHeight: number;
  visibleTopFromFeet: number;
  weapon?: { id: string; hand: PixelPoint; root?: PixelPoint; tip?: PixelPoint; muzzle?: PixelPoint };
  palm?: PixelPoint;
}
export interface ArtContactClip extends FrameClip<ArtContactFrame> { contactFrameIndex?: number }
export interface ArtContactData {
  sourceManifestSha256: string;
  actors: Readonly<Record<string, { actions: Readonly<Record<string, ArtContactClip>> }>>;
}

/** Contact records are already normalized to the actor's feet, facing right at 640. */
export function feetPointToWorld(point: PixelPoint, pose: ContactPose): Point {
  return { x: pose.x + pose.facing * point[0], y: pose.y + point[1] };
}

export function feetSegmentToWorld(root: PixelPoint, tip: PixelPoint, pose: ContactPose): Segment {
  return { a: feetPointToWorld(root, pose), b: feetPointToWorld(tip, pose) };
}

/** Matches the renderer: phase frames divide the model phase evenly, not by strip duration. */
export function sampleClipFrame<T extends TimedFrame>(
  clip: FrameClip<T>, time: number, phase?: ContactPhase, phaseDuration?: number,
): T | undefined {
  let frames = clip.frames;
  if (!frames.length) return undefined;
  const indices = phase && clip.phaseFrames?.[phase];
  if (indices?.length) {
    const selected = indices.map(index => clip.frames[index]).filter((frame): frame is T => Boolean(frame));
    if (selected.length) frames = selected;
    const fraction = Math.max(0, Math.min(0.999, time / (phaseDuration || 1)));
    return frames[Math.floor(fraction * frames.length)];
  }
  const duration = frames.reduce((total, frame) => total + frame.durationMs, 0);
  let remaining = clip.loop ? Math.max(0, time) % duration : Math.min(Math.max(0, time), duration - 0.01);
  for (const frame of frames) {
    if (remaining < frame.durationMs) return frame;
    remaining -= frame.durationMs;
  }
  return frames.at(-1);
}

/** Transform an actual prop point. Mirror the complete rotated rig, including its hand. */
export function sampleWeaponPoint(
  frame: RigFrame, pivot: PixelPoint, point: PixelPoint, pose: ContactPose, density = 1,
): Point | undefined {
  if (!frame.weapon) return undefined;
  const localX = point[0] - pivot[0];
  const localY = point[1] - pivot[1];
  const cos = Math.cos(frame.weapon.angle);
  const sin = Math.sin(frame.weapon.angle);
  return feetPointToWorld([
    (frame.weapon.hand[0] - frame.anchor[0] + cos * localX - sin * localY) / density,
    (frame.weapon.hand[1] - frame.anchor[1] + sin * localX + cos * localY) / density,
  ], pose);
}

/** Unrounded world endpoints; display-pixel rounding is not allowed to extend weapon reach. */
export function sampleBladeSegment(
  frame: RigFrame, weapon: BladeGeometry, pose: ContactPose, density = 1,
): Segment | undefined {
  const a = sampleWeaponPoint(frame, weapon.pivot, weapon.bladeRoot, pose, density);
  const b = sampleWeaponPoint(frame, weapon.pivot, weapon.tip, pose, density);
  return a && b ? { a, b } : undefined;
}

export function actorAabb(actor: Point & { width: number; height: number }): Aabb {
  return { left: actor.x - actor.width / 2, top: actor.y - actor.height, right: actor.x + actor.width / 2, bottom: actor.y };
}

function pointAabbDistanceSquared(point: Point, box: Aabb): number {
  const dx = Math.max(box.left - point.x, 0, point.x - box.right);
  const dy = Math.max(box.top - point.y, 0, point.y - box.bottom);
  return dx * dx + dy * dy;
}

function pointSegmentDistanceSquared(point: Point, segment: Segment): number {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - segment.a.x) * dx + (point.y - segment.a.y) * dy) / lengthSquared));
  return (point.x - segment.a.x - fraction * dx) ** 2 + (point.y - segment.a.y - fraction * dy) ** 2;
}

function segmentIntersectsAabb(segment: Segment, box: Aabb): boolean {
  let enter = 0;
  let exit = 1;
  for (const [start, delta, minimum, maximum] of [
    [segment.a.x, segment.b.x - segment.a.x, box.left, box.right],
    [segment.a.y, segment.b.y - segment.a.y, box.top, box.bottom],
  ]) {
    if (delta === 0) {
      if (start < minimum || start > maximum) return false;
      continue;
    }
    let near = (minimum - start) / delta;
    let far = (maximum - start) / delta;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return false;
  }
  return true;
}

/** Exact finite-segment distance, including corners; an expanded rectangle is too generous. */
export function segmentAabbDistanceSquared(segment: Segment, box: Aabb): number {
  if (segmentIntersectsAabb(segment, box)) return 0;
  return Math.min(
    pointAabbDistanceSquared(segment.a, box), pointAabbDistanceSquared(segment.b, box),
    pointSegmentDistanceSquared({ x: box.left, y: box.top }, segment),
    pointSegmentDistanceSquared({ x: box.right, y: box.top }, segment),
    pointSegmentDistanceSquared({ x: box.left, y: box.bottom }, segment),
    pointSegmentDistanceSquared({ x: box.right, y: box.bottom }, segment),
  );
}

export function capsuleIntersectsAabb(segment: Segment, radius: number, box: Aabb): boolean {
  return segmentAabbDistanceSquared(segment, box) <= Math.max(0, radius) ** 2 + 1e-9;
}
