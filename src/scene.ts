import Phaser from 'phaser';
import { PLATFORMS, getDodgeFrame, getMusketLine, type Model, type Hero, type Enemy } from './game/model';
import { sampleClipFrame } from './game/contact';
import { defeatedHeroPose } from './game/presentation';

type DisplayMode = '640' | '960';
interface ArtFrame { id: string; rect: [number, number, number, number]; anchor: [number, number]; durationMs: number;
  weapon?: { id: string; hand: [number, number]; angle: number; depth: string; handOcclusionRect?: [number, number, number, number]; handOcclusionRects?: [number, number, number, number][] } }
interface ArtClip { frames: ArtFrame[]; loop?: boolean; holdLast?: boolean; contactFrameIndex?: number; phaseFrames?: { windup: number[]; active: number[]; recovery: number[] } }
interface ArtVariant { image: string; density: number; actions: Record<string, ArtClip | ArtFrame[]> }
interface WeaponVariant { image: string; pivot: [number, number]; tip: [number, number]; sizePx: [number, number] }
interface ActorManifest { actors: Record<string, Record<DisplayMode, ArtVariant>>; weapons?: Record<string, Record<DisplayMode, WeaponVariant>> }

/** Rendering follows simulation time; animation never applies independent damage. */
export class PlaytestScene extends Phaser.Scene {
  private heroSprite!: Phaser.GameObjects.Sprite;
  private enemies = new Map<string, Phaser.GameObjects.Sprite>();
  private environment = new Map<string, Phaser.GameObjects.Image>();
  private cannon!: Phaser.GameObjects.Image;
  private mast!: Phaser.GameObjects.Image;
  private effects!: Phaser.GameObjects.Graphics;
  private markers!: Phaser.GameObjects.Graphics;
  private projectileSprites = new Map<number, Phaser.GameObjects.Arc>();
  private weapons = new Map<string, Phaser.GameObjects.Image>();
  private hands = new Map<string, Phaser.GameObjects.Image[]>();
  private manifest!: ActorManifest;
  private displayMode: DisplayMode = '640';
  private enabledEffects = true;
  private factor = 1;
  private loaded = false;
  constructor(private model: Model, private hooks: { ready(scene: PlaytestScene): void; update(delta: number): void; resultTime(): number }) { super('salt-copper-playtest'); }
  preload() {
    for (const size of ['640', '960']) {
      for (const name of ['sea', 'far-ship', 'sail', 'hull', 'platform', 'crate', 'cannon', 'mast']) this.load.image(`${name}-${size}`, `/assets/ship-v2/${size}/${name}.png`);
      for (const name of ['hero', 'sword', 'musket']) this.load.image(`${name}-${size}`, `/assets/actors-v2/${name}-${size}.png`);
      this.load.image(`weapon-cutlass-${size}`, `/assets/actors-v2/cutlass-${size}.png`);
      this.load.image(`weapon-musket-${size}`, `/assets/actors-v2/musket-rig-${size}.png`);
    }
    this.load.json('actor-manifest', '/assets/actors-v2/manifest.json');
  }
  create() {
    this.manifest = this.cache.json.get('actor-manifest');
    for (const [actor, variants] of Object.entries(this.manifest.actors)) {
      for (const size of ['640', '960'] as const) {
        const texture = this.textures.get(`${actor}-${size}`);
        for (const clip of Object.values(variants[size].actions)) {
          for (const frame of Array.isArray(clip) ? clip : clip.frames) {
            if (!texture.has(frame.id)) texture.add(frame.id, 0, ...frame.rect);
            for (const [index, hand] of this.handPatches(frame).entries()) {
              if (!texture.has(`${frame.id}-hand-${index}`)) texture.add(`${frame.id}-hand-${index}`, 0, frame.rect[0] + hand[0], frame.rect[1] + hand[1], hand[2], hand[3]);
            }
          }
        }
      }
    }
    this.cameras.main.roundPixels = true;
    for (const [name, x, y, depth] of [
      ['sea', 0, 0, 0], ['far-ship', 300, 110, 0.5], ['sail', 20, -35, 1], ['hull', 0, 255, 2],
      ['crate', 160, 231, 4], ['platform', 430, 207, 4],
    ] as const) this.environment.set(name, this.add.image(x, y, `${name}-640`).setOrigin(0).setDepth(depth));
    this.cannon = this.add.image(this.model.cannon.x, this.model.cannon.y, 'cannon-640').setOrigin(0.5, 1).setDepth(5);
    this.heroSprite = this.add.sprite(86, 255, 'hero-640').setDepth(10);
    for (const enemy of this.model.enemies) this.enemies.set(enemy.id, this.add.sprite(enemy.x, enemy.y, `${enemy.kind}-640`).setDepth(9));
    this.mast = this.add.image(-53, 0, 'mast-640').setOrigin(0).setDepth(14);
    this.markers = this.add.graphics().setDepth(13);
    this.effects = this.add.graphics().setDepth(20);
    this.loaded = true;
    this.hooks.ready(this);
    this.paint();
  }
  update(_time: number, delta: number) { this.hooks.update(delta); this.paint(); }
  presentation(mode: DisplayMode, effects: boolean) {
    this.enabledEffects = effects;
    if (!this.loaded || mode === this.displayMode) return;
    this.displayMode = mode;
    this.factor = mode === '960' ? 1.5 : 1;
    this.scale.resize(640 * this.factor, 360 * this.factor);
    for (const [name, sprite] of this.environment) sprite.setTexture(`${name}-${mode}`);
    this.cannon.setTexture(`cannon-${mode}`);
    this.mast.setTexture(`mast-${mode}`);
    for (const sprite of this.projectileSprites.values()) sprite.destroy();
    this.projectileSprites.clear();
    this.paint();
  }
  private clip(actor: string, name: string): ArtClip | undefined {
    const clip = this.manifest.actors[actor]?.[this.displayMode]?.actions[name];
    return Array.isArray(clip) ? { frames: clip, loop: name === 'run' || name === 'idle', holdLast: name === 'dead' } : clip;
  }
  private handPatches(frame: ArtFrame) { return frame.weapon?.handOcclusionRects ?? (frame.weapon?.handOcclusionRect ? [frame.weapon.handOcclusionRect] : []); }
  private drawActor(sprite: Phaser.GameObjects.Sprite, actor: Hero | Enemy) {
    const kind = actor.id === 'hero' ? 'hero' : (actor as Enemy).kind;
    let name: string = actor.action;
    let time = actor.id === 'hero' && actor.hp <= 0 ? this.hooks.resultTime() : actor.actionTime;
    let phase: 'windup' | 'active' | 'recovery' | undefined;
    let phaseDuration: number | undefined;
    let fixedFrameIndex: number | undefined;
    if (kind === 'hero') {
      const attack = (actor as Hero).attack;
      if (attack) {
        name = attack.kind === 'shove' ? 'shove' : attack.kind === 'air' ? 'airAttack' : `attack${attack.stage}`;
        phase = attack.elapsed < attack.activeStart ? 'windup' : attack.elapsed < attack.activeEnd ? 'active' : 'recovery';
        time = attack.elapsed - (phase === 'windup' ? 0 : phase === 'active' ? attack.activeStart : attack.activeEnd);
        phaseDuration = phase === 'windup' ? attack.activeStart : phase === 'active' ? attack.activeEnd - attack.activeStart : attack.duration - attack.activeEnd;
      } else if (['launch', 'rise', 'fall', 'land'].includes(name)) { fixedFrameIndex = ['launch', 'rise', 'fall', 'land'].indexOf(name); name = 'jump'; }
      else if (name === 'dodge') fixedFrameIndex = getDodgeFrame(time);
      else if (name === 'hurtRecover') { name = 'hurt'; time += 160; }
    } else {
      if (kind === 'sword' && ['windup', 'attack', 'recovery'].includes(name)) {
        phase = name === 'windup' ? 'windup' : name === 'attack' ? 'active' : 'recovery';
        phaseDuration = phase === 'windup' ? 520 : phase === 'active' ? 150 : 650;
        name = 'attack';
      } else if (name === 'stagger' || name === 'pushed') name = kind === 'musket' ? 'hurt' : 'stagger';
    }
    const clip = this.clip(kind, name);
    let weapon = this.weapons.get(actor.id);
    weapon?.setVisible(false);
    const hands = this.hands.get(actor.id) ?? [];
    for (const hand of hands) hand.setVisible(false);
    if (clip?.frames.length) {
      const frame = fixedFrameIndex === undefined ? sampleClipFrame(clip, time, phase, phaseDuration)! : clip.frames[Math.min(fixedFrameIndex, clip.frames.length - 1)];
      sprite.setTexture(`${kind}-${this.displayMode}`, frame.id)
        .setOrigin(frame.anchor[0] / frame.rect[2], frame.anchor[1] / frame.rect[3])
        .setScale(actor.facing, 1);
      if (frame.weapon) {
        const definition = this.manifest.weapons?.[frame.weapon.id]?.[this.displayMode];
        if (definition) {
          if (!weapon) { weapon = this.add.image(0, 0, `weapon-${frame.weapon.id}-${this.displayMode}`); this.weapons.set(actor.id, weapon); }
          weapon.setTexture(`weapon-${frame.weapon.id}-${this.displayMode}`).setVisible(true)
            .setOrigin(definition.pivot[0] / definition.sizePx[0], definition.pivot[1] / definition.sizePx[1])
            .setPosition(Math.round(actor.x * this.factor + actor.facing * (frame.weapon.hand[0] - frame.anchor[0])), Math.round(actor.y * this.factor + frame.weapon.hand[1] - frame.anchor[1]))
            .setScale(actor.facing, 1).setRotation(frame.weapon.angle * actor.facing).setDepth(sprite.depth + 0.01).setAlpha(actor.hp <= 0 ? 0.85 : 1);
          for (const [index, patch] of this.handPatches(frame).entries()) {
            let hand = hands[index];
            if (!hand) { hand = this.add.image(0, 0, `${kind}-${this.displayMode}`); hands[index] = hand; this.hands.set(actor.id, hands); }
            hand.setTexture(`${kind}-${this.displayMode}`, `${frame.id}-hand-${index}`).setVisible(true).setOrigin(0)
              .setPosition(Math.round(actor.x * this.factor + actor.facing * (patch[0] - frame.anchor[0])), Math.round(actor.y * this.factor + patch[1] - frame.anchor[1]))
              .setScale(actor.facing, 1).setDepth(sprite.depth + 0.02).setAlpha(actor.hp <= 0 ? 0.85 : 1);
          }
        }
      }
    } else {
      throw new Error(`Missing reviewed animation: ${kind}/${name}`);
    }
    sprite.setPosition(Math.round(actor.x * this.factor), Math.round(actor.y * this.factor)).setAlpha(actor.hp <= 0 ? 0.85 : 1);
  }
  paint() {
    if (!this.loaded) return;
    const { model, factor: f } = this;
    const h = model.hero;
    this.environment.get('sea')!.setPosition(0, 0);
    this.environment.get('far-ship')!.setPosition(Math.round((300 + Math.sin(model.time / 12000) * 2) * f), 110 * f).setAlpha(0.48);
    this.environment.get('sail')!.setPosition(20 * f, -35 * f + Math.round(Math.sin(model.time / 3100) * f));
    this.environment.get('hull')!.setPosition(0, 255 * f);
    this.environment.get('crate')!.setPosition(160 * f, 231 * f);
    this.environment.get('platform')!.setPosition(430 * f, 207 * f);
    this.mast.setPosition(-53 * f, 0).setAlpha(h.x < 75 ? 0.22 : 1);
    const resultAge = h.hp <= 0 || model.encounter.status === 'complete' ? this.hooks.resultTime() : 0;
    this.drawActor(this.heroSprite, h.hp <= 0 ? { ...h, ...defeatedHeroPose(h, resultAge) } : h);
    for (const enemy of model.enemies) this.drawActor(this.enemies.get(enemy.id)!, enemy);
    const cannonTime = model.cannon.actionTime + resultAge;
    const recoil = model.cannon.action === 'recovery' ? Math.max(0, 3 * (1 - cannonTime / 180)) : 0;
    this.cannon.setPosition(Math.round((model.cannon.x + recoil) * f), model.cannon.y * f);
    const alive = new Set<number>();
    for (const projectile of model.projectiles) {
      alive.add(projectile.id);
      let sprite = this.projectileSprites.get(projectile.id);
      if (!sprite) {
        sprite = this.add.circle(0, 0, (projectile.kind === 'cannon' ? 4 : 1.5) * f, projectile.kind === 'cannon' ? 0x1c2b32 : 0xf4dfb7)
          .setStrokeStyle(f, projectile.kind === 'cannon' ? 0xac9067 : 0x674b34).setDepth(12);
        this.projectileSprites.set(projectile.id, sprite);
      }
      sprite.setPosition(Math.round(projectile.x * f), Math.round(projectile.y * f));
    }
    for (const [id, sprite] of this.projectileSprites) if (!alive.has(id)) { sprite.destroy(); this.projectileSprites.delete(id); }
    this.markers.clear().setScale(f);
    // Functional signals remain visible when decorative effects are disabled.
    if (model.cannon.action === 'windup') {
      this.markers.fillStyle(0xf1b96a).fillRect(model.cannon.x + 38, model.cannon.y - 31, 2, 3);
    }
    if (model.encounter.status === 'exitReady') {
      this.markers.lineStyle(1, 0xf0d49e, 0.9).strokeTriangle(609, 184, 615, 188, 609, 192);
      this.markers.lineBetween(602, 188, 614, 188);
    }
    this.effects.clear().setScale(f);
    if (this.enabledEffects) for (const event of model.log) {
      const age = model.time + resultAge - event.time;
      if (age > 150 || age < 0) continue;
      const x = Math.round(event.x ?? h.x + h.facing * 18), y = Math.round(event.y ?? h.y - 30);
      if (event.type === 'parry' || event.type === 'block') {
        this.effects.lineStyle(event.type === 'parry' ? 2 : 1, event.type === 'parry' ? 0xfff4dc : 0xbca47b, 1 - age / 180);
        for (let index = 0; index < 4; index++) {
          const angle = index * 1.7 + 0.2, distance = age / 15;
          this.effects.lineBetween(Math.round(x + Math.cos(angle) * distance), Math.round(y + Math.sin(angle) * distance), Math.round(x + Math.cos(angle) * (distance + 3)), Math.round(y + Math.sin(angle) * (distance + 3)));
        }
      } else if ((event.type === 'musketFire' || event.type === 'cannonFire') && age < 80) {
        const gunner = model.enemies.find(enemy => enemy.id === event.actor);
        const direction = event.type === 'musketFire' && gunner ? getMusketLine(gunner, 'fire').direction : { x: -1, y: 0 };
        this.effects.fillStyle(0xffe5af, 1 - age / 100).fillTriangle(
          x - direction.y * 2, y + direction.x * 2,
          x + direction.x * 9, y + direction.y * 9,
          x + direction.y * 2, y - direction.x * 2);
        if (event.type === 'cannonFire') this.cannon.setTint(0xffd0a2);
      } else if (event.type === 'cannonImpact' || event.type === 'cannonHit') {
        this.effects.fillStyle(0xd6b586, 1 - age / 160);
        for (let index = 0; index < 5; index++) { const angle = index * 1.2, distance = age / 13; this.effects.fillRect(Math.round(x + Math.cos(angle) * distance), Math.round(y + Math.sin(angle) * distance), 2, 2); }
      }
    }
    if (model.cannon.action !== 'recovery' || cannonTime > 90) this.cannon.clearTint();
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('boxes')) {
      this.effects.lineStyle(1 / f, 0x75fff2, 0.7);
      for (const actor of [h, ...model.enemies]) this.effects.strokeRect(actor.x - actor.width / 2, actor.y - actor.height, actor.width, actor.height);
      this.effects.lineStyle(1 / f, 0xffc56f, 0.8);
      for (const platform of PLATFORMS) this.effects.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
  }
}
