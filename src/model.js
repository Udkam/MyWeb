/** Local-only Focus Desk data. All timestamps are milliseconds since Unix epoch. */
export const STORAGE_KEY = 'focus-desk:v1';
export const LIMITS = Object.freeze({ tasks: 200, sessions: 500, title: 160, notes: 10000 });
export const DEFAULT_DURATIONS = Object.freeze({ focus: 25, short: 5, long: 15 });

const modes = Object.keys(DEFAULT_DURATIONS);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validTime = (value) => Number.isFinite(value) && value >= 0 && value <= 8.64e15;
const time = (now) => {
  const value = now instanceof Date ? now.getTime() : now;
  if (!validTime(value)) throw new RangeError('A valid current timestamp is required.');
  return value;
};
const text = (value, limit) => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit)
  : '';
const identifier = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value)
  ? value : null;
const minutes = (value, fallback) => Number.isFinite(value)
  ? Math.min(120, Math.max(1, Math.round(value))) : fallback;

export function todayKey(now) {
  const date = new Date(time(now));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function emptyTimer(mode, durationMinutes) {
  const durationSeconds = durationMinutes * 60;
  return { mode, durationSeconds, remainingSeconds: durationSeconds, running: false,
    endAt: null, startedAt: null, runId: null, taskId: null };
}

export function createState(now) {
  time(now);
  return { version: 1, tasks: [], notes: '', sessions: [],
    durations: { ...DEFAULT_DURATIONS }, timer: emptyTimer('focus', 25), nextRunId: 1 };
}

/** Discard unknown fields and malformed records instead of trusting a backup. */
export function sanitizeState(input, now) {
  now = time(now);
  const state = createState(now);
  if (!isRecord(input) || input.version !== 1) {
    throw new TypeError('This is not a supported Focus Desk backup.');
  }

  state.notes = text(input.notes, LIMITS.notes);
  const taskIds = new Set();
  if (Array.isArray(input.tasks)) {
    for (const task of input.tasks.slice(0, LIMITS.tasks)) {
      if (!isRecord(task)) continue;
      const id = identifier(task.id);
      const title = text(task.title, LIMITS.title).replace(/[\r\n\t]/g, ' ').trim();
      if (!id || !title || taskIds.has(id)) continue;
      taskIds.add(id);
      const createdAt = validTime(task.createdAt) && task.createdAt <= now ? task.createdAt : now;
      const done = task.done === true;
      const completedAt = done
        ? (validTime(task.completedAt) && task.completedAt >= createdAt && task.completedAt <= now
          ? task.completedAt : now)
        : null;
      state.tasks.push({ id, title, done, createdAt, completedAt });
    }
  }
  const sessionIds = new Set();
  if (Array.isArray(input.sessions)) {
    // Keep the most recent records when an old backup exceeds the retention limit.
    for (const session of input.sessions.slice(-LIMITS.sessions)) {
      if (!isRecord(session)) continue;
      const id = identifier(session.id);
      if (!id || sessionIds.has(id) || !validTime(session.startedAt)
        || !validTime(session.completedAt) || session.completedAt < session.startedAt
        || session.completedAt > now || !Number.isInteger(session.durationSeconds)
        || session.durationSeconds < 60 || session.durationSeconds > 7200
        || session.completedAt - session.startedAt < session.durationSeconds * 1000) continue;
      sessionIds.add(id);
      state.sessions.push({ id, startedAt: session.startedAt, completedAt: session.completedAt,
        durationSeconds: session.durationSeconds, taskId: identifier(session.taskId) });
    }
  }
  state.sessions.sort((a, b) => a.completedAt - b.completedAt);
  if (isRecord(input.durations)) {
    for (const mode of modes) state.durations[mode] = minutes(input.durations[mode], DEFAULT_DURATIONS[mode]);
  }
  state.nextRunId = Number.isSafeInteger(input.nextRunId) && input.nextRunId >= 1
    && input.nextRunId < Number.MAX_SAFE_INTEGER ? input.nextRunId : 1;

  const timer = input.timer;
  if (!isRecord(timer)) return state;
  const mode = modes.includes(timer.mode) ? timer.mode : 'focus';
  state.timer = emptyTimer(mode, state.durations[mode]);
  // A mode's selected duration is authoritative; arbitrary duration fields are ignored.
  const duration = state.timer.durationSeconds;
  const remaining = Number.isFinite(timer.remainingSeconds)
    && timer.remainingSeconds >= 0 && timer.remainingSeconds <= duration ? timer.remainingSeconds : duration;
  const runId = identifier(timer.runId);
  const startedAt = validTime(timer.startedAt) && timer.startedAt <= now ? timer.startedAt : null;
  const taskId = identifier(timer.taskId);
  if (!runId || startedAt === null) return state;

  state.timer = { ...state.timer, remainingSeconds: remaining, runId, startedAt, taskId };
  if (sessionIds.has(runId)) {
    state.timer.remainingSeconds = 0;
    return state;
  }
  if (timer.running === true) {
    const deadlineValid = validTime(timer.endAt) && timer.endAt >= startedAt
      && timer.endAt <= now + duration * 1000
      && timer.endAt - startedAt >= duration * 1000;
    state.timer = deadlineValid
      ? { ...state.timer, running: true, endAt: timer.endAt }
      : emptyTimer(mode, state.durations[mode]);
  }
  return state;
}

/** Display value derives from the deadline, so sleeping tabs never lose time. */
export function deriveTimer(state, now) {
  now = time(now);
  const timer = state.timer;
  const preciseSeconds = timer.running
    ? Math.max(0, Math.min(timer.durationSeconds, (timer.endAt - now) / 1000))
    : timer.remainingSeconds;
  const remainingSeconds = Math.ceil(preciseSeconds);
  return { mode: timer.mode, durationSeconds: timer.durationSeconds, remainingSeconds,
    isRunning: timer.running, isExpired: timer.running && preciseSeconds <= 0,
    progress: Math.max(0, Math.min(1, 1 - preciseSeconds / timer.durationSeconds)) };
}

/** Complete an expired focus once. Breaks finish without contributing focus time. */
export function settleTimer(state, now) {
  now = time(now);
  if (!deriveTimer(state, now).isExpired) return state;
  const timer = state.timer;
  const sessions = timer.mode === 'focus' && timer.runId
    && !state.sessions.some((session) => session.id === timer.runId)
    ? [...state.sessions, { id: timer.runId, startedAt: timer.startedAt,
      completedAt: timer.endAt, durationSeconds: timer.durationSeconds, taskId: timer.taskId }]
      .slice(-LIMITS.sessions)
    : state.sessions;
  return { ...state, sessions, timer: { ...timer, remainingSeconds: 0, running: false, endAt: null } };
}

export function startTimer(state, now, taskId = null) {
  now = time(now);
  state = settleTimer(state, now);
  if (state.timer.running) return state;
  const fresh = !state.timer.runId || state.timer.remainingSeconds <= 0;
  const remaining = fresh ? state.timer.durationSeconds : state.timer.remainingSeconds;
  // Timestamp plus sequence avoids collisions, including two cycles in one millisecond.
  let sequence = state.nextRunId;
  let runId = `focus-${Math.trunc(now)}-${sequence}`;
  while (state.sessions.some((session) => session.id === runId)) {
    sequence += 1;
    runId = `focus-${Math.trunc(now)}-${sequence}`;
  }
  return { ...state, nextRunId: fresh ? sequence + 1 : state.nextRunId,
    timer: { ...state.timer, running: true, remainingSeconds: remaining, endAt: now + remaining * 1000,
      startedAt: fresh ? now : state.timer.startedAt,
      runId: fresh ? runId : state.timer.runId,
      taskId: fresh ? identifier(taskId) : state.timer.taskId } };
}

export function pauseTimer(state, now) {
  now = time(now);
  state = settleTimer(state, now);
  if (!state.timer.running) return state;
  return { ...state, timer: { ...state.timer, running: false, endAt: null,
    remainingSeconds: Math.max(0, Math.min(state.timer.durationSeconds, (state.timer.endAt - now) / 1000)) } };
}

export function resetTimer(state, now) {
  state = settleTimer(state, time(now));
  return { ...state, timer: emptyTimer(state.timer.mode, state.durations[state.timer.mode]) };
}

export function setTimerMode(state, mode, now, customMinutes) {
  if (!modes.includes(mode)) throw new RangeError('Unknown timer mode.');
  if (customMinutes !== undefined && minutes(customMinutes, null) === null) {
    throw new RangeError('Duration must be a finite number.');
  }
  state = settleTimer(state, time(now));
  const durations = { ...state.durations, [mode]: minutes(customMinutes, state.durations[mode]) };
  return { ...state, durations, timer: emptyTimer(mode, durations[mode]) };
}

export function exportState(state, now) {
  now = time(now);
  return JSON.stringify(settleTimer(sanitizeState(state, now), now), null, 2);
}
