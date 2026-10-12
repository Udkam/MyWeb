import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createState, todayKey, sanitizeState, deriveTimer, settleTimer,
  startTimer, pauseTimer, resetTimer, setTimerMode, exportState, LIMITS } from '../src/model.js';

const NOW = new Date(2026, 9, 12, 10, 0, 0).getTime();

test('local calendar keys respect the local date, including midnight and year boundaries', () => {
  assert.equal(todayKey(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01');
  assert.equal(todayKey(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31');
  assert.throws(() => todayKey(NaN), RangeError);
});

test('new state starts empty, paused, and uses the three expected durations', () => {
  const state = createState(NOW);
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.sessions, []);
  assert.equal(state.notes, '');
  assert.deepEqual(state.durations, { focus: 25, short: 5, long: 15 });
  assert.equal(deriveTimer(state, NOW).remainingSeconds, 1500);
  assert.equal(deriveTimer(state, NOW).isRunning, false);
});

test('pause and resume preserve precise remaining time and the same focus identity', () => {
  const empty = createState(NOW);
  const running = startTimer(empty, NOW, 'task-1');
  const paused = pauseTimer(running, NOW + 60250);
  assert.equal(paused.timer.remainingSeconds, 1439.75);
  assert.equal(deriveTimer(paused, NOW + 100000).remainingSeconds, 1440);
  const restoredPause = sanitizeState(JSON.parse(JSON.stringify(paused)), NOW + 120000);
  assert.equal(restoredPause.timer.remainingSeconds, 1439.75);
  const resumed = startTimer(restoredPause, NOW + 120000, 'ignored-task');
  assert.equal(resumed.timer.runId, running.timer.runId);
  assert.equal(resumed.timer.taskId, 'task-1');
  assert.equal(resumed.timer.endAt, NOW + 1559750);
  assert.equal(empty.timer.runId, null, 'operations do not mutate their input');
  assert.equal(settleTimer(resumed, resumed.timer.endAt).sessions.length, 1);
});

test('a refresh restores the absolute deadline and an overdue focus completes exactly once', () => {
  const running = startTimer(createState(NOW), NOW);
  const restored = sanitizeState(JSON.parse(JSON.stringify(running)), NOW + 600000);
  assert.equal(deriveTimer(restored, NOW + 600000).remainingSeconds, 900);
  const afterSleep = sanitizeState(JSON.parse(JSON.stringify(restored)), NOW + 86400000);
  assert.equal(deriveTimer(afterSleep, NOW + 86400000).isExpired, true);
  const completed = settleTimer(afterSleep, NOW + 86400000);
  assert.equal(completed.sessions.length, 1);
  assert.equal(completed.sessions[0].completedAt, NOW + 1500000);
  assert.equal(completed.timer.running, false);
  assert.equal(completed.timer.remainingSeconds, 0);
  assert.equal(settleTimer(completed, NOW + 86400001).sessions.length, 1);
  const restoredAgain = sanitizeState({ ...running, sessions: completed.sessions }, NOW + 86400001);
  assert.equal(restoredAgain.timer.running, false);
  assert.equal(settleTimer(restoredAgain, NOW + 86400001).sessions.length, 1);
});

test('restart makes a new run while resetting or changing a live timer does not invent sessions', () => {
  const running = startTimer(createState(NOW), NOW);
  const reset = resetTimer(running, NOW + 1000);
  assert.equal(reset.sessions.length, 0);
  assert.equal(reset.timer.remainingSeconds, 1500);
  const next = startTimer(reset, NOW + 1000);
  assert.notEqual(next.timer.runId, running.timer.runId);
  const completed = settleTimer(next, next.timer.endAt);
  const restarted = startTimer(completed, next.timer.endAt);
  assert.notEqual(restarted.timer.runId, next.timer.runId);
  assert.equal(restarted.sessions.length, 1);
  const switched = setTimerMode(restarted, 'short', next.timer.endAt + 1);
  assert.equal(switched.timer.remainingSeconds, 300);
  assert.equal(switched.timer.running, false);
  assert.equal(switched.sessions.length, 1);
});

test('breaks complete without focus credit; custom durations reject invalid input', () => {
  for (const mode of ['short', 'long']) {
    const state = startTimer(setTimerMode(createState(NOW), mode, NOW), NOW);
    const completed = settleTimer(state, state.timer.endAt);
    assert.equal(completed.sessions.length, 0);
    assert.equal(completed.timer.running, false);
  }
  const custom = setTimerMode(createState(NOW), 'focus', NOW, 120);
  assert.equal(custom.timer.durationSeconds, 7200);
  assert.equal(setTimerMode(custom, 'focus', NOW, 0).durations.focus, 1);
  assert.equal(setTimerMode(custom, 'focus', NOW, 121).durations.focus, 120);
  assert.equal(setTimerMode(custom, 'focus', NOW, 2.5).durations.focus, 3);
  for (const invalid of [NaN, Infinity, '25']) {
    assert.throws(() => setTimerMode(custom, 'focus', NOW, invalid), RangeError);
  }
  assert.throws(() => setTimerMode(custom, 'other', NOW), RangeError);
});

test('malformed backups retain only bounded, valid fields and unique records', () => {
  assert.throws(() => sanitizeState(null, NOW), TypeError);
  assert.throws(() => sanitizeState({ version: 2 }, NOW), TypeError);
  const task = { id: 'a', title: ' hello ', done: true, createdAt: NOW - 10, completedAt: NOW };
  const session = { id: 's', startedAt: NOW - 60000, completedAt: NOW, durationSeconds: 60, taskId: 'deleted-task' };
  const restored = sanitizeState({ version: 1, extra: 'drop', notes: 'x'.repeat(30000),
    tasks: [null, task, task, { id: 'bad', title: '' }, { id: '__bad<script>', title: 'discard' }],
    sessions: [session, session, { ...session, id: 'future', completedAt: NOW + 1 },
      { ...session, id: 'short', durationSeconds: 500 }],
    durations: { focus: -1, short: 20, long: Infinity }, timer: { running: true, endAt: NaN } }, NOW);
  assert.equal(restored.notes.length, LIMITS.notes);
  assert.deepEqual(restored.tasks, [{ ...task, title: 'hello' }]);
  assert.deepEqual(restored.sessions, [session]);
  assert.deepEqual(restored.durations, { focus: 1, short: 20, long: 15 });
  assert.equal(restored.timer.running, false);
  assert.equal('extra' in restored, false);
});

test('bounded task and session retention and arbitrary future timer rejection', () => {
  const tasks = Array.from({ length: 250 }, (_, i) => ({ id: `t-${i}`, title: 'task', createdAt: NOW }));
  const sessions = Array.from({ length: 1100 }, (_, i) => ({ id: `s-${i}`, startedAt: NOW - 60000,
    completedAt: NOW, durationSeconds: 60, taskId: null }));
  const initial = startTimer(createState(NOW), NOW);
  const restored = sanitizeState({ ...initial, tasks, sessions,
    timer: { ...initial.timer, endAt: NOW + 999999999 } }, NOW);
  assert.equal(restored.tasks.length, LIMITS.tasks);
  assert.equal(restored.sessions.length, LIMITS.sessions);
  assert.equal(restored.timer.running, false);
  assert.equal(restored.timer.remainingSeconds, 1500);
});

test('export is JSON, settles finished work, and can be imported without data loss', () => {
  const state = startTimer(createState(NOW), NOW);
  state.notes = '留白\n下一件重要的小事';
  const exported = JSON.parse(exportState(state, state.timer.endAt));
  assert.equal(exported.sessions.length, 1);
  assert.equal(exported.notes, state.notes);
  assert.deepEqual(sanitizeState(exported, state.timer.endAt), exported);
});

test('app updates summary when a button settles before tick, and export agrees with saved state', async (t) => {
  // Run the real event wiring with a tiny DOM surface; no timer or browser dependency.
  class Element {
    constructor(text = '') {
      this.ownText = text; this.children = []; this.listeners = new Map(); this.dataset = {};
      this.value = ''; this.hidden = false; this.style = {}; this.attributes = {};
      const classes = new Set();
      this.classList = { add: value => classes.add(value), remove: value => classes.delete(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value) };
    }
    set textContent(value) { this.ownText = String(value); this.children = []; }
    get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
    replaceChildren(...children) { this.ownText = ''; this.children = children; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    async emit(name, event = {}) { return this.listeners.get(name)?.(event); }
    focus() {}
    click() {}
    remove() {}
    showModal() {}
    close() {}
  }
  const elements = new Map();
  const node = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const modeButtons = ['focus', 'short', 'long'].map(mode => {
    const button = new Element(); button.dataset.mode = mode; return button;
  });
  const filters = ['all', 'todo', 'done'].map(filter => {
    const button = new Element(); button.dataset.filter = filter; return button;
  });
  const fakeDocument = { hidden: false, body: new Element(), title: '',
    querySelector: node,
    querySelectorAll: selector => selector === '.mode-tabs button' ? modeButtons
      : selector === '.task-tabs button' ? filters : [],
    createElement: () => new Element(), createTextNode: text => new Element(text),
    addEventListener() {} };
  let clock = NOW;
  const stored = new Map([[STORAGE_KEY, JSON.stringify(startTimer(createState(NOW), NOW))]]);
  const replacedGlobals = new Map();
  for (const [key, value] of Object.entries({
    document: fakeDocument, window: { addEventListener() {} },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    matchMedia: () => ({ matches: false }),
  })) {
    replacedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  t.after(() => {
    for (const [key, descriptor] of replacedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(globalThis, 'setTimeout', () => 1);
  t.mock.method(globalThis, 'clearTimeout', () => {});
  let backup;
  t.mock.method(URL, 'createObjectURL', blob => { backup = blob; return 'blob:test'; });
  t.mock.method(URL, 'revokeObjectURL', () => {});

  await import('../src/app.js?boundary-regression');
  assert.equal(node('#stat-sessions').textContent, '0');
  clock += 1500001; // Expired, but the scheduled tick has not run.
  await node('#timer-start').emit('click');
  assert.equal(node('#stat-sessions').textContent, '1');
  assert.equal(node('#stat-minutes').textContent, '25min');
  assert.equal(JSON.parse(stored.get(STORAGE_KEY)).sessions.length, 1);

  await node('#timer-start').emit('click');
  const runId = JSON.parse(stored.get(STORAGE_KEY)).timer.runId;
  clock += 60250;
  await node('#timer-start').emit('click');
  assert.equal(JSON.parse(stored.get(STORAGE_KEY)).timer.remainingSeconds, 1439.75);
  clock += 60000;
  await node('#timer-start').emit('click');
  assert.equal(JSON.parse(stored.get(STORAGE_KEY)).timer.runId, runId);

  clock = JSON.parse(stored.get(STORAGE_KEY)).timer.endAt + 1;
  await node('#export-data').emit('click');
  const exported = JSON.parse(await backup.text());
  assert.equal(exported.sessions.length, 2);
  assert.equal(node('#stat-sessions').textContent, '2');
  assert.equal(node('#stat-minutes').textContent, '50min');
  assert.deepEqual(exported, JSON.parse(stored.get(STORAGE_KEY)));
  assert.deepEqual(sanitizeState(exported, clock), exported);
});
