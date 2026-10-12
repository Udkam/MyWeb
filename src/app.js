import { STORAGE_KEY, LIMITS, createState, sanitizeState, exportState, todayKey, deriveTimer, startTimer, pauseTimer, resetTimer, setTimerMode, settleTimer } from './model.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let state = createState(Date.now());
let loadProblem = '';
let soundEnabled = false;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = sanitizeState(JSON.parse(raw), Date.now());
  soundEnabled = localStorage.getItem('focus-desk:sound') === 'on';
} catch { loadProblem = '未能读取原有数据。本次仍可使用，请及时导出备份。'; }
let selectedTaskId = state.timer.taskId;
let taskFilter = 'all';
let toastTimer;
let timerTick;
let audio;
let currentDateKey = '';
let pendingConfirmation;
let storageAvailable = true;
const modeLabels = { focus: '专注', short: '短休息', long: '长休息' };

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4300);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
    $('#save-status').innerHTML = '<i></i>已存于此浏览器';
  } catch {
    storageAvailable = false;
    $('#save-status').textContent = '未能保存，请导出备份';
  }
}

function update(next, { tasks = true, summary = true } = {}) {
  // A button can settle an expired timer before the next scheduled tick.
  // Refresh even when a timer-only action requested the cheaper render path.
  const sessionsChanged = next.sessions !== state.sessions;
  state = next;
  persist();
  if (tasks) renderTasks();
  if (summary || sessionsChanged) renderSummary();
  renderTimer();
}

function confirmAction(title, description, accept = '确认') {
  if (pendingConfirmation) return Promise.resolve(false);
  $('#confirm-title').textContent = title;
  $('#confirm-description').textContent = description;
  $('#confirm-accept').textContent = accept;
  $('#confirm-dialog').showModal();
  $('#confirm-cancel').focus();
  return new Promise((resolve) => { pendingConfirmation = resolve; });
}
function finishConfirmation(accepted) {
  $('#confirm-dialog').close();
  pendingConfirmation?.(accepted);
  pendingConfirmation = null;
}
$('#confirm-cancel').addEventListener('click', () => finishConfirmation(false));
$('#confirm-accept').addEventListener('click', () => finishConfirmation(true));
$('#confirm-dialog').addEventListener('cancel', (event) => { event.preventDefault(); finishConfirmation(false); });

function makeButton(label, text, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', action);
  return button;
}

function renderTasks() {
  const list = $('#task-list');
  list.replaceChildren();
  const visible = state.tasks.filter(task => taskFilter === 'all' || (taskFilter === 'done' ? task.done : !task.done));
  for (const task of visible) {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}${task.id === selectedTaskId ? ' active' : ''}`;
    const check = makeButton(`${task.done ? '恢复' : '完成'}任务：${task.title}`, task.done ? '✓' : '', 'task-check', () => {
      update({ ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() } : t) });
      if (!task.done) toast('又完成了一件事。');
    });
    check.setAttribute('aria-pressed', String(task.done));
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    const actions = document.createElement('span');
    actions.className = 'task-item-actions';
    if (!task.done) actions.append(makeButton(`选为专注任务：${task.title}`, '▷', 'task-action', () => chooseTask(task.id)));
    actions.append(makeButton(`删除任务：${task.title}`, '×', 'task-action delete', async () => {
      if (!await confirmAction('把这件事放下？', `将删除「${task.title}」。已完成的专注记录会保留。`, '删除任务')) return;
      if (selectedTaskId === task.id) selectedTaskId = null;
      update({ ...state, tasks: state.tasks.filter(t => t.id !== task.id) });
      toast('任务已删除。');
    }));
    item.append(check, title, actions);
    list.append(item);
  }
  const todo = state.tasks.filter(task => !task.done).length;
  const done = state.tasks.length - todo;
  $('#task-count').textContent = `${todo} 项待办`;
  $('#task-empty').hidden = visible.length > 0;
  $('#empty-title').textContent = taskFilter === 'done' ? '每一件完成，都值得记下。' : taskFilter === 'todo' && state.tasks.length ? '清单里的事，都完成了。' : '清单留白，心也轻一点。';
  $('#empty-description').textContent = taskFilter === 'done' ? '完成的任务会出现在这里。' : '写下一件小事，从这里开始。';
  $('#clear-done').hidden = done === 0;
  $('#task-hint').textContent = done ? `${done} / ${state.tasks.length} 项已完成` : '一次专注，一件小事。';
}

function renderSummary() {
  const now = Date.now();
  const key = todayKey(now);
  currentDateKey = key;
  const sessions = state.sessions.filter(s => todayKey(s.completedAt) === key);
  const minutes = Math.floor(sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60);
  $('#stat-minutes').replaceChildren(document.createTextNode(String(minutes)));
  const unit = document.createElement('span'); unit.textContent = 'min'; $('#stat-minutes').append(unit);
  $('#stat-sessions').textContent = String(sessions.length);
  $('#stat-tasks').textContent = String(state.tasks.filter(t => t.done && todayKey(t.completedAt) === key).length);
  $('#today-label').textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - 6 + i);
    const day = todayKey(date.getTime());
    const duration = Math.floor(state.sessions.filter(s => todayKey(s.completedAt) === day).reduce((sum, s) => sum + s.durationSeconds, 0) / 60);
    return { day, date, duration, label: i === 6 ? '今天' : `${date.getMonth() + 1}/${date.getDate()}` };
  });
  const total = days.reduce((sum, day) => sum + day.duration, 0);
  $('#week-summary').textContent = total ? `近 7 天，为重要的事留出了 ${total} 分钟。` : '从今天的第一段专注开始。';
  const chart = $('#week-chart'); chart.replaceChildren();
  chart.setAttribute('aria-label', `近七天专注时长：${days.map(d => `${d.label} ${d.duration} 分钟`).join('，')}`);
  const peak = Math.max(60, ...days.map(d => d.duration));
  for (const day of days) {
    const column = document.createElement('div'); column.className = `day-column${day.day === key ? ' today' : ''}`;
    column.title = `${day.day} · ${day.duration} 分钟`;
    const bar = document.createElement('div'); bar.className = 'day-bar'; bar.style.height = `${Math.max(3, day.duration / peak * 54)}px`;
    const label = document.createElement('span'); label.className = 'day-name'; label.textContent = day.label;
    column.append(bar, label); chart.append(column);
  }
}

function renderTimer() {
  const timer = deriveTimer(state, Date.now());
  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  $('#timer-display').textContent = display;
  $('#timer-display').setAttribute('aria-label', `剩余 ${minutes} 分 ${seconds} 秒`);
  $('#timer-progress').style.strokeDashoffset = String(timer.progress * 100);
  $('#timer-dial').classList.toggle('running', timer.isRunning);
  const stateText = timer.isRunning ? (timer.mode === 'focus' ? '眼前这一件，值得专注' : '停一停，也很好') : timer.remainingSeconds === 0 ? '完成了，好好伸个懒腰' : state.timer.runId ? '已暂停，等你回来' : '准备好，就开始';
  $('#timer-state').replaceChildren(document.createElement('i'), document.createTextNode(stateText));
  $('#timer-caption').textContent = timer.mode === 'focus' ? '留一段完整的时间' : '给思绪一点呼吸';
  $('#start-label').textContent = timer.isRunning ? '暂停' : state.timer.runId && timer.remainingSeconds > 0 ? '继续' : `开始${modeLabels[timer.mode]}`;
  $('#start-icon').textContent = timer.isRunning ? 'Ⅱ' : '▶';
  $('#timer-start').setAttribute('aria-label', $('#start-label').textContent);
  const active = state.tasks.find(t => t.id === selectedTaskId);
  $('#active-task span').textContent = active ? active.title : timer.mode === 'focus' ? '正在为自己留白' : '暂时，把清单放在一边';
  $('#active-task').title = active?.title ?? '';
  $('#focus-tip').textContent = timer.mode === 'focus' ? (matchMedia('(max-width: 640px)').matches ? '把分心的念头，暂时写进随手记。' : '把分心的念头，暂时写在右边。') : '抬头，远望，让肩膀放松下来。';
  $('#completion').hidden = timer.remainingSeconds !== 0 || timer.mode !== 'focus';
  $('#take-break').textContent = `休息 ${state.durations.short} 分钟 →`;
  $$('.mode-tabs button').forEach(button => {
    const selected = button.dataset.mode === timer.mode;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
  document.title = timer.isRunning ? `${display} · ${modeLabels[timer.mode]} — 留白` : '留白 · Focus Desk';
}

function enableAudio() {
  if (!soundEnabled) return;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); void audio.resume(); } catch { /* Timer remains usable when audio is unavailable. */ }
}
function playChime() {
  if (!soundEnabled || !audio || audio.state !== 'running') return;
  [660, 880].forEach((frequency, index) => {
    const oscillator = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + index * .22;
    oscillator.frequency.value = frequency; oscillator.type = 'sine'; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.09, start + .03); gain.gain.exponentialRampToValueAtTime(.001, start + .7);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + .75);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); });
  });
}

function tick() {
  clearTimeout(timerTick);
  const next = settleTimer(state, Date.now());
  if (next !== state) {
    const wasFocus = state.timer.mode === 'focus';
    update(next);
    toast(wasFocus ? '专注完成，给自己一个小小的肯定。' : '休息结束，准备好再出发。');
    playChime();
  } else renderTimer();
  if (todayKey(Date.now()) !== currentDateKey) renderSummary();
  if (!document.hidden) timerTick = setTimeout(tick, 1000);
}

function timerHasProgress() { return !!state.timer.runId && deriveTimer(state, Date.now()).remainingSeconds > 0; }
async function chooseTask(id) {
  if (id === selectedTaskId && state.timer.mode === 'focus') return;
  if (timerHasProgress() && !await confirmAction('切换专注任务？', '当前未完成的计时会重置，已经完成的记录会保留。', '切换任务')) return;
  selectedTaskId = id;
  update(setTimerMode(state, 'focus', Date.now()));
  toast('已选好任务，准备好就开始。');
}

$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#task-input'); const title = input.value.trim();
  if (!title) return;
  if (state.tasks.length >= LIMITS.tasks) { toast('清单已达 200 项，请先清理一些已完成任务。'); return; }
  const task = { id: crypto.randomUUID(), title, done: false, createdAt: Date.now(), completedAt: null };
  taskFilter = 'all'; updateFilterButtons();
  update({ ...state, tasks: [...state.tasks, task] }); input.value = ''; input.focus();
  if (!storageAvailable) toast('当前无法自动保存，请使用导出备份。');
});
function updateFilterButtons() { $$('.task-tabs button').forEach(button => { const selected = button.dataset.filter === taskFilter; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); }); }
$$('.task-tabs button').forEach(button => button.addEventListener('click', () => { taskFilter = button.dataset.filter; updateFilterButtons(); renderTasks(); }));
$('#clear-done').addEventListener('click', async () => {
  if (!await confirmAction('清理已完成任务？', '将从清单中删除已完成任务，今日完成任务数会随之更新；专注记录和时长会保留。', '清理')) return;
  update({ ...state, tasks: state.tasks.filter(t => !t.done) });
});
$('#notes').value = state.notes;
$('#note-count').textContent = `${state.notes.length} 字`;
$('#notes').addEventListener('input', () => { state = { ...state, notes: $('#notes').value }; persist(); $('#note-count').textContent = `${state.notes.length} 字`; });
$('#timer-start').addEventListener('click', () => { enableAudio(); update(state.timer.running ? pauseTimer(state, Date.now()) : startTimer(state, Date.now(), selectedTaskId), { tasks: false, summary: false }); tick(); });
$('#timer-reset').addEventListener('click', async () => {
  if (timerHasProgress() && !await confirmAction('重新开始这一段？', '当前未完成的计时会清零，已完成的专注记录会保留。', '重置计时')) return;
  update(resetTimer(state, Date.now()));
});
$$('.mode-tabs button').forEach(button => button.addEventListener('click', async () => {
  const mode = button.dataset.mode; if (state.timer.mode === mode) return;
  if (timerHasProgress() && !await confirmAction(`切换到${modeLabels[mode]}？`, '当前未完成的计时会重置。', '切换模式')) return;
  update(setTimerMode(state, mode, Date.now()), { tasks: false });
}));
$('#take-break').addEventListener('click', () => { update(setTimerMode(state, 'short', Date.now())); });

function openSettings() {
  for (const mode of ['focus', 'short', 'long']) $(`#duration-${mode}`).value = String(state.durations[mode]);
  $('#sound-enabled').checked = soundEnabled;
  $('#settings-dialog').showModal();
}
['settings-open', 'duration-open', 'backup-open'].forEach(id => $(`#${id}`).addEventListener('click', openSettings));
$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const durations = Object.fromEntries(['focus', 'short', 'long'].map(mode => [mode, Number($(`#duration-${mode}`).value)]));
  if (Object.values(durations).some(value => !Number.isInteger(value) || value < 1 || value > 120)) { toast('请输入 1–120 的整数分钟。'); return; }
  const changed = Object.keys(durations).some(mode => durations[mode] !== state.durations[mode]);
  if (changed && timerHasProgress() && !await confirmAction('保存并重置当前计时？', '新的时长会从头开始计算，已完成记录会保留。', '保存设置')) return;
  soundEnabled = $('#sound-enabled').checked;
  try { localStorage.setItem('focus-desk:sound', soundEnabled ? 'on' : 'off'); } catch { /* Main persistence status handles restricted storage. */ }
  if (changed) update(resetTimer({ ...state, durations }, Date.now()));
  $('#settings-dialog').close(); toast('已按你的节奏设置。');
});
$('#export-data').addEventListener('click', () => {
  const now = Date.now();
  update(settleTimer(state, now), { tasks: false, summary: false });
  const content = exportState(state, now);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `liubai-${todayKey(now)}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('备份已导出，请妥善保存。');
});
$('#import-open').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
  if (file.size > 1_000_000) { toast('备份过大，请选择小于 1 MB 的留白 JSON 文件。'); return; }
  let restored;
  try { restored = sanitizeState(JSON.parse(await file.text()), Date.now()); } catch { toast('这不是有效的留白备份，现有数据未更改。'); return; }
  if (!await confirmAction('用备份恢复工作台？', `备份包含 ${restored.tasks.length} 项任务和 ${restored.sessions.length} 段专注。\n恢复会替换此浏览器的当前数据，建议先导出一份备份。`, '恢复备份')) return;
  state = settleTimer(restored, Date.now()); selectedTaskId = state.timer.taskId; taskFilter = 'all'; updateFilterButtons();
  $('#notes').value = state.notes; $('#note-count').textContent = `${state.notes.length} 字`;
  update(state); $('#settings-dialog').close(); toast('已恢复备份，欢迎回来。'); tick();
});
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  try {
    state = event.newValue ? sanitizeState(JSON.parse(event.newValue), Date.now()) : createState(Date.now());
    selectedTaskId = state.timer.taskId; $('#notes').value = state.notes; $('#note-count').textContent = `${state.notes.length} 字`;
    renderTasks(); renderSummary(); tick();
  } catch { toast('另一标签页的数据暂时无法读取。'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timerTick); else tick(); });
renderTasks(); renderSummary(); tick();
if (loadProblem) { $('#save-status').textContent = '原有数据读取失败'; toast(loadProblem); }
