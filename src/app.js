import { createRun, step, chooseRelic, setWorldSize, snapshot, restoreRun, describe, interact, nearestInteractable, availableEmbers, RELICS, WEAPONS } from './engine.js';
import { loadArt, render, assetStatus } from './renderer.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, createDefaultSave, saveSave, parseImport, exportSave } from './storage.js';
import { getLanguage, setLanguage, t, translateMessage, localizeWeapon, localizeRelic, applyTranslations } from './i18n.js';
import { fieldGuide } from './field-guide.js';
import { discoveryInfo, focusedDiscovery } from './discovery.js';
import { ROOM_TITLES } from './rooms.js';
import { createOnboarding } from './onboarding.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false }), menu = $('menu');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const testMode = new URLSearchParams(location.search).get('test') === '1';
const icons = { split: '⋔', ricochet: '↱', pierce: '↟', seeking: '✧', chain: 'ϟ', burn: '♨', cold: '❄', explosive: '✹', blades: '✥', trail: '≋', nova: '✳', blood: '♦' };
const weaponIcons = { cinder: 'ϟ', scatter: '⋔', needle: '↟' };
const initial = loadSave();
let data = initial.data || createDefaultSave(), saveStatus = initial.status, saveMessage = initial.message || '', storageRaw = initial.raw;
let mode = 'title', paused = false, ready = false, selectedWeapon = 'cinder', titleAct = 1, state, preview;
let manualTime = testMode, accumulator = 0, lastFrame = 0, lastHud = '', lastBuild = '', bannerUntil = 0, toastTimer;
let queue = Promise.resolve(), conflicted = false, titleBeforeMenu = null, pendingImport = null;
let menuSection = 'settings', endUnlocks = [], bannerText = null, currentToast = '';
let artFailed = false, audioActivated = false, audioStarting = false;
let onboarding = null, guideSignature = '', frameRequest = 0, lastTitlePaint = 0, drawCount = 0;
const dims = { width: 0, height: 0, dpr: 1 };
const audio = createAudio(() => toast('Audio could not start. You can keep playing and retry with the music button.'), () => syncAudioUI());
const input = createInput(canvas, () => state || preview, command);
const currentWorld = () => state || preview;
const reducedMotion = () => motionQuery.matches || data.settings.reduceMotion;
const shouldAnimate = () => ready && !document.hidden && !paused && !manualTime && (mode === 'playing' || (mode === 'title' && !reducedMotion()));

function syncMotion() {
  document.body.dataset.reduceMotion = String(reducedMotion());
  document.body.dataset.paused = String(paused);
  document.body.dataset.pageHidden = String(document.hidden);
  if (shouldAnimate()) {
    if (!frameRequest) { lastFrame = 0; lastTitlePaint = 0; frameRequest = requestAnimationFrame(frame); }
  } else {
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0; lastFrame = 0; accumulator = 0;
  }
}

function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function unlocked(w) { return data.stats.rooms >= w.unlockRooms; }
function fmtTime(seconds) { const whole = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; }
function toast(message, duration = 5000) { currentToast = typeof message === 'function' ? message : () => translateMessage(message); $('toast').textContent = currentToast(); $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, duration); }
function announce(message) { $('announcer').textContent = translateMessage(message); }
function logicalSize() {
  const ratio = dims.width / Math.max(1, dims.height);
  return ratio < 1 ? { width: Math.max(380, 1000 * ratio), height: 1000 } : { width: 1100, height: Math.max(560, 1100 / ratio) };
}
function resize() {
  const rect = canvas.getBoundingClientRect(); dims.width = rect.width; dims.height = rect.height; dims.dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(dims.width * dims.dpr); canvas.height = Math.round(dims.height * dims.dpr);
  placeBossHud();
  const size = logicalSize();
  if (state) setWorldSize(state, size.width, size.height);
  if (preview) setWorldSize(preview, size.width, size.height);
  input.clear(); onboarding?.observe(state, { paused: true }); draw();
}
function setMode(next) {
  mode = next; document.body.dataset.mode = next;
  $('title-screen').hidden = next !== 'title'; $('combat-ui').hidden = next !== 'playing';
  $('run-hud').hidden = next === 'title'; $('reward-screen').hidden = next !== 'reward'; $('end-screen').hidden = next !== 'end';
  input.setActive(next === 'playing' && !paused); accumulator = 0; lastHud = ''; syncSoundscape(); syncMotion(); updateHUD(); draw();
}
function syncSoundscape() { audio.setScene({ title: mode === 'title', biome: state?.biome, boss: !!state?.bossId }); }
function draw() {
  if (!ready || !currentWorld()) return;
  ctx.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
  render(ctx, mode === 'title' ? preview : state, { ...dims, reduceMotion: reducedMotion(), title: mode === 'title', titleWeapon: selectedWeapon, titleAct });
  drawCount++;
}
function syncTitle() {
  const focusedWeapon = document.activeElement?.dataset?.weapon;
  if (!WEAPONS.some((w) => w.id === selectedWeapon && unlocked(w))) selectedWeapon = 'cinder';
  $('weapon-options').replaceChildren(...WEAPONS.map((original) => {
    const w = localizeWeapon(original);
    const button = document.createElement('button'); button.className = 'weapon-choice'; button.type = 'button';
    button.dataset.weapon = w.id;
    button.setAttribute('aria-pressed', String(selectedWeapon === w.id)); button.setAttribute('aria-disabled', String(!unlocked(w)));
    button.title = `${w.description}${unlocked(w) ? '' : ` ${t('Clear {rooms} total rooms to unlock.', { rooms: w.unlockRooms })}`}`;
    button.innerHTML = `<span class="weapon-icon" aria-hidden="true">${weaponIcons[w.id]}</span><span>${escapeHTML(w.name)}${unlocked(w) ? '' : `<small>${t('{cleared}/{rooms} ROOMS', { cleared: data.stats.rooms, rooms: w.unlockRooms })}</small>`}</span>`;
    button.addEventListener('click', () => { if (!unlocked(w)) { toast(() => t('{name}: clear {rooms} rooms across any number of runs to unlock.', { name: localizeWeapon(original).name, rooms: w.unlockRooms })); return; } selectedWeapon = w.id; syncTitle(); draw(); });
    return button;
  }));
  if (focusedWeapon) $('weapon-options').querySelector(`[data-weapon="${focusedWeapon}"]`)?.focus({ preventScroll: true });
  $('weapon-detail').textContent = localizeWeapon(WEAPONS.find(w => w.id === selectedWeapon)).description;
  $('unlocks-caption').textContent = `${WEAPONS.filter(unlocked).length} / ${WEAPONS.length}`;
  $('title-stats').innerHTML = `<span><strong>${data.stats.bestRoom || '—'}</strong>${t('DEEPEST ROOM')}</span><span><strong>${data.stats.rooms}</strong>${t('ROOMS CLEARED')}</span><span><strong>${data.stats.wins}</strong>${t('ESCAPES')}</span>`;
  $('title-stats').hidden = data.stats.runs === 0;
  $('resume-run').hidden = !data.checkpoint || !ready;
  $('play').innerHTML = `<span>${t(!ready ? 'Preparing the vault…' : data.checkpoint ? 'Start a new descent' : 'Play now')}</span><span aria-hidden="true">↗</span>`;
  if (data.checkpoint) $('resume-run').innerHTML = `${t('Continue · room {room}', { room: data.checkpoint.room })} <span>↗</span>`;
  const localReady = ['ready', 'empty', 'saved'].includes(saveStatus);
  $('load-message').textContent = artFailed ? t('Some artwork could not load. Reload this page to retry.') : !ready ? t('Loading the dungeon.') : localReady ? t('Auto-saved here · Resume at the room entrance') : `${translateMessage(saveMessage || 'Progress is currently in memory only.')} ${t('Open settings to export a backup.')}`;
  syncAudioUI(); syncActPreview();
  syncMotion();
}

const ACT_PREVIEWS = [
  ['THE HOLLOW', 'Broken stone. A guardian blocks the descent.'],
  ['THE MIRE', 'Roots, drowned passages and a hungry deep.'],
  ['THE CINDER VAULT', 'Molten ruins. The furnace does not sleep.'],
  ['THE STORM', 'Lightning and relentless pursuit.'],
  ['THE VOID', 'Time fractures at the final threshold.'],
];
function syncActPreview() {
  const focused = document.activeElement?.dataset?.act;
  $('act-preview-options').replaceChildren(...ACT_PREVIEWS.map(([name], i) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.act = String(i + 1);
    button.setAttribute('aria-pressed', String(titleAct === i + 1));
    button.innerHTML = `<span aria-hidden="true">0${i + 1}</span><strong>${t(name)}</strong>`;
    button.addEventListener('click', () => { titleAct = i + 1; syncActPreview(); draw(); });
    return button;
  }));
  if (focused) $('act-preview-options').querySelector(`[data-act="${focused}"]`)?.focus({ preventScroll: true });
  $('act-preview-detail').textContent = t(ACT_PREVIEWS[titleAct - 1][1]);
}
function syncAudioUI() {
  const status = audio.status(), enabled = data.settings.music || data.settings.sfx;
  const playing = status.musicPlaying && data.settings.music;
  $('audio-toggle').dataset.active = String(audioActivated && enabled && !status.blocked);
  $('audio-toggle').setAttribute('aria-label', t(!audioActivated || status.blocked ? 'Enable audio' : enabled ? 'Mute audio' : 'Enable audio'));
  $('music-start').dataset.playing = String(playing);
  $('music-start-label').textContent = t(audioStarting && !playing ? 'Starting music…' : playing ? 'Music on' : data.settings.music ? 'Click to start music' : 'Enable music');
  $('music-state').textContent = t(playing ? 'Juhani Junkala · CC0' : audioStarting ? 'Loading recording' : 'Sound starts after your first interaction');
}
async function activateSound() {
  if (audioStarting || document.hidden || paused) return;
  audioActivated = true; audioStarting = true; syncAudioUI();
  try { const waking = audio.resume(); await audio.configure(data.settings); await waking; }
  finally { audioStarting = false; syncAudioUI(); }
}
function firstSoundGesture(event) {
  if (!event.isTrusted || audioActivated || paused || mode !== 'title' || !(data.settings.music || data.settings.sfx)) return;
  if (['KeyM', 'KeyP', 'Escape'].includes(event.code)) return;
  if (event.target instanceof Element && event.target.closest('#audio-toggle,#music-start,#pause-button,#how-to-play,#credits-button,#title-import,input')) return;
  void activateSound();
}
document.addEventListener('pointerdown', firstSoundGesture, { capture: true });
document.addEventListener('keydown', firstSoundGesture, { capture: true });

function persist() {
  queue = queue.catch(() => {}).then(async () => {
    if (conflicted) return;
    const perform = () => {
      const result = saveSave(data);
      saveStatus = result.status; saveMessage = result.message || '';
      if (result.ok) { data = result.data; storageRaw = result.raw; }
      else if (result.status === 'conflict') { conflicted = true; pauseForConflict(); }
      else if (mode !== 'title' && result.status !== 'saved') toast('Progress is in memory only. Open settings to export it.');
      syncTitle();
    };
    if (navigator.locks?.request) {
      try { await navigator.locks.request('cinder-below-v1', perform); }
      catch { saveStatus = 'unavailable'; saveMessage = 'The browser refused the save lock. Progress is kept in memory; export it before closing.'; syncTitle(); }
    }
    else { saveStatus = 'unavailable'; saveMessage = 'This browser cannot safely coordinate local saves. Progress is kept in memory; export it before closing.'; syncTitle(); }
  });
  return queue;
}
function bankProgress() {
  data.banked ||= { rooms: 0, kills: 0, embers: 0 };
  for (const field of ['rooms', 'kills', 'embers']) {
    const now = Math.max(0, Math.floor(state.stats[field] || 0));
    data.stats[field] += Math.max(0, now - data.banked[field]); data.banked[field] = Math.max(data.banked[field], now);
  }
  data.stats.bestRoom = Math.max(data.stats.bestRoom, state.room);
}
function checkpoint() { if (!state || ['dead', 'won'].includes(state.phase)) return; bankProgress(); data.checkpoint = snapshot(state); void persist(); }
function newSeed() { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return bytes[0] || 1; }
function begin(resume = false) {
  if (!ready || conflicted) { if (conflicted) pauseForConflict(); return; }
  menu.close(); pendingImport = null; paused = false; input.clear();
  const firstRun = !resume && data.stats.runs === 0;
  onboarding = null; guideSignature = '';
  if (resume) {
    state = restoreRun(data.checkpoint);
    if (!state) { toast('This checkpoint could not be read. Your lifetime progress is safe. Start a new descent.'); data.checkpoint = null; syncTitle(); return; }
    const size = logicalSize(); setWorldSize(state, size.width, size.height);
  } else {
    state = createRun({ seed: newSeed(), ...logicalSize(), weapon: selectedWeapon });
    data.stats.runs++; data.banked = { rooms: 0, kills: 0, embers: 0 };
  }
  if (firstRun) onboarding = createOnboarding(state);
  lastBuild = ''; setMode('playing'); canvas.focus({ preventScroll: true });
  roomBanner(); checkpoint(); audioActivated = true; void audio.resume(); void audio.configure(data.settings); announce(t('Room {room}. Move, aim and shoot. Space to dash.', { room: state.room }));
}
function setBanner(key, values = {}, duration = 2.5) {
  bannerText = { key, values }; bannerUntil = state.time + duration;
  $('room-banner').textContent = translatedBanner();
}
function translatedBanner() {
  const values = { ...bannerText.values };
  if (values.layout) values.layout = t(values.layout);
  if (values.bossId) values.name = fieldGuide().find(entry => entry.id === values.bossId)?.name || values.bossId;
  if (values.actKey) values.name = t(values.actKey);
  return t(bannerText.key, values);
}
function roomBanner() {
  const boss = state.enemies.find(e => e.boss);
  if (boss) {
    // The persistent boss bar supplies the name and phase; do not cover its body tell.
    bannerText = null; bannerUntil = state.time; $('room-banner').textContent = '';
    announce(t('BOSS · {name}', { name: fieldGuide().find(entry => entry.id === boss.type)?.name || boss.type }));
  }
  else if (state.biome === 'rift') setBanner(({ echo: 'RIFT · ECHO', surge: 'RIFT · SURGE', glass: 'RIFT · GLASS' })[state.riftRule] || 'THE OTHER SIDE', {}, 4.2);
  else if (state.totalRooms === 15 && state.room % 3 === 1) setBanner('ACT {act} · {name}', { act: state.act, actKey: state.actName });
  else {
    setBanner('{layout} · {room}', { layout: ROOM_TITLES[state.layout] || state.layout, room: String(state.room).padStart(2, '0') });
  }
}
function riftDescription(rule) {
  if (rule === 'echo') return t('Echo: your shots and enemy shots bounce once more.');
  if (rule === 'surge') return t('Surge: nova charges three times faster; enemy shots fly faster.');
  if (rule === 'glass') return t('Glass: your shots deal 50% more damage; hostile shots cost two hearts.');
  return '';
}
function showReward() {
  checkpoint(); setMode('reward'); audio.play('relic');
  renderRewards();
  $('relic-choices').querySelector('button')?.focus({ preventScroll: true }); announce('Room cleared. Choose one of three relics.');
}
function renderRewards() {
  $('relic-choices').replaceChildren(...state.choices.map((id, index) => {
    const relic = localizeRelic(RELICS.find((r) => r.id === id)), level = (state.relics[id] || 0) + 1;
    const button = document.createElement('button'); button.className = 'relic-card'; button.style.setProperty('--card-color', relic.color);
    button.innerHTML = `<span class="relic-key">${index + 1}</span><span class="relic-icon" aria-hidden="true">${icons[id] || '✦'}</span><span class="relic-tag">${escapeHTML(relic.tag)}</span><strong class="relic-name">${escapeHTML(relic.name)}</strong><span class="relic-desc">${escapeHTML(relic.description)}</span><span class="relic-level">${level === 1 ? t('NEW RELIC') : t('LEVEL {level}', { level })}</span>`;
    button.addEventListener('click', () => selectRelic(index)); return button;
  }));
}
function selectRelic(index) {
  if (mode !== 'reward' || paused) return;
  const id = state.choices[index]; if (!id || !chooseRelic(state, id)) return;
  audio.play('relic'); lastBuild = ''; setMode('playing'); canvas.focus({ preventScroll: true }); checkpoint();
  announce('Relic acquired. Walk into an exit: Hunt or Refuge.');
}
function finish() {
  const before = WEAPONS.filter(unlocked).map((w) => w.id);
  bankProgress(); if (state.phase === 'won') data.stats.wins++;
  data.checkpoint = null; data.banked = { rooms: 0, kills: 0, embers: 0 }; void persist();
  setMode('end'); audio.play(state.phase === 'won' ? 'relic' : 'death');
  endUnlocks = WEAPONS.filter((w) => unlocked(w) && !before.includes(w.id)).map((w) => w.id);
  renderEnd();
  $('retry').focus({ preventScroll: true }); announce(t(state.phase === 'won' ? 'Victory. {rooms} rooms cleared.' : 'Defeated. {rooms} rooms cleared.', { rooms: state.stats.rooms }));
}
function renderEnd() {
  $('end-label').textContent = state.phase === 'won' ? t('THE VAULT IS BROKEN') : t('FALLEN IN CHAMBER {room}', { room: String(state.room).padStart(2, '0') });
  $('end-title').textContent = t(state.phase === 'won' ? 'You brought the dawn.' : 'The flame returns.');
  $('end-copy').textContent = t(state.phase === 'won' ? 'The descent is complete. A different world awaits your next seed.' : 'Your unlocks remain. The next descent is one click away.');
  $('end-stats').innerHTML = `<span><strong>${state.stats.rooms}/${state.totalRooms}</strong>${t('ROOMS')}</span><span><strong>${state.stats.kills}</strong>${t('DEFEATED')}</span><span><strong>${fmtTime(state.stats.elapsed)}</strong>${t('TIME')}</span><span><strong>${state.stats.embers}</strong>${t('EMBERS')}</span>`;
  $('end-unlocks').replaceChildren(...WEAPONS.filter((w) => endUnlocks.includes(w.id)).map((w) => { const p = document.createElement('p'); p.className = 'unlock-note'; p.textContent = t('{name} unlocked — select it on the title screen.', { name: localizeWeapon(w).name }); return p; }));
}
function updateHUD() {
  updateGuide();
  if (!state || mode === 'title') return;
  const p = state.player, wallet = availableEmbers(state), signature = [p.hp, p.maxHp, state.room, state.wave, wallet, state.phase].join(':');
  if (lastHud !== signature) {
    lastHud = signature;
    $('hearts').innerHTML = Array.from({ length: p.maxHp }, (_, i) => `<i class="heart${i >= p.hp ? ' empty' : ''}" aria-hidden="true"></i>`).join('');
    $('hearts').setAttribute('aria-label', t('{hp} of {maxHp} hearts', { hp: p.hp, maxHp: p.maxHp })); $('ember-count').textContent = wallet;
    const node = (room, bossRoom) => `<i class="room-node${room < state.room ? ' past' : room === state.room ? ' current' : ''}${bossRoom ? ' boss' : ''}" aria-hidden="true"></i>`;
    $('room-strip').innerHTML = state.totalRooms === 15 ? Array.from({ length: 5 }, (_, act) => `<span class="act-node">${[1, 2, 3].map(part => node(act * 3 + part, part === 3)).join('')}</span>`).join('') : Array.from({ length: state.totalRooms }, (_, i) => node(i + 1, [4, 8].includes(i + 1))).join('');
    $('room-strip').setAttribute('aria-label', t('Room {room} of {rooms}, wave {wave} of {total}', { room: state.room, rooms: state.totalRooms, wave: state.wave || 1, total: state.waveTotal || 1 }));
    $('objective').textContent = state.phase === 'exit' ? t(state.gates.some(g => g.route === 'rift') ? 'Choose HUNT, REFUGE or the optional RIFT' : 'Walk into a gate · HUNT: more enemies + embers · REFUGE: easier + heal 1') : state.room === 1 && state.time < 6 ? t(matchMedia('(pointer:coarse)').matches ? 'Left stick moves · Right stick aims and fires' : 'Hold mouse to fire · Space to dash · E unleashes nova') : '';
    const rift = state.gates.find(g => g.route === 'rift');
    if (rift && state.phase === 'exit') $('objective').textContent += ` · ${riftDescription(rift.riftRule)}`;
  }
  if (state.phase === 'combat' && state.time >= 6) $('objective').textContent = '';
  if (state.phase === 'combat' && state.riftRule && state.time < bannerUntil) $('objective').textContent = riftDescription(state.riftRule);
  if (state.time >= bannerUntil) $('room-banner').textContent = '';
  const boss = state.enemies.find((e) => e.boss && e.hp > 0);
  document.body.dataset.bossActive = String(!!boss);
  placeBossHud();
  $('boss-hud').hidden = !boss;
  if (boss) {
    const name = fieldGuide().find(entry => entry.id === boss.type)?.name || boss.type;
    $('boss-name').textContent = boss.stage > 1 ? t('{name} · PHASE {stage}', { name, stage: boss.stage }) : name;
    $('boss-fill').style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;
    $('boss-hud').dataset.tell = boss.phase;
    const compact = matchMedia('(max-width:700px),(max-height:500px)').matches;
    const statusKey = boss.phase === 'windup' ? compact ? 'WINDUP' : 'WINDUP · WATCH THE BOSS' : boss.phase === 'recover' ? compact ? 'COUNTER' : 'OPENING · COUNTERATTACK' : ['charge','burst'].includes(boss.phase) ? compact ? 'ATTACK' : 'ATTACK · KEEP MOVING' : compact ? 'BOSS' : 'BOSS ENCOUNTER';
    $('boss-status').textContent = `${boss.stage > 1 && compact ? `${boss.stage} · ` : ''}${t(statusKey)}`;
    $('boss-name').title = $('boss-name').textContent;
  }
  $('dash').dataset.ready = String(p.dashCooldown <= 0); $('dash').querySelector('i').style.height = `${Math.min(100, p.dashCooldown / 1.35 * 100)}%`;
  $('nova').dataset.ready = String(p.novaCharge >= p.novaMax); $('nova').querySelector('i').style.height = `${Math.max(0, 100 - p.novaCharge / p.novaMax * 100)}%`;
  $('dash').setAttribute('aria-label', p.dashCooldown > 0 ? t('Dash recovering, {seconds} seconds', { seconds: p.dashCooldown.toFixed(1) }) : t('Dash ready'));
  $('nova').setAttribute('aria-label', t('Nova {percent} percent charged', { percent: Math.floor(p.novaCharge / p.novaMax * 100) }));
  updateAdventure();
  const build = JSON.stringify(state.relics);
  $('build-menu-toggle').hidden = mode !== 'playing' || Object.keys(state.relics).length === 0;
  $('build-count').textContent = Object.keys(state.relics).length;
  $('build-menu-toggle').setAttribute('aria-label', t('Open {count} relics', { count: Object.keys(state.relics).length }));
  if (build !== lastBuild) {
    lastBuild = build;
    $('build-strip').replaceChildren(...Object.entries(state.relics).map(([id, count]) => {
      const r = localizeRelic(RELICS.find((item) => item.id === id)), button = document.createElement('button');
      button.className = 'build-icon'; button.style.color = r.color; button.title = `${r.name} · ${count}: ${r.description}`; button.setAttribute('aria-label', button.title);
      button.innerHTML = `${icons[id]}<small>${count}</small>`;
      button.addEventListener('click', () => { openMenu('build'); }); return button;
    }));
  }
}
function placeBossHud() {
  const hud = $('boss-hud');
  const shortLandscape = dims.width > 700 && dims.height <= 500;
  const target = shortLandscape ? $('run-hud') : $('combat-ui');
  if (hud.parentElement !== target) {
    if (shortLandscape) target.append(hud);
    else target.insertBefore(hud, $('objective'));
  }
}
function updateGuide() {
  const status = onboarding?.status();
  const visible = !!status?.visible && mode === 'playing' && !paused;
  $('first-run-guide').hidden = !visible;
  if (!visible) return;
  const touch = matchMedia('(pointer:coarse)').matches;
  const signature = `${status.stepId}:${getLanguage()}:${touch}`;
  if (signature !== guideSignature) {
    guideSignature = signature;
    const labels = {
      move: [touch ? 'Drag the left stick' : 'Move with WASD', 'Move a little. Stay clear of enemies.'],
      shoot: [touch ? 'Drag the right stick to fire' : 'Hold the mouse to fire', 'Aim at enemies and keep firing.'],
      dash: [touch ? 'Tap Dash' : 'Press Space to dash', 'Dash grants a brief moment of invulnerability.'],
    };
    $('guide-step').textContent = t('FIRST STEPS · {step}/3', { step: status.index + 1 });
    $('guide-action').textContent = t(labels[status.stepId][0]);
    $('guide-detail').textContent = t(labels[status.stepId][1]);
    $('first-run-guide').querySelectorAll('.guide-progress i').forEach((node, i) => {
      node.dataset.done = String(i < status.index); node.dataset.current = String(i === status.index);
    });
    const copy = $('first-run-guide').querySelector('.guide-copy');
    if (!reducedMotion()) copy.animate([{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 180 });
  }
}
function interactLabel(target) {
  if (!target) return '';
  if (target.kind === 'traveler') return t('Rescue traveler');
  if (target.kind === 'lamp') return t('Light lamp {number}', { number: target.order });
  if (target.kind === 'offering') return t('Offer 10 embers');
  if (target.kind === 'chest') return t('Open hidden chest');
  if (target.kind === 'ghost') return t('Greet the lost spirit');
  return t('Interact');
}
function updateAdventure() {
  const target = mode === 'playing' && !paused ? nearestInteractable(state) : null;
  const focused = mode === 'playing' && !paused ? focusedDiscovery(state) : null;
  const panel = $('discovery-panel');
  panel.hidden = !focused;
  if (focused) {
    const { item, info } = focused;
    const write = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
    if (panel.dataset.tone !== info.tone) panel.dataset.tone = info.tone;
    if (panel.dataset.near !== String(info.near)) panel.dataset.near = String(info.near);
    write('discovery-kicker', t('Optional discovery'));
    write('discovery-title', `${info.marker}  ${info.title}`);
    write('discovery-detail', info.detail);
    write('discovery-hint', item.kind === 'cracked-wall' ? info.action : target?.id === item.id
      ? t(matchMedia('(pointer:coarse)').matches ? 'Tap to interact' : 'Press Q to interact') : t('Move toward the marker'));
  }
  $('interact-button').hidden = !target;
  if (target) {
    const label = discoveryInfo(state, target).action || interactLabel(target);
    if ($('interact-label').textContent !== label) $('interact-label').textContent = label;
    $('interact-button').setAttribute('aria-label', `${label} · Q`);
  }
  const escort = state.adventure?.escort;
  const status = escort ? t('Escort: clear room {room}', { room: escort.dueRoom }) : '';
  if ($('quest-status').textContent !== status) $('quest-status').textContent = status;
}
function useNearby() {
  if (mode !== 'playing' || paused) return;
  const target = nearestInteractable(state); if (!target) return;
  const result = interact(state, target.id);
  if (result.ok) audio.play('relic');
  if (result.message) toast(result.message, 3000);
  else if (!result.ok && result.reason) toast(result.reason, 3000);
  lastHud = ''; updateHUD(); draw();
}
function tick(dt) {
  if (mode !== 'playing' || paused) return;
  const previous = state.phase; step(state, input.read(), dt);
  onboarding?.observe(state);
  for (const event of state.events) {
    if (event.type === 'shot') audio.play('shot');
    else if (event.type === 'dash') audio.play('dash');
    else if (event.type === 'nova') audio.play('relic');
    else if (event.type === 'player-hit') audio.play('hit');
    else if (event.type === 'room-enter') { checkpoint(); roomBanner(); syncSoundscape(); }
    else if (event.type === 'wave-enter' && state.wave > 1) { setBanner('WAVE {wave} / {total}', { wave: state.wave, total: state.waveTotal }, 1.6); announce(t('Wave {wave} of {total}.', { wave: state.wave, total: state.waveTotal })); }
    else if (event.type === 'boss-summon') { setBanner('THE RIFT ANSWERS', {}, 1.6); }
    else if (event.type === 'quest' && event.kind === 'traveler' && event.reason === 'completed') toast('The traveler is safe: 8 embers and one heart.', 3500);
  }
  if (state.phase !== previous) {
    if (state.phase === 'reward') showReward();
    if (state.phase === 'dead' || state.phase === 'won') finish();
  }
}
function frame(now) {
  frameRequest = 0;
  if (!shouldAnimate()) return;
  const delta = Math.min(.07, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!manualTime && !document.hidden) {
    if (mode === 'playing' && !paused) {
      accumulator += delta;
      while (accumulator >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
    } else if (mode === 'title' && !paused && preview) preview.time += delta;
  }
  // Title art needs only 30 paints per second; combat retains its normal cadence.
  if (mode !== 'title' || now - lastTitlePaint >= 1000 / 30) {
    draw(); lastTitlePaint = now; if (mode === 'playing') updateHUD();
  }
  if (shouldAnimate() && !frameRequest) frameRequest = requestAnimationFrame(frame);
}

function controlsMarkup() {
  const controls = [['WASD', 'Move'], ['MOUSE + HOLD CLICK', 'Aim and fire'], ['ARROW KEYS', 'Keyboard aim and fire'], ['SPACE / RIGHT CLICK', 'Dash through danger'], ['E', 'Nova: damage + clear bullets'], ['Q', 'Interact with nearby objects'], ['ESC / P · F · M', 'Pause · fullscreen · audio']];
  return `<div class="controls-grid">${controls.map(([key, description]) => `<span><b>${t(key)}</b>${t(description)}</span>`).join('')}</div><p class="menu-prose">${t('On touchscreens, move with the left stick and aim/fire with the right. Dash and Nova have separate buttons. Enter a glowing gate after choosing your relic.')}</p><p class="menu-prose">${t('Five acts, fifteen rooms. Each act has two battles and a randomly selected boss. Hunt means more enemies and embers; Refuge heals one heart. After a boss, an optional Rift leads through an altered world.')}</p>`;
}
function journalMarkup() {
  const entries = fieldGuide();
  return `<p class="menu-prose">${t('Twenty enemy species and ten bosses across five acts. Each seed changes the encounters. Larvae do not count as a species.')}</p><p class="menu-prose">${t('Side paths are optional. Rescue a traveler and clear the next room; light lamps in order 1, 2, 3; or offer 10 embers for healing and a full nova.')}</p><p class="menu-prose">${t('Look for cracked masonry and watch what changes after three untouched rooms.')}</p>${[false, true].map(boss => `<h3>${t(boss ? 'Bosses' : 'Enemies')}</h3>${entries.filter(e => e.boss === boss).map(e => `<p><strong>${escapeHTML(e.name)}</strong><br>${escapeHTML(e.description)}</p>`).join('')}`).join('')}`;
}
function settingsMarkup() {
  return `<div class="setting-row"><label for="setting-music">${t('Music')}<small>${t('Dark fantasy music · Juhani Junkala')}</small></label><input id="setting-music" type="checkbox" ${data.settings.music ? 'checked' : ''}></div><div class="setting-row"><label for="setting-sfx">${t('Sound effects')}</label><input id="setting-sfx" type="checkbox" ${data.settings.sfx ? 'checked' : ''}></div><div class="setting-row"><label for="setting-motion">${t('Reduce effects')}<small>${t('No camera shake or cosmetic flashes')}${motionQuery.matches ? ` · ${t('system preference active')}` : ''}</small></label><input id="setting-motion" type="checkbox" ${data.settings.reduceMotion ? 'checked' : ''}></div><div class="save-actions"><button id="export-save">${t('Export save')}</button><button id="import-save">${t('Import save')}</button></div><p class="save-status">${escapeHTML(translateMessage(saveMessage || 'Saved in this browser. No account or cloud sync.'))}</p><p class="menu-prose">${t('A continued run restarts at its last room entrance. Export a backup to move your progress to another browser.')}</p>${conflicted ? `<div class="warning-box">${t('Another tab changed this save. This tab has stopped saving.')}<button id="reload-save">${t('Load the latest save')}</button></div>` : ''}<button id="menu-help" class="text-button">${t('Controls & rules')}</button>`;
}
function openMenu(section = 'settings') {
  if (menu.open) return;
  titleBeforeMenu = document.activeElement; paused = true; input.setActive(false); checkpoint(); audio.suspend();
  menuSection = section; renderMenu();
  menu.showModal(); $('close-menu').focus();
  syncMotion(); updateGuide();
}
function renderMenu() {
  const section = menuSection;
  $('menu-title').textContent = t(section === 'help' ? 'Find your rhythm.' : section === 'credits' ? 'Made of good things.' : section === 'build' ? 'Your relics.' : mode === 'title' ? 'Make it yours.' : 'Paused.');
  $('continue').textContent = t(mode === 'title' ? 'Back' : 'Back to the rift'); $('abandon').hidden = mode === 'title' || mode === 'end';
  if (pendingImport) { renderImportConfirmation(); return; }
  if (section === 'help') $('menu-body').innerHTML = controlsMarkup();
  else if (section === 'journal') $('menu-body').innerHTML = journalMarkup();
  else if (section === 'credits') $('menu-body').innerHTML = `<p>${t('Cinder Below · a five-act browser action roguelite by 4c.')}</p><ul class="credits-links"><li>${t('Pixel art and sound effects:')} <a href="https://pixel-boy.itch.io/ninja-adventure-asset-pack" target="_blank" rel="noopener">Ninja Adventure — Pixel-boy &amp; AAA</a>, CC0.</li><li>${t('Music:')} <a href="https://opengameart.org/content/jrpg-pack-3-evil" target="_blank" rel="noopener">Juhani Junkala — JRPG Pack 3: Evil</a> / <a href="https://opengameart.org/content/boss-battle-music" target="_blank" rel="noopener">Epic Boss Battle</a>, CC0.</li><li>${t('Game code and design created for this site. No assets from The Binding of Isaac are used.')}</li></ul><p class="menu-prose">${t('Audio uses original downloaded recordings. Asset source paths, hashes and licenses are preserved with the editable source.')}</p>`;
  else if (section === 'build') $('menu-body').innerHTML = Object.entries(state.relics).map(([id, level]) => { const relic = localizeRelic(RELICS.find((r) => r.id === id)); return `<p><strong style="color:${relic.color}">${escapeHTML(relic.name)} · ${level}</strong><br>${escapeHTML(relic.description)}</p>`; }).join('') || `<p>${t('Your first relic waits after the first chamber.')}</p>`;
  else $('menu-body').innerHTML = settingsMarkup();
  if (section === 'settings' || section === 'help') $('menu-body').insertAdjacentHTML('beforeend', `<button id="menu-journal" class="text-button">${t('Field guide & discoveries')}</button>`);
  if (section === 'journal') $('menu-title').textContent = t('Field guide & discoveries');
  bindMenu();
}
function bindMenu() {
  for (const [id, field] of [['setting-music', 'music'], ['setting-sfx', 'sfx'], ['setting-motion', 'reduceMotion']]) $(id)?.addEventListener('change', async (e) => {
    data.settings[field] = e.target.checked; syncTitle(); draw(); await persist(); if (field !== 'reduceMotion') { await audio.configure(data.settings); if (paused) audio.suspend(); }
  });
  $('export-save')?.addEventListener('click', exportProgress);
  $('import-save')?.addEventListener('click', () => $('import-file').click());
  $('reload-save')?.addEventListener('click', () => {
    const newest = loadSave(); if (!['ready', 'empty'].includes(newest.status)) { toast('The latest save could not be loaded. Export this tab before closing it.'); return; }
    data = newest.data; storageRaw = newest.raw; saveStatus = newest.status; saveMessage = newest.message; conflicted = false; state = null; menu.close(); paused = false; setMode('title'); syncTitle(); void audio.resume(); void audio.configure(data.settings);
  });
  $('menu-help')?.addEventListener('click', () => { menu.close(); openMenu('help'); });
  $('menu-journal')?.addEventListener('click', () => { menuSection = 'journal'; renderMenu(); });
}
function closeMenu() {
  menu.close(); pendingImport = null; paused = false; input.setActive(mode === 'playing'); accumulator = 0;
  if (mode === 'playing' || mode === 'title') void audio.resume();
  if (titleBeforeMenu instanceof HTMLElement && titleBeforeMenu.isConnected) titleBeforeMenu.focus({ preventScroll: true });
  else if (mode === 'playing') canvas.focus({ preventScroll: true });
  onboarding?.observe(state, { paused: true }); syncMotion(); updateGuide(); draw();
}
function toTitle() { if (state && !['won', 'dead'].includes(state.phase)) checkpoint(); menu.close(); pendingImport = null; paused = false; state = null; setMode('title'); void audio.resume(); syncTitle(); $(data.checkpoint ? 'resume-run' : 'play').focus(); }
function pauseForConflict() { if (!menu.open) openMenu(); else { menuSection = 'settings'; renderMenu(); } toast('Another tab updated your save. Load its latest version or export this one.'); }
function exportProgress() {
  if (state && !['dead', 'won'].includes(state.phase)) { bankProgress(); data.checkpoint = snapshot(state); }
  const blob = new Blob([exportSave(data)], { type: 'application/json' }); const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'cinder-below-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Save exported. Keep this file to restore your progress.');
}
async function importFile(e) {
  const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
  if (file.size > 200000) { toast('That file is too large to be a Cinder Below save.'); return; }
  const parsed = parseImport(await file.text()); if (!parsed.data) { toast(parsed.error || 'Invalid save file.'); return; }
  pendingImport = parsed.data;
  const latest = loadSave(); storageRaw = latest.raw;
  renderImportConfirmation();
}
function renderImportConfirmation() {
  $('menu-body').innerHTML = `<div class="warning-box">${t("Replace this browser's Cinder Below progress with the imported save? It contains {rooms} cleared rooms and {wins} escapes. Export the current save first if you want to keep it.", { rooms: pendingImport.stats.rooms, wins: pendingImport.stats.wins })}<button id="confirm-import">${t('Replace with imported save')}</button><button id="cancel-import">${t('Cancel')}</button></div>`;
  $('confirm-import').addEventListener('click', async () => {
    if (!navigator.locks?.request) { toast('Safe local saving is unavailable in this browser. The current progress was kept; export it before closing.'); return; }
    let result;
    try { result = await navigator.locks.request('cinder-below-v1', () => saveSave(pendingImport, undefined, { replace: true, expectedRaw: storageRaw })); }
    catch { toast('The browser refused the save lock. Your current progress was kept.'); return; }
    if (!result.ok) { toast(result.message || 'Could not import safely. The current save was kept.'); return; }
    data = result.data; storageRaw = result.raw; saveStatus = result.status; saveMessage = result.message; conflicted = false; state = null; paused = false; pendingImport = null; menu.close(); setMode('title'); syncTitle(); audioActivated = true; void audio.resume(); void audio.configure(data.settings); toast('Save imported. Your descent is ready.');
  });
  $('cancel-import').addEventListener('click', () => { pendingImport = null; menuSection = 'settings'; renderMenu(); });
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('game').requestFullscreen) await $('game').requestFullscreen();
    else toast('This browser uses the full page instead. Rotate your phone for a wider arena.');
  } catch { toast('Fullscreen is unavailable here. The game still fills this page.'); }
}
async function toggleAudio() {
  if ((!audioActivated || audio.status().blocked) && (data.settings.music || data.settings.sfx) && !paused) { await activateSound(); return; }
  const enabled = !(data.settings.music || data.settings.sfx); data.settings.music = enabled; data.settings.sfx = enabled;
  audioActivated = true; syncTitle(); await audio.configure(data.settings); await persist(); if (paused) audio.suspend();
}
function command(name, arg) {
  if (name === 'pause') { if (menu.open) closeMenu(); else openMenu(); }
  else if (name === 'fullscreen') void fullscreen();
  else if (name === 'audio') void toggleAudio();
  else if (name === 'choice') selectRelic(arg);
  else if (name === 'enter' && mode === 'title') begin(!!data.checkpoint);
  else if (name === 'enter' && mode === 'end') begin();
  else if (name === 'interact') useNearby();
}

function refreshLanguage() {
  document.documentElement.lang = getLanguage();
  applyTranslations(document);
  for (const id of ['language-toggle', 'menu-language-toggle']) {
    $(id).textContent = getLanguage() === 'zh-CN' ? 'EN' : '中文';
    const label = getLanguage() === 'zh-CN' ? t('Switch to English') : 'Switch to Chinese';
    $(id).setAttribute('aria-label', label);
    $(id).title = label;
  }
  $('fullscreen').setAttribute('aria-label', t(document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
  syncTitle(); lastHud = ''; lastBuild = ''; updateHUD();
  if (state && bannerText && state.time < bannerUntil) $('room-banner').textContent = translatedBanner();
  if (mode === 'reward') renderRewards();
  if (mode === 'end') renderEnd();
  if (menu.open) renderMenu();
  if (!$('toast').hidden && currentToast) $('toast').textContent = currentToast();
  $('announcer').textContent = '';
  draw();
}
function toggleLanguage() {
  // Changing presentation must not checkpoint, re-bank a reward or restart a run.
  const focusId = document.activeElement?.id;
  setLanguage(getLanguage() === 'zh-CN' ? 'en' : 'zh-CN');
  input.clear(); refreshLanguage();
  if (focusId && $(focusId)) $(focusId).focus({ preventScroll: true });
}
$('language-toggle').addEventListener('click', toggleLanguage);
$('menu-language-toggle').addEventListener('click', toggleLanguage);

$('play').addEventListener('click', () => begin()); $('resume-run').addEventListener('click', () => begin(true)); $('retry').addEventListener('click', () => begin());
$('back-title').addEventListener('click', toTitle); $('abandon').addEventListener('click', toTitle);
$('pause-button').addEventListener('click', () => openMenu()); $('continue').addEventListener('click', closeMenu); $('close-menu').addEventListener('click', closeMenu);
$('how-to-play').addEventListener('click', () => openMenu('help')); $('credits-button').addEventListener('click', () => openMenu('credits'));
$('title-import').addEventListener('click', () => { openMenu(); $('import-file').click(); });
$('music-start').addEventListener('click', async () => {
  if (audio.status().musicPlaying && data.settings.music) { data.settings.music = false; await audio.configure(data.settings); await persist(); }
  else { data.settings.music = true; await activateSound(); await persist(); }
  syncAudioUI();
});
$('audio-toggle').addEventListener('click', toggleAudio); $('fullscreen').addEventListener('click', fullscreen); $('import-file').addEventListener('change', importFile);
$('interact-button').addEventListener('click', useNearby);
$('build-menu-toggle').addEventListener('click', () => openMenu('build'));
$('dismiss-guide').addEventListener('click', () => { onboarding?.dismiss(); updateGuide(); canvas.focus({ preventScroll: true }); });
menu.addEventListener('cancel', (e) => { e.preventDefault(); closeMenu(); });
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { $('fullscreen').setAttribute('aria-label', t(document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen')); resize(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { input.clear(); audio.suspend(); if (mode === 'playing' && !menu.open) openMenu(); }
  else if (!paused) void audio.resume();
  syncMotion();
});
motionQuery.addEventListener('change', () => { syncMotion(); draw(); });
window.addEventListener('blur', () => { if (mode === 'playing' && !menu.open) openMenu(); });
window.addEventListener('storage', (e) => { if ((e.key === 'cinder-below-v1' || e.key === null) && e.newValue !== storageRaw) { conflicted = true; pauseForConflict(); } });
function accessibleWorld() {
  if (!state) return { phase: 'title' };
  const world = describe(state);
  return { ...world, actName: t(world.actName), coordinates: t(world.coordinates), goal: t(world.goal),
    gates: world.gates.map(gate => ({ ...gate, label: t(gate.label) })),
    choices: world.choices.map(localizeRelic) };
}
window.render_game_to_text = () => JSON.stringify({ ...accessibleWorld(), ui: { mode, paused, ready, language: getLanguage(), menuOpen: menu.open, selectedWeapon, titleAct, storageStatus: saveStatus, lifetime: data.stats, unlockedWeapons: WEAPONS.filter(unlocked).map((w) => w.id), input: input.status(), audio: audio.status(), art: assetStatus, guide: onboarding?.status() || null, motion: { reduced: reducedMotion(), animating: !!frameRequest, drawCount, titleTime: preview?.time || 0 } }, viewport: { ...dims, world: logicalSize() } });
window.advanceTime = async (ms) => {
  manualTime = true; const duration = Math.max(0, Math.min(Number(ms) || 0, 60000)) / 1000;
  syncMotion();
  if (mode === 'title' && !paused && !reducedMotion() && preview) preview.time += duration;
  accumulator += duration;
  while (accumulator + 1e-10 >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
  updateHUD(); draw(); await queue; return window.render_game_to_text();
};
refreshLanguage();
resize(); preview = createRun({ seed: 1748, ...logicalSize() }); setMode('title'); syncTitle();
loadArt().then(() => { ready = true; $('play').disabled = false; syncTitle(); draw(); }).catch((error) => {
  console.error(error); artFailed = true; syncTitle();
});
