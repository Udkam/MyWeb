import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { naturalRoute } from './playtest-route-policy';
import { createModel, step, snapshot, FIXED_MS, type Input } from '../src/game/model';
import { ART_CONTACT_DATA } from '../src/game/art-contact-data';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.qa', 'playtest', 'routes');
fs.mkdirSync(output, { recursive: true });
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const fileHash = (relative: string) => hash(fs.readFileSync(path.join(root, relative)));
const sources = {
  modelSha256: fileHash('src/game/model.ts'),
  policySha256: fileHash('scripts/playtest-route-policy.ts'),
  exporterSha256: fileHash('scripts/export_playtest_routes.ts'),
  manifestSha256: ART_CONTACT_DATA.sourceManifestSha256,
};
type Key = 'a' | 'd' | 'Space' | 'j' | 'k' | 'Shift' | 'e';
const keyOrder: Key[] = ['a', 'd', 'Space', 'j', 'k', 'Shift', 'e'];
function keysFor(input: Partial<Input>): Key[] {
  return keyOrder.filter(key => key === 'a' ? (input.move ?? 0) < 0 : key === 'd' ? (input.move ?? 0) > 0
    : key === 'Space' ? input.jumpPressed : key === 'j' ? input.attackPressed
      : key === 'k' ? input.guardHeld || input.guardPressed : key === 'Shift' ? input.dodgePressed : input.interactPressed);
}
function edgeInput(keys: Set<Key>, previous: Set<Key>, model: ReturnType<typeof createModel>): Partial<Input> {
  const down = (key: Key) => keys.has(key) && !previous.has(key);
  return {
    move: Number(keys.has('d')) - Number(keys.has('a')), jumpPressed: down('Space'), attackPressed: down('j'),
    guardHeld: keys.has('k'), guardPressed: down('k'), dodgePressed: down('Shift'), interactPressed: down('e'),
    ...(down('e') ? { contextIntent: { ...model.contextAction } } : {}),
  };
}
type View = ReturnType<typeof snapshot>;
interface TickRecord {
  tick: number;
  atMs: number;
  input: Partial<Input>;
  keys: Key[];
  state: {
    hero: Pick<View['hero'], 'x' | 'y' | 'hp' | 'action' | 'actionTime'>;
    enemies: { id: string; x: number; y: number; hp: number; action: string }[];
    cannon: View['cannon'];
    contextAction: View['contextAction'];
    events: View['log'];
  };
}
interface KeyEvent { at: number; type: 'keyDown' | 'keyUp'; key: Key; modelTick: number }
const summaries = [];
for (const [order, slug] of [['remoteFirst', 'remote-first'], ['cannonFirst', 'cannon-first']] as const) {
  const ticks: TickRecord[] = [];
  let lastEventId = 0;
  const model = naturalRoute(order, (input, view) => {
    const events = view.log.filter(event => event.id > lastEventId);
    lastEventId = view.log.at(-1)?.id ?? lastEventId;
    ticks.push({ tick: view.tick, atMs: (view.tick - 1) * FIXED_MS, input, keys: keysFor(input), state: {
      hero: { x: view.hero.x, y: view.hero.y, hp: view.hero.hp, action: view.hero.action, actionTime: view.hero.actionTime },
      enemies: view.enemies.map(enemy => ({ id: enemy.id, x: enemy.x, y: enemy.y, hp: enemy.hp, action: enemy.action })),
      cannon: view.cannon, contextAction: view.contextAction, events,
    } });
  });
  assert.equal(model.encounter.status, 'complete');
  const expected = snapshot(model);

  // Replay the actual held-key edges, rather than assuming repeated true Pressed flags are browser keydowns.
  const replay = createModel();
  let held = new Set<Key>();
  const events: KeyEvent[] = [];
  const startAtSeconds = 0.5;
  for (const frame of ticks) {
    const current = new Set(frame.keys);
    const at = startAtSeconds + frame.atMs / 1000;
    for (const key of keyOrder) if (held.has(key) && !current.has(key)) events.push({ at, type: 'keyUp', key, modelTick: frame.tick });
    for (const key of keyOrder) if (current.has(key) && !held.has(key)) events.push({ at, type: 'keyDown', key, modelTick: frame.tick });
    step(replay, edgeInput(current, held, replay));
    const replayView = snapshot(replay);
    assert.deepEqual({ x: replay.hero.x, y: replay.hero.y, hp: replay.hero.hp, action: replay.hero.action },
      { x: frame.state.hero.x, y: frame.state.hero.y, hp: frame.state.hero.hp, action: frame.state.hero.action },
      `${slug} physical-key semantics differ at tick ${frame.tick}`);
    assert.deepEqual(replayView.enemies.map(enemy => ({ id: enemy.id, x: enemy.x, y: enemy.y, hp: enemy.hp, action: enemy.action })),
      frame.state.enemies, `${slug} enemy pose/action at tick ${frame.tick}`);
    assert.deepEqual(replayView.contextAction, frame.state.contextAction, `${slug} displayed E at tick ${frame.tick}`);
    assert.deepEqual(replayView.cannon, frame.state.cannon, `${slug} cannon at tick ${frame.tick}`);
    held = current;
  }
  assert.deepEqual(snapshot(replay), expected, `${slug} complete key-edge replay state`);
  for (const key of keyOrder) if (held.has(key)) events.push({ at: startAtSeconds + model.time / 1000, type: 'keyUp', key, modelTick: model.tick + 1 });

  const result = {
    status: model.encounter.status, ticks: model.tick, seconds: model.time / 1000, hp: model.hero.hp,
    enemies: model.enemies.map(enemy => ({ id: enemy.id, hp: enemy.hp })), routeFlags: [...model.encounter.routeFlags],
  };
  const trace = { schemaVersion: 1, route: order, fixedHz: 60, sources, result, keyEdgeReplayMatchesEveryTick: true, ticks, finalSnapshot: expected };
  const plan = {
    schemaVersion: 1, label: `normal-input-${slug}`, viewport: { width: 1280, height: 720 },
    hasTouch: false, isMobile: false, deviceScaleFactor: 1, sampleEverySeconds: 0.1,
    timeline: [{ at: startAtSeconds, type: 'click', selector: '[data-command=primary]' }, ...events],
    stop: { afterSeconds: startAtSeconds + result.seconds + 3, onModes: ['dead', 'complete', 'victory'], afterResultSeconds: 1.5, requireResult: true },
    modelReference: { ...sources, ...result, traceFile: `${slug}.inputs.json`, keyEdgeReplayMatchesEveryTick: true },
    notes: [
      'Start click and first movement share one timestamp; there is no inserted in-game padding.',
      'The stop cap includes title and result capture time; it is not claimed as player completion time.',
      'This is a model-derived input trajectory. Actual RAF/browser scheduling and completion must be measured separately.',
    ],
  };
  const traceText = `${JSON.stringify(trace, null, 2)}\n`;
  const planText = `${JSON.stringify(plan, null, 2)}\n`;
  fs.writeFileSync(path.join(output, `${slug}.inputs.json`), traceText, 'utf8');
  fs.writeFileSync(path.join(output, `${slug}.actions.json`), planText, 'utf8');
  summaries.push({ route: order, slug, ...result, edgeEvents: events.length,
    traceSha256: hash(traceText), planSha256: hash(planText), keyEdgeReplayMatchesEveryTick: true });
}
fs.writeFileSync(path.join(output, 'results.json'), `${JSON.stringify({ schemaVersion: 1, sources, routes: summaries }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output, routes: summaries }, null, 2));
