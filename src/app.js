import { createRun, step, chooseRelic, setWorldSize, snapshot, restoreRun, describe, RELICS, WEAPONS } from './engine.js';
import { loadArt, render, assetStatus } from './renderer.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, createDefaultSave, saveSave, parseImport, exportSave } from './storage.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false }), menu = $('menu');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const testMode = new URLSearchParams(location.search).get('test') === '1';
const icons = { split: '⋔', ricochet: '↱', pierce: '↟', seeking: '✧', chain: 'ϟ', burn: '♨', cold: '❄', explosive: '✹', blades: '✥', trail: '≋', nova: '✳', blood: '♦' };
const weaponIcons = { cinder: 'ϟ', scatter: '⋔', needle: '↟' };
const initial = loadSave();
let data = initial.data || createDefaultSave(), saveStatus = initial.status, saveMessage = initial.message || '', storageRaw = initial.raw;
let mode = 'title', paused = false, ready = false, selectedWeapon = 'cinder', state, preview;
let manualTime = testMode, accumulator = 0, lastFrame = 0, lastHud = '', lastBuild = '', bannerUntil = 0, toastTimer;
let queue = Promise.resolve(), conflicted = false, titleBeforeMenu = null, pendingImport = null;
const dims = { width: 0, height: 0, dpr: 1 };
const audio = createAudio(() => toast('Audio could not start. You can keep playing and retry with the music button.'));
const input = createInput(canvas, () => state || preview, command);
const currentWorld = () => state || preview;

function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function unlocked(w) { return data.stats.rooms >= w.unlockRooms; }
function fmtTime(seconds) { const whole = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; }
function toast(message, duration = 5000) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, duration); }
function announce(message) { $('announcer').textContent = message; }
function logicalSize() {
  const ratio = dims.width / Math.max(1, dims.height);
  return ratio < 1 ? { width: Math.max(380, 1000 * ratio), height: 1000 } : { width: 1100, height: Math.max(560, 1100 / ratio) };
}
function resize() {
  const rect = canvas.getBoundingClientRect(); dims.width = rect.width; dims.height = rect.height; dims.dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(dims.width * dims.dpr); canvas.height = Math.round(dims.height * dims.dpr);
  const size = logicalSize();
  if (state) setWorldSize(state, size.width, size.height);
  if (preview) setWorldSize(preview, size.width, size.height);
  input.clear(); draw();
}
function setMode(next) {
  mode = next; document.body.dataset.mode = next;
  $('title-screen').hidden = next !== 'title'; $('combat-ui').hidden = next !== 'playing';
  $('run-hud').hidden = next === 'title'; $('reward-screen').hidden = next !== 'reward'; $('end-screen').hidden = next !== 'end';
  input.setActive(next === 'playing' && !paused); accumulator = 0; lastHud = ''; updateHUD(); draw();
}
function draw() {
  if (!ready || !currentWorld()) return;
  ctx.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
  render(ctx, mode === 'title' ? preview : state, { ...dims, reduceMotion: motionQuery.matches || data.settings.reduceMotion, title: mode === 'title' });
}
function syncTitle() {
  if (!WEAPONS.some((w) => w.id === selectedWeapon && unlocked(w))) selectedWeapon = 'cinder';
  $('weapon-options').replaceChildren(...WEAPONS.map((w) => {
    const button = document.createElement('button'); button.className = 'weapon-choice'; button.type = 'button';
    button.setAttribute('aria-pressed', String(selectedWeapon === w.id)); button.setAttribute('aria-disabled', String(!unlocked(w)));
    button.title = `${w.description}${unlocked(w) ? '' : ` Clear ${w.unlockRooms} total rooms to unlock.`}`;
    button.innerHTML = `<span class="weapon-icon" aria-hidden="true">${weaponIcons[w.id]}</span><span>${escapeHTML(w.name)}${unlocked(w) ? '' : `<small>${data.stats.rooms}/${w.unlockRooms} ROOMS</small>`}</span>`;
    button.addEventListener('click', () => { if (!unlocked(w)) { toast(`${w.name}: clear ${w.unlockRooms} rooms across any number of runs to unlock.`); return; } selectedWeapon = w.id; syncTitle(); });
    return button;
  }));
  $('unlocks-caption').textContent = `${WEAPONS.filter(unlocked).length} / ${WEAPONS.length}`;
  $('title-stats').innerHTML = `<span><strong>${data.stats.bestRoom || '—'}</strong>DEEPEST ROOM</span><span><strong>${data.stats.rooms}</strong>ROOMS CLEARED</span><span><strong>${data.stats.wins}</strong>ESCAPES</span>`;
  $('resume-run').hidden = !data.checkpoint || !ready;
  if (data.checkpoint) $('resume-run').innerHTML = `Continue · room ${data.checkpoint.room} <span>↗</span>`;
  const localReady = ['ready', 'empty', 'saved'].includes(saveStatus);
  $('load-message').textContent = !ready ? 'Loading the dungeon.' : localReady ? 'Progress stays in this browser. A descent resumes at its last room entrance.' : `${saveMessage || 'Progress is currently in memory only.'} Open settings to export a backup.`;
  $('audio-toggle').dataset.active = String(data.settings.music || data.settings.sfx);
  $('audio-toggle').setAttribute('aria-label', data.settings.music || data.settings.sfx ? 'Mute audio' : 'Enable audio');
}

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
  menu.close(); paused = false; input.clear();
  if (resume) {
    state = restoreRun(data.checkpoint);
    if (!state) { toast('This checkpoint could not be read. Your lifetime progress is safe. Start a new descent.'); data.checkpoint = null; syncTitle(); return; }
    const size = logicalSize(); setWorldSize(state, size.width, size.height);
  } else {
    state = createRun({ seed: newSeed(), ...logicalSize(), weapon: selectedWeapon });
    data.stats.runs++; data.banked = { rooms: 0, kills: 0, embers: 0 };
  }
  lastBuild = ''; setMode('playing'); canvas.focus({ preventScroll: true });
  roomBanner(); checkpoint(); void audio.configure(data.settings); announce(`Room ${state.room}. Move, aim and shoot. Space to dash.`);
}
function roomBanner() {
  $('room-banner').textContent = state.room === 8 ? 'THE CINDER WARDEN' : state.room === 4 ? 'THE GATEKEEPER' : `${state.room < 5 ? 'THE HOLLOW' : 'THE CINDER VAULT'} · ${String(state.room).padStart(2, '0')}`;
  bannerUntil = state.time + 2.5;
}
function showReward() {
  checkpoint(); setMode('reward'); audio.play('relic');
  $('relic-choices').replaceChildren(...state.choices.map((id, index) => {
    const relic = RELICS.find((r) => r.id === id), level = (state.relics[id] || 0) + 1;
    const button = document.createElement('button'); button.className = 'relic-card'; button.style.setProperty('--card-color', relic.color);
    button.innerHTML = `<span class="relic-key">${index + 1}</span><span class="relic-icon" aria-hidden="true">${icons[id] || '✦'}</span><span class="relic-tag">${escapeHTML(relic.tag)}</span><strong class="relic-name">${escapeHTML(relic.name)}</strong><span class="relic-desc">${escapeHTML(relic.description)}</span><span class="relic-level">${level === 1 ? 'NEW RELIC' : `LEVEL ${level}`}</span>`;
    button.addEventListener('click', () => selectRelic(index)); return button;
  }));
  $('relic-choices').querySelector('button')?.focus({ preventScroll: true }); announce('Room cleared. Choose one of three relics.');
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
  $('end-label').textContent = state.phase === 'won' ? 'THE VAULT IS BROKEN' : `FALLEN IN CHAMBER ${String(state.room).padStart(2, '0')}`;
  $('end-title').textContent = state.phase === 'won' ? 'You brought the dawn.' : 'The flame returns.';
  $('end-copy').textContent = state.phase === 'won' ? 'Eight chambers behind you. A different build awaits below.' : 'Your unlocks remain. The next descent is one click away.';
  $('end-stats').innerHTML = `<span><strong>${state.stats.rooms}/8</strong>ROOMS</span><span><strong>${state.stats.kills}</strong>DEFEATED</span><span><strong>${fmtTime(state.stats.elapsed)}</strong>TIME</span><span><strong>${state.stats.embers}</strong>EMBERS</span>`;
  $('end-unlocks').replaceChildren(...WEAPONS.filter((w) => unlocked(w) && !before.includes(w.id)).map((w) => { const p = document.createElement('p'); p.className = 'unlock-note'; p.textContent = `${w.name} unlocked — select it on the title screen.`; return p; }));
  $('retry').focus({ preventScroll: true }); announce(`${state.phase === 'won' ? 'Victory' : 'Defeated'}. ${state.stats.rooms} rooms cleared.`);
}
function updateHUD() {
  if (!state || mode === 'title') return;
  const p = state.player, signature = [p.hp, p.maxHp, state.room, state.wave, state.stats.embers, state.phase].join(':');
  if (lastHud !== signature) {
    lastHud = signature;
    $('hearts').innerHTML = Array.from({ length: p.maxHp }, (_, i) => `<i class="heart${i >= p.hp ? ' empty' : ''}" aria-hidden="true"></i>`).join('');
    $('hearts').setAttribute('aria-label', `${p.hp} of ${p.maxHp} hearts`); $('ember-count').textContent = state.stats.embers;
    $('room-strip').innerHTML = Array.from({ length: 8 }, (_, i) => `<i class="room-node${i + 1 < state.room ? ' past' : i + 1 === state.room ? ' current' : ''}${[3, 7].includes(i) ? ' boss' : ''}" aria-hidden="true"></i>`).join('');
    $('room-strip').setAttribute('aria-label', `Room ${state.room} of 8, wave ${state.wave || 1} of ${state.waveTotal || 1}`);
    $('objective').textContent = state.phase === 'exit' ? 'Walk into a gate · HUNT: more enemies + embers · REFUGE: easier + heal 1' : state.room === 1 && state.time < 6 ? (matchMedia('(pointer:coarse)').matches ? 'Left stick moves · Right stick aims and fires' : 'Hold mouse to fire · Space to dash · E unleashes nova') : '';
  }
  if (state.phase === 'combat' && state.time >= 6) $('objective').textContent = '';
  if (state.time >= bannerUntil) $('room-banner').textContent = '';
  const boss = state.enemies.find((e) => ['sentinel', 'warden'].includes(e.type) && e.hp > 0);
  $('boss-hud').hidden = !boss;
  if (boss) { $('boss-name').textContent = boss.type === 'sentinel' ? 'THE GATEKEEPER' : `CINDER WARDEN${boss.stage > 1 ? ' · ENRAGED' : ''}`; $('boss-fill').style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`; }
  $('dash').dataset.ready = String(p.dashCooldown <= 0); $('dash').querySelector('i').style.height = `${Math.min(100, p.dashCooldown / 1.35 * 100)}%`;
  $('nova').dataset.ready = String(p.novaCharge >= p.novaMax); $('nova').querySelector('i').style.height = `${Math.max(0, 100 - p.novaCharge / p.novaMax * 100)}%`;
  $('dash').setAttribute('aria-label', p.dashCooldown > 0 ? `Dash recovering, ${p.dashCooldown.toFixed(1)} seconds` : 'Dash ready');
  $('nova').setAttribute('aria-label', `Nova ${Math.floor(p.novaCharge / p.novaMax * 100)} percent charged`);
  const build = JSON.stringify(state.relics);
  if (build !== lastBuild) {
    lastBuild = build;
    $('build-strip').replaceChildren(...Object.entries(state.relics).map(([id, count]) => {
      const r = RELICS.find((item) => item.id === id), button = document.createElement('button');
      button.className = 'build-icon'; button.style.color = r.color; button.title = `${r.name} · ${count}: ${r.description}`; button.setAttribute('aria-label', button.title);
      button.innerHTML = `${icons[id]}<small>${count}</small>`;
      button.addEventListener('click', () => { openMenu('build'); }); return button;
    }));
  }
}
function tick(dt) {
  if (mode !== 'playing' || paused) return;
  const previous = state.phase; step(state, input.read(), dt);
  for (const event of state.events) {
    if (event.type === 'shot') audio.play('shot');
    else if (event.type === 'dash') audio.play('dash');
    else if (event.type === 'nova') audio.play('relic');
    else if (event.type === 'player-hit') audio.play('hit');
    else if (event.type === 'room-enter') { checkpoint(); roomBanner(); }
    else if (event.type === 'wave-enter' && state.wave > 1) { $('room-banner').textContent = `WAVE ${state.wave} / ${state.waveTotal}`; bannerUntil = state.time + 1.6; announce(`Wave ${state.wave} of ${state.waveTotal}.`); }
    else if (event.type === 'boss-summon') { $('room-banner').textContent = 'THE RIFT ANSWERS'; bannerUntil = state.time + 1.6; }
  }
  if (state.phase !== previous) {
    if (state.phase === 'reward') showReward();
    if (state.phase === 'dead' || state.phase === 'won') finish();
  }
}
function frame(now) {
  const delta = Math.min(.07, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!manualTime && !document.hidden) {
    if (mode === 'playing' && !paused) {
      accumulator += delta;
      while (accumulator >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
    } else if (mode === 'title' && !paused && preview) preview.time += delta;
  }
  if (!document.hidden) { draw(); if (mode === 'playing') updateHUD(); }
  requestAnimationFrame(frame);
}

function controlsMarkup() {
  return `<div class="controls-grid"><span><b>WASD</b>Move</span><span><b>MOUSE + HOLD CLICK</b>Aim and fire</span><span><b>ARROW KEYS</b>Keyboard aim and fire</span><span><b>SPACE / RIGHT CLICK</b>Dash through danger</span><span><b>E</b>Nova: damage + clear bullets</span><span><b>ESC / P · F · M</b>Pause · fullscreen · audio</span></div><p class="menu-prose">On touchscreens, move with the left stick and aim/fire with the right. Dash and Nova have separate buttons. Enter either glowing gate after choosing your relic.</p><p class="menu-prose">Hunt adds enemies and extra embers. Refuge has fewer enemies and restores one heart on entry. Every fourth room is a boss. Clear eight rooms to escape.</p>`;
}
function settingsMarkup() {
  return `<div class="setting-row"><label for="setting-music">Music<small>Original Ninja Adventure soundtrack</small></label><input id="setting-music" type="checkbox" ${data.settings.music ? 'checked' : ''}></div><div class="setting-row"><label for="setting-sfx">Sound effects</label><input id="setting-sfx" type="checkbox" ${data.settings.sfx ? 'checked' : ''}></div><div class="setting-row"><label for="setting-motion">Reduce effects<small>No camera shake or cosmetic flashes${motionQuery.matches ? ' · system preference active' : ''}</small></label><input id="setting-motion" type="checkbox" ${data.settings.reduceMotion ? 'checked' : ''}></div><div class="save-actions"><button id="export-save">Export save</button><button id="import-save">Import save</button></div><p class="save-status">${escapeHTML(saveMessage || 'Saved in this browser. No account or cloud sync.')}</p><p class="menu-prose">A continued run restarts at its last room entrance. Export a backup to move your progress to another browser.</p>${conflicted ? '<div class="warning-box">Another tab changed this save. This tab has stopped saving.<button id="reload-save">Load the latest save</button></div>' : ''}<button id="menu-help" class="text-button">Controls &amp; rules</button>`;
}
function openMenu(section = 'settings') {
  if (menu.open) return;
  titleBeforeMenu = document.activeElement; paused = true; input.setActive(false); checkpoint(); audio.suspend();
  $('menu-title').textContent = section === 'help' ? 'Find your rhythm.' : section === 'credits' ? 'Made of good things.' : section === 'build' ? 'Your relics.' : mode === 'title' ? 'Make it yours.' : 'Paused.';
  if (section === 'help') $('menu-body').innerHTML = controlsMarkup();
  else if (section === 'credits') $('menu-body').innerHTML = `<p>Cinder Below · an eight-room browser action roguelite by 4c.</p><ul class="credits-links"><li>Pixel art, soundtrack and sound effects: <a href="https://pixel-boy.itch.io/ninja-adventure-asset-pack" target="_blank" rel="noopener">Ninja Adventure — Pixel-boy &amp; AAA</a>, CC0.</li><li>Game code and design created for this site. No assets from The Binding of Isaac are used.</li></ul><p class="menu-prose">Audio uses original downloaded recordings. Asset source paths, hashes and licenses are preserved with the editable source.</p>`;
  else if (section === 'build') $('menu-body').innerHTML = Object.entries(state.relics).map(([id, level]) => { const relic = RELICS.find((r) => r.id === id); return `<p><strong style="color:${relic.color}">${escapeHTML(relic.name)} · ${level}</strong><br>${escapeHTML(relic.description)}</p>`; }).join('') || '<p>Your first relic waits after the first chamber.</p>';
  else $('menu-body').innerHTML = settingsMarkup();
  $('continue').textContent = mode === 'title' ? 'Back' : 'Back to the rift'; $('abandon').hidden = mode === 'title' || mode === 'end';
  menu.showModal(); $('close-menu').focus(); bindMenu();
}
function bindMenu() {
  for (const [id, field] of [['setting-music', 'music'], ['setting-sfx', 'sfx'], ['setting-motion', 'reduceMotion']]) $(id)?.addEventListener('change', async (e) => {
    data.settings[field] = e.target.checked; syncTitle(); await persist(); if (field !== 'reduceMotion') { await audio.configure(data.settings); if (paused) audio.suspend(); }
  });
  $('export-save')?.addEventListener('click', exportProgress);
  $('import-save')?.addEventListener('click', () => $('import-file').click());
  $('reload-save')?.addEventListener('click', () => {
    const newest = loadSave(); if (!['ready', 'empty'].includes(newest.status)) { toast('The latest save could not be loaded. Export this tab before closing it.'); return; }
    data = newest.data; storageRaw = newest.raw; saveStatus = newest.status; saveMessage = newest.message; conflicted = false; state = null; menu.close(); paused = false; setMode('title'); syncTitle();
  });
  $('menu-help')?.addEventListener('click', () => { menu.close(); openMenu('help'); });
}
function closeMenu() {
  menu.close(); paused = false; input.setActive(mode === 'playing'); accumulator = 0;
  if (mode === 'playing' || mode === 'title') void audio.resume();
  if (titleBeforeMenu instanceof HTMLElement && titleBeforeMenu.isConnected) titleBeforeMenu.focus({ preventScroll: true });
  else if (mode === 'playing') canvas.focus({ preventScroll: true });
}
function toTitle() { if (state && !['won', 'dead'].includes(state.phase)) checkpoint(); menu.close(); paused = false; state = null; setMode('title'); syncTitle(); $('play').focus(); }
function pauseForConflict() { if (!menu.open) openMenu(); else { $('menu-body').innerHTML = settingsMarkup(); bindMenu(); } toast('Another tab updated your save. Load its latest version or export this one.'); }
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
  $('menu-body').innerHTML = `<div class="warning-box">Replace this browser's Cinder Below progress with the imported save? It contains ${pendingImport.stats.rooms} cleared rooms and ${pendingImport.stats.wins} escapes. Export the current save first if you want to keep it.<button id="confirm-import">Replace with imported save</button><button id="cancel-import">Cancel</button></div>`;
  $('confirm-import').addEventListener('click', async () => {
    if (!navigator.locks?.request) { toast('Safe local saving is unavailable in this browser. The current progress was kept; export it before closing.'); return; }
    let result;
    try { result = await navigator.locks.request('cinder-below-v1', () => saveSave(pendingImport, undefined, { replace: true, expectedRaw: storageRaw })); }
    catch { toast('The browser refused the save lock. Your current progress was kept.'); return; }
    if (!result.ok) { toast(result.message || 'Could not import safely. The current save was kept.'); return; }
    data = result.data; storageRaw = result.raw; saveStatus = result.status; saveMessage = result.message; conflicted = false; state = null; paused = false; pendingImport = null; menu.close(); setMode('title'); syncTitle(); toast('Save imported. Your descent is ready.');
  });
  $('cancel-import').addEventListener('click', () => { pendingImport = null; $('menu-body').innerHTML = settingsMarkup(); bindMenu(); });
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('game').requestFullscreen) await $('game').requestFullscreen();
    else toast('This browser uses the full page instead. Rotate your phone for a wider arena.');
  } catch { toast('Fullscreen is unavailable here. The game still fills this page.'); }
}
async function toggleAudio() { const enabled = !(data.settings.music || data.settings.sfx); data.settings.music = enabled; data.settings.sfx = enabled; syncTitle(); await audio.configure(data.settings); await persist(); if (paused) audio.suspend(); }
function command(name, arg) {
  if (name === 'pause') { if (menu.open) closeMenu(); else openMenu(); }
  else if (name === 'fullscreen') void fullscreen();
  else if (name === 'audio') void toggleAudio();
  else if (name === 'choice') selectRelic(arg);
  else if (name === 'enter' && mode === 'title') begin();
  else if (name === 'enter' && mode === 'end') begin();
}
$('play').addEventListener('click', () => begin()); $('resume-run').addEventListener('click', () => begin(true)); $('retry').addEventListener('click', () => begin());
$('back-title').addEventListener('click', toTitle); $('abandon').addEventListener('click', toTitle);
$('pause-button').addEventListener('click', () => openMenu()); $('continue').addEventListener('click', closeMenu); $('close-menu').addEventListener('click', closeMenu);
$('how-to-play').addEventListener('click', () => openMenu('help')); $('credits-button').addEventListener('click', () => openMenu('credits'));
$('audio-toggle').addEventListener('click', toggleAudio); $('fullscreen').addEventListener('click', fullscreen); $('import-file').addEventListener('change', importFile);
menu.addEventListener('cancel', (e) => { e.preventDefault(); closeMenu(); });
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'); resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clear(); audio.suspend(); if (mode === 'playing' && !menu.open) openMenu(); } });
window.addEventListener('blur', () => { if (mode === 'playing' && !menu.open) openMenu(); });
window.addEventListener('storage', (e) => { if ((e.key === 'cinder-below-v1' || e.key === null) && e.newValue !== storageRaw) { conflicted = true; pauseForConflict(); } });
window.render_game_to_text = () => JSON.stringify({ ...(state ? describe(state) : { phase: 'title' }), ui: { mode, paused, ready, menuOpen: menu.open, selectedWeapon, storageStatus: saveStatus, lifetime: data.stats, unlockedWeapons: WEAPONS.filter(unlocked).map((w) => w.id), input: input.status(), audio: audio.status(), art: assetStatus }, viewport: { ...dims, world: logicalSize() } });
window.advanceTime = async (ms) => {
  manualTime = true; const duration = Math.max(0, Math.min(Number(ms) || 0, 60000)) / 1000;
  accumulator += duration;
  while (accumulator + 1e-10 >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
  updateHUD(); draw(); await queue; return window.render_game_to_text();
};
resize(); preview = createRun({ seed: 1748, ...logicalSize() }); setMode('title'); syncTitle(); requestAnimationFrame(frame);
loadArt().then(() => { ready = true; $('play').disabled = false; $('play').innerHTML = '<span>Enter the rift</span><span aria-hidden="true">↗</span>'; syncTitle(); draw(); }).catch((error) => {
  console.error(error); $('load-message').textContent = 'Some artwork could not load. Reload this page to retry.';
});
