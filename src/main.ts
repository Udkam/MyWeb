import Phaser from 'phaser';
import { GameUi, type UiAction, type UiLocale } from './ui';
import { createModel, step, restart, setPaused, setFocused, snapshot, FIXED_MS, WORLD } from './game/model';
import { PlaytestScene } from './scene';
import type { ContextAction } from './game/model';
import { advanceFixedClock, resetFixedClock } from './game/clock';
import './style.css';

const model = createModel();
const held = new Set<UiAction>();
const pressed = new Set<UiAction>();
let locale: UiLocale = localStorage.getItem('cw:language') === 'en' ? 'en' : 'zh';
let muted = localStorage.getItem('cw:muted') === '1';
let mode = 'loading';
let ready = false;
let manualClock = false;
const clock = { accumulator: 0 };
let scene: PlaytestScene;
let effectsEnabled = localStorage.getItem('cw:effects') !== '0';
let displayMode: '640' | '960' = localStorage.getItem('cw:display') === '960' ? '960' : '640';
let contextIntent: ContextAction | undefined;
let deadPresentationMs = 0;
let lastEventId = -1;
let cue = '';
let cueUntil = 0;
const manual = import.meta.env.DEV && new URLSearchParams(location.search).has('manual');
const sounds = new Map<string, HTMLAudioElement>();

function input(action: UiAction, down: boolean) {
  if (down && !held.has(action)) {
    pressed.add(action);
    if (action === 'interact') contextIntent = { ...model.contextAction };
  }
  if (down) held.add(action); else held.delete(action);
}
function clearInput() { held.clear(); pressed.clear(); contextIntent = undefined; }
function consumeInput() {
  const value = {
    move: Number(held.has('right')) - Number(held.has('left')),
    jumpPressed: pressed.has('jump'), attackPressed: pressed.has('attack'),
    guardPressed: pressed.has('guard'), guardHeld: held.has('guard'),
    dodgePressed: pressed.has('dodge'), interactPressed: pressed.has('interact'), contextIntent,
  };
  pressed.clear();
  contextIntent = undefined;
  return value;
}
function start() {
  if (!ready) return;
  (document.activeElement as HTMLElement | null)?.blur();
  mode = 'playing';
  setPaused(model, false);
  resetFixedClock(clock);
  clearInput();
  unlockSound();
  updateUi();
}
function reset() {
  (document.activeElement as HTMLElement | null)?.blur();
  restart(model);
  stopSounds();
  deadPresentationMs = 0;
  clearInput();
  resetFixedClock(clock);
  lastEventId = -1;
  cue = '';
  mode = 'playing';
  unlockSound();
  updateUi();
}
function pause() {
  if (!ready || mode === 'dead' || mode === 'title' || mode === 'complete') return;
  mode = mode === 'paused' ? 'playing' : 'paused';
  if (mode === 'playing') (document.activeElement as HTMLElement | null)?.blur();
  setPaused(model, mode !== 'playing');
  if (mode === 'paused') stopSounds();
  resetFixedClock(clock);
  clearInput();
  updateUi();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    cue = locale === 'zh' ? '当前浏览器未允许全屏；窗口内可完整操作。' : 'Fullscreen unavailable; all controls work in this window.';
    cueUntil = model.time + 2500;
    updateUi();
  }
  resizeStage();
}
const ui = new GameUi({
  action: input, start, restart: reset, pause, fullscreen,
  effects(enabled) { effectsEnabled = enabled; localStorage.setItem('cw:effects', enabled ? '1' : '0'); scene?.presentation(displayMode, effectsEnabled); updateUi(); },
  display(next) { displayMode = next; localStorage.setItem('cw:display', next); scene?.presentation(displayMode, effectsEnabled); resizeStage(); updateUi(); },
  language() { locale = locale === 'zh' ? 'en' : 'zh'; localStorage.setItem('cw:language', locale); updateUi(); },
  mute() { muted = !muted; localStorage.setItem('cw:muted', muted ? '1' : '0'); if (muted) for (const a of sounds.values()) a.pause(); updateUi(); },
});

function unlockSound() {
  // Real licensed samples are created only on the user's start/continue gesture.
  for (const [key, source] of Object.entries({ slash: 'slash', block: 'guard', parry: 'parry', hurt: 'hurt', shove: 'shove', cannonImpact: 'cannon-impact', cannonFire: 'cannon-fire' })) {
    if (!sounds.has(key)) {
      const audio = new Audio(`/assets/audio/${source}.ogg`);
      audio.preload = 'none'; audio.volume = key === 'cannonImpact' ? 0.35 : 0.45;
      sounds.set(key, audio);
    }
  }
}
function playSound(key: string) {
  if (muted) return;
  const a = sounds.get(key);
  if (a) { a.currentTime = 0; void a.play().catch(() => { /* Browser audio state stays user controlled. */ }); }
}
function stopSounds() { for (const audio of sounds.values()) { audio.pause(); audio.currentTime = 0; } }
const cueCopy: Record<string, [string, string]> = {
  parry: ['精准招架 · J 追击 / E 推撞', 'Perfect parry · J pursue / E shove'],
  block: ['挡住了 · 连续格挡会失衡', 'Blocked · Repeated blocks break your guard'],
  guardBreak: ['防御失衡 · 拉开距离', 'Guard broken · Make some space'],
  shove: ['夺势 · 把敌人送入炮线', 'Momentum · Push the foe into the cannon line'],
  hurt: ['受伤 · 读清前摇，留意枪口', 'Hit · Read the windup and watch the muzzle'],
  cannonFire: ['炮火不分敌我', 'Cannon fire hits friend and foe'],
  cannonHit: ['炮弹命中', 'Cannon impact'],
  contextMiss: ['目标已脱离 · 这次互动未生效', 'Target lost · This interaction was cancelled'],
  opportunity: ['破绽已现 · 追击、推撞或脱离', 'Opening · Pursue, shove, or disengage'],
  enemyBrace: ['刀兵架稳 · 换位等他出手', 'Guard raised · Change position and read the next move'],
};
function updateUi() {
  const hero = model.hero;
  if (hero.hp <= 0 && mode === 'playing') { mode = 'dead'; deadPresentationMs = 0; clearInput(); }
  if (model.encounter.status === 'complete' && mode === 'playing') { mode = 'complete'; deadPresentationMs = 0; setPaused(model, true); clearInput(); }
  const context = model.contextAction;
  const nearCannon = context.kind === 'cannon';
  const opportunity = hero.opportunity && hero.opportunity.expiresAt > model.time;
  const pressure = hero.guardPressure;
  const touch = matchMedia('(pointer: coarse)').matches;
  const defaultCue = locale === 'zh'
    ? touch ? '夺高台打断装填，或借侧炮打开通路。' : '先夺高台，或借侧炮打开通路。J 攻击 · K 防御 · E 互动'
    : touch ? 'Take the upper deck, or turn the cannon on the guards.' : 'Take the upper deck or use the cannon. J cut · K guard · E interact';
  let currentCue = cue && model.time < cueUntil ? cue : defaultCue;
  if (opportunity) currentCue = context.kind === 'shove'
    ? locale === 'zh' ? touch ? '「攻」追击 ·「推撞」夺位置 · 也可脱离' : 'J 追击 · E 推撞夺位置 · 也可脱离' : touch ? 'Cut to pursue · Shove for space · Or disengage' : 'J pursue · E shove for space · Or disengage'
    : locale === 'zh' ? '破绽尚在 · 靠近目标追击，或脱离' : 'Opening remains · Close in to pursue, or disengage';
  if (model.encounter.status === 'exitReady') currentCue = locale === 'zh' ? '通路已清 · 前往右侧出口' : 'The way is clear · Reach the exit on the right';
  if (touch) currentCue = currentCue.replaceAll('按 K', '轻点「防」').replaceAll('+ J', '+「攻」');
  ui.update({ hp: hero.hp, maxHp: hero.maxHp, mode, cue: currentCue,
    guardPressure: pressure, momentumReady: Boolean(opportunity), nearCannon, locale, muted,
    contextAction: context.kind, contextTarget: context.targetId, effectsEnabled, displayMode,
    elapsedSeconds: model.time / 1000 });
}

function tick() {
  if (mode !== 'playing') { clearInput(); return; }
  step(model, consumeInput());
  for (const event of model.log) {
    if (event.id <= lastEventId) continue;
    lastEventId = event.id;
    const messages = cueCopy[event.type];
    if (messages) { cue = messages[locale === 'zh' ? 0 : 1]; cueUntil = model.time + 1800; }
    if (event.type === 'parry') playSound('parry');
    else if (event.type === 'block') playSound('block');
    else if (event.type === 'hurt') playSound('hurt');
    else if (event.type === 'shove') playSound('shove');
    else if (event.type === 'cannonFire') playSound('cannonFire');
    else if (event.type === 'cannonHit' || event.type === 'cannonImpact') playSound('cannonImpact');
    else if (event.type === 'attack') playSound('slash');
  }
}

const game = new Phaser.Game({ type: Phaser.WEBGL, parent: ui.host, width: 640, height: 360,
  backgroundColor: '#102a32', pixelArt: true, roundPixels: true, antialias: false,
  render: { pixelArt: true, roundPixels: true, preserveDrawingBuffer: import.meta.env.DEV }, scene: new PlaytestScene(model, {
    resultTime: () => deadPresentationMs,
    ready(value) { scene = value; ready = true; mode = 'title'; setPaused(model, true); scene.presentation(displayMode, effectsEnabled); resizeStage(); updateUi(); },
    update(delta) {
      if (!ready) return;
      if (!manualClock && !manual && mode === 'playing') {
        advanceFixedClock(clock, delta, tick);
      }
      if (!manualClock && !manual && (mode === 'dead' || mode === 'complete') && model.focused && !document.hidden) deadPresentationMs = Math.min(1500, deadPresentationMs + Math.min(delta, 100));
      updateUi();
    },
  }),
  banner: false, audio: { noAudio: true }, scale: { mode: Phaser.Scale.NONE },
});

const keys: Record<string, UiAction> = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyJ: 'attack', KeyK: 'guard', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyE: 'interact' };
const physical = new Map<string, UiAction>();
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && event.target.closest('button,[role=dialog],input,select,textarea')) return;
  if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); pause(); return; }
  if (event.code === 'KeyF' && !event.repeat) { event.preventDefault(); void fullscreen(); return; }
  if (event.code === 'Enter' && mode === 'title') { event.preventDefault(); start(); return; }
  const action = keys[event.code];
  if (action) { event.preventDefault(); if (!event.repeat) { physical.set(event.code, action); input(action, true); } }
});
window.addEventListener('keyup', event => {
  const action = physical.get(event.code); physical.delete(event.code);
  if (action && ![...physical.values()].includes(action)) input(action, false);
});
window.addEventListener('blur', () => { physical.clear(); clearInput(); stopSounds(); resetFixedClock(clock); setFocused(model, false); if (mode === 'playing') { mode = 'paused'; updateUi(); } });
window.addEventListener('focus', () => { setFocused(model, true); resetFixedClock(clock); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { physical.clear(); clearInput(); stopSounds(); if (mode === 'playing') pause(); } });

function resizeStage() {
  const area = ui.element.querySelector<HTMLElement>('.wake-play-area');
  const stage = ui.element.querySelector<HTMLElement>('.wake-stage');
  if (!area || !stage) return;
  const availableW = Math.max(1, area.clientWidth);
  const availableH = Math.max(1, area.clientHeight);
  const dpr = devicePixelRatio || 1;
  // Resolution comparison must keep the same on-screen composition and actor size.
  // Layout follows the 640-unit world; only the canvas sampling density changes.
  const width = 640, height = 360;
  const fitDeviceScale = Math.min(availableW / width, availableH / height) * dpr;
  // Below one device-pixel multiple, preserve the whole 16:9 view with a fractional
  // scale instead of letting flex width and max-height squeeze it independently.
  const deviceScale = fitDeviceScale >= 1 ? Math.floor(fitDeviceScale) : fitDeviceScale;
  const scale = deviceScale / dpr;
  stage.style.width = `${width * scale}px`; stage.style.height = `${height * scale}px`;
  stage.dataset.pixelScale = String(deviceScale);
  stage.dataset.canvasPixelScale = String(deviceScale / (displayMode === '960' ? 1.5 : 1));
}
window.addEventListener('resize', resizeStage);
document.addEventListener('fullscreenchange', resizeStage);
new ResizeObserver(resizeStage).observe(ui.element);

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
    __cw?: { model: typeof model; start: typeof start; restart: typeof reset; input: typeof input; snapshot: () => unknown; frame: () => void };
  }
}
if (import.meta.env.DEV) {
  window.render_game_to_text = () => JSON.stringify({ ...snapshot(model), mode, locale, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, world: WORLD, presentation: { displayMode, effectsEnabled, canvas: { width: game.scale.width, height: game.scale.height } } });
  window.advanceTime = (ms: number) => {
    manualClock = true;
    const count = Math.max(0, Math.round(ms / FIXED_MS));
    for (let i = 0; i < count; i++) tick();
    if (mode === 'dead' || mode === 'complete') deadPresentationMs = Math.min(1500, deadPresentationMs + ms);
    scene?.paint(); updateUi();
  };
  window.__cw = { model, start, restart: reset, input, snapshot: () => snapshot(model), frame: () => { scene?.paint(); updateUi(); } };
}
