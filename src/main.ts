import Phaser from 'phaser';
import { GameUi, type UiAction, type UiLocale } from './ui';
import { createModel, step, restart, setPaused, setFocused, snapshot, FIXED_MS, WORLD, PLATFORMS } from './game/model';
import './style.css';

const model = createModel();
const held = new Set<UiAction>();
const pressed = new Set<UiAction>();
let locale: UiLocale = localStorage.getItem('cw:language') === 'en' ? 'en' : 'zh';
let muted = localStorage.getItem('cw:muted') === '1';
let mode = 'loading';
let ready = false;
let manualClock = false;
let accumulator = 0;
let scene: WakeScene;
let lastEventId = -1;
let cue = '';
let cueUntil = 0;
const manual = import.meta.env.DEV && new URLSearchParams(location.search).has('manual');
const sounds = new Map<string, HTMLAudioElement>();

function input(action: UiAction, down: boolean) {
  if (down && !held.has(action)) pressed.add(action);
  if (down) held.add(action); else held.delete(action);
}
function clearInput() { held.clear(); pressed.clear(); }
function consumeInput() {
  const value = {
    move: Number(held.has('right')) - Number(held.has('left')),
    jumpPressed: pressed.has('jump'), attackPressed: pressed.has('attack'),
    guardPressed: pressed.has('guard'), guardHeld: held.has('guard'),
    dodgePressed: pressed.has('dodge'), interactPressed: pressed.has('interact'),
  };
  pressed.clear();
  return value;
}
function start() {
  if (!ready) return;
  mode = 'playing';
  setPaused(model, false);
  accumulator = 0;
  clearInput();
  unlockSound();
  updateUi();
}
function reset() {
  restart(model);
  clearInput();
  accumulator = 0;
  lastEventId = -1;
  cue = '';
  mode = 'playing';
  unlockSound();
  updateUi();
}
function pause() {
  if (!ready || mode === 'dead' || mode === 'title') return;
  mode = mode === 'paused' ? 'playing' : 'paused';
  setPaused(model, mode !== 'playing');
  accumulator = 0;
  clearInput();
  updateUi();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { cue = locale === 'zh' ? '当前浏览器未允许全屏；窗口内可完整操作。' : 'Fullscreen unavailable; all controls work in this window.'; }
  resizeStage();
}
const ui = new GameUi({
  action: input, start, restart: reset, pause, fullscreen,
  language() { locale = locale === 'zh' ? 'en' : 'zh'; localStorage.setItem('cw:language', locale); updateUi(); },
  mute() { muted = !muted; localStorage.setItem('cw:muted', muted ? '1' : '0'); if (muted) for (const a of sounds.values()) a.pause(); updateUi(); },
});

function unlockSound() {
  // Real licensed samples are created only on the user's start/continue gesture.
  for (const [key, source] of Object.entries({ slash: 'slash', block: 'guard', parry: 'parry', hurt: 'hurt', shove: 'shove', cannonImpact: 'cannon-impact' })) {
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
const cueCopy: Record<string, [string, string]> = {
  parry: ['精准招架 · 朝敌人 + J 夺势', 'Perfect parry · Toward foe + J to shove'],
  block: ['挡住了 · 连续格挡会失衡', 'Blocked · Repeated blocks break your guard'],
  guardBreak: ['防御失衡 · 拉开距离', 'Guard broken · Make some space'],
  shove: ['夺势 · 把敌人送入炮线', 'Momentum · Push the foe into the cannon line'],
  hurt: ['受伤 · 读清前摇，留意枪口', 'Hit · Read the windup and watch the muzzle'],
  cannonFire: ['炮火不分敌我', 'Cannon fire hits friend and foe'],
  cannonHit: ['炮弹命中', 'Cannon impact'],
};
function updateUi() {
  const hero = model.hero;
  if (hero.hp <= 0 && mode === 'playing') mode = 'dead';
  const nearCannon = Math.abs(hero.x - model.cannon.x) < 70 && Math.abs(hero.y - model.cannon.y) < 50;
  const parry = hero.parryTarget && hero.parryTarget.expiresAt > model.time;
  const pressure = hero.blockTimes.length;
  const touch = matchMedia('(pointer: coarse)').matches;
  const defaultCue = locale === 'zh'
    ? touch ? '看清抬刀，轻点「防」。' : '看清抬刀，按 K 招架。'
    : touch ? 'Read the windup. Tap Guard.' : 'Read the windup. K to parry.';
  let currentCue = cue && model.time < cueUntil ? cue : defaultCue;
  if (parry) currentCue = locale === 'zh' ? touch ? '朝敌人移动 +「攻」：夺势' : '朝敌人 + J：夺势；原地 J：追击' : touch ? 'Toward foe + Cut: shove' : 'Toward foe + J: shove; J: follow-up';
  if (touch) currentCue = currentCue.replaceAll('按 K', '轻点「防」').replaceAll('+ J', '+「攻」');
  ui.update({ hp: hero.hp, maxHp: hero.maxHp, mode, cue: currentCue,
    guardPressure: pressure, momentumReady: Boolean(parry), nearCannon, locale, muted });
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
    else if (event.type === 'cannonHit' || event.type === 'cannonImpact') playSound('cannonImpact');
    else if (event.type === 'attack') playSound('slash');
  }
}

class WakeScene extends Phaser.Scene {
  private heroSprite!: Phaser.GameObjects.Sprite;
  private enemies = new Map<string, Phaser.GameObjects.Sprite>();
  private cannonSprite!: Phaser.GameObjects.Image;
  private effects!: Phaser.GameObjects.Graphics;
  private projectileSprites = new Map<number | string, Phaser.GameObjects.Arc>();
  constructor() { super('harbor-art-study'); }
  preload() {
    this.load.image('harbor', '/assets/environment/harbor.png');
    for (const name of ['cannon-idle', 'cannon-fire', 'cannon-recover', 'crate', 'barrel', 'platform']) this.load.image(name, `/assets/environment/${name}.png`);
    this.load.spritesheet('hero', '/assets/actors/hero.png', { frameWidth: 96, frameHeight: 80 });
    this.load.spritesheet('enemies', '/assets/actors/enemies.png', { frameWidth: 96, frameHeight: 80 });
  }
  create() {
    scene = this;
    this.cameras.main.roundPixels = true;
    this.add.image(0, 0, 'harbor').setOrigin(0).setDepth(0);
    this.add.image(160, 231, 'crate').setOrigin(0).setDepth(3);
    this.add.image(430, 207, 'platform').setOrigin(0).setDepth(3);
    this.add.image(40, 255, 'barrel').setOrigin(0.5, 1).setDepth(3);
    this.cannonSprite = this.add.image(model.cannon.x, model.cannon.y, 'cannon-idle').setOrigin(0.5, 1).setDepth(5);
    this.heroSprite = this.add.sprite(model.hero.x, model.hero.y, 'hero', 0).setOrigin(36 / 96, 68 / 80).setDepth(10);
    for (const e of model.enemies) this.enemies.set(e.id, this.add.sprite(e.x, e.y, 'enemies', e.frameIndex).setOrigin(36 / 96, 68 / 80).setDepth(9));
    this.effects = this.add.graphics().setDepth(20);
    ready = true;
    mode = 'title';
    setPaused(model, true);
    resizeStage();
    updateUi();
    this.paint();
  }
  update(_time: number, delta: number) {
    if (!ready) return;
    if (!manualClock && !manual && mode === 'playing') {
      accumulator += Math.min(delta, 100);
      while (accumulator + 0.0001 >= FIXED_MS) { tick(); accumulator -= FIXED_MS; }
    }
    this.paint();
    updateUi();
  }
  paint() {
    const h = model.hero;
    this.heroSprite.setPosition(Math.round(h.x), Math.round(h.y)).setFrame(h.frameIndex).setScale(h.facing, 1);
    this.heroSprite.setAlpha(h.hp <= 0 ? 0.85 : 1);
    for (const e of model.enemies) {
      this.enemies.get(e.id)?.setPosition(Math.round(e.x), Math.round(e.y)).setFrame(e.frameIndex).setScale(e.facing, 1).setAlpha(e.hp <= 0 ? 0.7 : 1);
    }
    this.cannonSprite.setTexture(model.cannon.action === 'recovery' ? 'cannon-fire' : 'cannon-idle');
    const alive = new Set<number | string>();
    for (const p of model.projectiles) {
      alive.add(p.id);
      let sprite = this.projectileSprites.get(p.id);
      if (!sprite) { sprite = this.add.circle(p.x, p.y, p.kind === 'cannon' ? 4 : 1.5, p.kind === 'cannon' ? 0x14242d : 0xffe3a0).setStrokeStyle(1, p.kind === 'cannon' ? 0x96866c : 0x6c4936).setDepth(12); this.projectileSprites.set(p.id, sprite); }
      sprite.setPosition(Math.round(p.x), Math.round(p.y));
    }
    for (const [id, s] of this.projectileSprites) if (!alive.has(id)) { s.destroy(); this.projectileSprites.delete(id); }
    this.effects.clear();
    if (model.cannon.action === 'windup') {
      const wickX = model.cannon.x + 20, wickY = model.cannon.y - 24;
      this.effects.fillStyle(0xffd078, 1);
      this.effects.fillRect(wickX, wickY, 2, 2);
      if (model.tick % 8 < 4) this.effects.fillRect(wickX + 2, wickY - 2, 1, 2);
    }
    for (const event of model.log) {
      const age = model.time - event.time;
      if (age > 140 || age < 0) continue;
      const x = Math.round(event.x ?? h.x + h.facing * 18), y = Math.round(event.y ?? h.y - 30);
      if (event.type === 'parry' || event.type === 'block') {
        const c = event.type === 'parry' ? 0xe4fff1 : 0xe9b963;
        this.effects.lineStyle(event.type === 'parry' ? 2 : 1, c, 1 - age / 180);
        for (let i = 0; i < 5; i++) { const angle = i * 1.35 + 0.2; const d = age / 12; this.effects.lineBetween(Math.round(x + Math.cos(angle) * d), Math.round(y + Math.sin(angle) * d), Math.round(x + Math.cos(angle) * (d + 4)), Math.round(y + Math.sin(angle) * (d + 4))); }
      } else if ((event.type === 'musketFire' || event.type === 'cannonFire') && age < 75) {
        const direction = event.type === 'cannonFire' ? -1 : (model.enemies.find(e => e.id === event.actor)?.facing ?? -1);
        this.effects.fillStyle(0xffecc6, 1 - age / 100);
        this.effects.fillRect(x + direction * 2 - 2, y - 1, 4, 2);
        this.effects.fillStyle(0xe5a85c, 1 - age / 100);
        this.effects.fillRect(x + direction * 5 - 1, y - 2, 3, 4);
      } else if ((event.type === 'cannonImpact' || event.type === 'cannonHit') && age < 120) {
        this.effects.fillStyle(0xe4c59c, 1 - age / 150);
        for (let i = 0; i < 6; i++) { const angle = i * 1.1; const d = age / 11; this.effects.fillRect(Math.round(x + Math.cos(angle) * d), Math.round(y + Math.sin(angle) * d), 2, 2); }
      }
    }
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('boxes')) {
      this.effects.lineStyle(1, 0x75fff2, 0.7);
      for (const a of [h, ...model.enemies]) this.effects.strokeRect(Math.round(a.x - a.width / 2), Math.round(a.y - a.height), a.width, a.height);
      this.effects.lineStyle(1, 0xffc56f, 0.8);
      for (const p of PLATFORMS) this.effects.strokeRect(p.x, p.y, p.width, p.height);
    }
  }
}

new Phaser.Game({ type: Phaser.WEBGL, parent: ui.host, width: 640, height: 360,
  backgroundColor: '#102a32', pixelArt: true, roundPixels: true, antialias: false,
  render: { pixelArt: true, roundPixels: true, preserveDrawingBuffer: import.meta.env.DEV }, scene: WakeScene,
  banner: false, audio: { noAudio: true }, scale: { mode: Phaser.Scale.NONE },
});

const keys: Record<string, UiAction> = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyJ: 'attack', KeyK: 'guard', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyE: 'interact' };
const physical = new Map<string, UiAction>();
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && event.target.closest('input,select,textarea')) return;
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
window.addEventListener('blur', () => { physical.clear(); clearInput(); setFocused(model, false); if (mode === 'playing') { mode = 'paused'; updateUi(); } });
window.addEventListener('focus', () => { setFocused(model, true); accumulator = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { physical.clear(); clearInput(); if (mode === 'playing') pause(); } });

function resizeStage() {
  const area = ui.element.querySelector<HTMLElement>('.wake-play-area');
  const stage = ui.element.querySelector<HTMLElement>('.wake-stage');
  if (!area || !stage) return;
  const touch = matchMedia('(pointer: coarse)').matches && innerWidth > innerHeight;
  const availableW = Math.max(200, area.clientWidth);
  const availableH = area.clientHeight;
  const dpr = devicePixelRatio || 1;
  const deviceScale = Math.max(1, Math.floor(Math.min(availableW / 640, availableH / 360) * dpr));
  const scale = deviceScale / dpr;
  stage.style.width = `${640 * scale}px`; stage.style.height = `${360 * scale}px`;
  stage.dataset.pixelScale = String(deviceScale);
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
  window.render_game_to_text = () => JSON.stringify({ ...snapshot(model), mode, locale, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, world: WORLD });
  window.advanceTime = (ms: number) => {
    manualClock = true;
    const count = Math.max(0, Math.round(ms / FIXED_MS));
    for (let i = 0; i < count; i++) tick();
    scene?.paint(); updateUi();
  };
  window.__cw = { model, start, restart: reset, input, snapshot: () => snapshot(model), frame: () => { scene?.paint(); updateUi(); } };
}
