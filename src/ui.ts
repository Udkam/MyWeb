export type UiAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'attack'
  | 'guard'
  | 'dodge'
  | 'interact';

export type UiLocale = 'zh' | 'en';
export type UiContextAction = 'none' | 'shove' | 'cannon';
export type UiDisplayMode = '640' | '960';

export interface UiCallbacks {
  action(name: UiAction, held: boolean): void;
  start(): void;
  restart(): void;
  pause(): void;
  language(): void;
  mute(): void;
  fullscreen(): void;
  effects?(enabled: boolean): void;
  display?(mode: UiDisplayMode): void;
}

export interface UiState {
  hp: number;
  maxHp: number;
  mode: string;
  cue: string;
  guardPressure: number;
  momentumReady: boolean;
  nearCannon: boolean;
  locale: UiLocale;
  muted: boolean;
  contextAction: UiContextAction;
  contextTarget: string | null;
  effectsEnabled: boolean;
  displayMode: UiDisplayMode;
  elapsedSeconds: number;
}

const copy = {
  zh: {
    hero: '洛恩',
    location: '盐风码头',
    subtitle: '铜潮试炼',
    review: '试玩 · 待验收',
    pause: '暂停',
    resume: '继续',
    restart: '重开',
    mute: '静音',
    unmute: '开启声音',
    language: 'EN',
    fullscreen: '全屏',
    fullscreenLabel: '切换全屏',
    health: '生命',
    momentum: '破绽已现',
    momentumHint: 'J 追击 · E 推撞',
    pressure: '受压',
    cannon: '点炮',
    shove: '推撞',
    contextNone: '暂无可用动作',
    contextMiss: '目标已脱离',
    settings: '设置',
    settingsTitle: '航行设置',
    closeSettings: '返回',
    sound: '声音',
    soundNote: '开始后开启浏览器音频',
    effects: '战斗效果',
    effectsNote: '火星、撞击碎屑与枪口闪光',
    enabled: '开启',
    disabled: '关闭',
    display: '画面对照',
    displayNote: '同一构图，比较动作读感',
    objective: '击退守军，夺回甲板',
    targetSword: '刀兵',
    targetMusket: '火枪手',
    targetCannon: '固定火炮',
    left: '向左移动',
    right: '向右移动',
    jump: '跳',
    attack: '攻',
    guard: '防',
    dodge: '闪',
    interact: '互动',
    moveHelp: '移动',
    jumpHelp: '跳跃',
    attackHelp: '两刀追击',
    guardHelp: '招架 / 防御',
    dodgeHelp: '闪避',
    interactHelp: '推撞 / 点炮',
    title: '盐风之下',
    titleNote: '两层甲板，一门侧炮。用刀、招架和站位夺回通路。',
    start: '开始遭遇',
    paused: '风浪稍歇',
    pausedNote: '喘口气，再接下一招。',
    dead: '再来一回',
    deadNote: '看清起手，守住正面。',
    complete: '甲板已清',
    completeNote: '再试一条路线：先夺高台，或借炮线打开局面。',
    loading: '正在准备码头…',
    portrait: '横握设备，继续冒险',
    portraitNote: '游戏已暂停。转为横屏后，轻点“继续”。',
    touch: '触控操作',
  },
  en: {
    hero: 'Lorne',
    location: 'Saltwind Docks',
    subtitle: 'Copper Tide Trial',
    review: 'Playtest · Awaiting Review',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    mute: 'Mute',
    unmute: 'Sound on',
    language: '中文',
    fullscreen: 'Fullscreen',
    fullscreenLabel: 'Toggle fullscreen',
    health: 'Health',
    momentum: 'Opening created',
    momentumHint: 'J follow-up · E shove',
    pressure: 'Guard pressure',
    cannon: 'Fire cannon',
    shove: 'Shove',
    contextNone: 'No action in reach',
    contextMiss: 'Target moved away',
    settings: 'Settings',
    settingsTitle: 'Voyage settings',
    closeSettings: 'Back',
    sound: 'Sound',
    soundNote: 'Audio unlocks when you begin',
    effects: 'Combat effects',
    effectsNote: 'Sparks, impact debris and muzzle flashes',
    enabled: 'On',
    disabled: 'Off',
    display: 'Display comparison',
    displayNote: 'Same framing, compare action readability',
    objective: 'Clear the crew. Reclaim the deck.',
    targetSword: 'Swordsman',
    targetMusket: 'Musketeer',
    targetCannon: 'Deck cannon',
    left: 'Move left',
    right: 'Move right',
    jump: 'Jump',
    attack: 'Cut',
    guard: 'Guard',
    dodge: 'Dodge',
    interact: 'Use',
    moveHelp: 'Move',
    jumpHelp: 'Jump',
    attackHelp: 'Two-hit follow-up',
    guardHelp: 'Parry / guard',
    dodgeHelp: 'Dodge',
    interactHelp: 'Shove / fire cannon',
    title: 'Beneath the saltwind',
    titleNote: 'Two decks. One cannon. Take the passage with steel, timing and position.',
    start: 'Begin encounter',
    paused: 'A moment of calm',
    pausedNote: 'Take a breath. Read the next strike.',
    dead: 'One more round',
    deadNote: 'Read the windup. Keep your guard in front.',
    complete: 'The deck is yours',
    completeNote: 'Try another route: seize the high deck, or put a foe in the cannon line.',
    loading: 'Preparing the docks…',
    portrait: 'Turn your device sideways',
    portraitNote: 'The game is paused. Rotate to landscape, then tap Resume.',
    touch: 'Touch controls',
  },
} as const;

const defaultState: UiState = {
  hp: 6,
  maxHp: 6,
  mode: 'loading',
  cue: '',
  guardPressure: 0,
  momentumReady: false,
  nearCannon: false,
  locale: 'zh',
  muted: false,
  contextAction: 'none',
  contextTarget: null,
  effectsEnabled: true,
  displayMode: '640',
  elapsedSeconds: 0,
};

/** DOM chrome only. World rendering and all gameplay rules remain in the game. */
export class GameUi {
  readonly element: HTMLElement;
  readonly host: HTMLDivElement;

  private state: UiState = { ...defaultState };
  private readonly callbacks: UiCallbacks;
  private readonly listeners = new AbortController();
  private readonly pointers = new Map<number, UiAction>();
  private readonly heldCounts = new Map<UiAction, number>();
  private portraitPauseRequested = false;
  private isPortrait = false;
  private lastRenderSignature = '';
  private settingsOpen = false;

  constructor(callbacks: UiCallbacks, target?: HTMLElement) {
    this.callbacks = callbacks;
    this.element = document.createElement('main');
    this.element.className = 'wake-shell';
    this.element.innerHTML = `
      <header class="wake-mast">
        <div class="wake-wordmark" aria-label="Cutlass Wake"><span>CUTLASS</span><b>WAKE</b></div>
        <div class="wake-review" data-copy="review"></div>
        <nav class="wake-tools" aria-label="Game controls">
          <button type="button" data-command="pause"></button>
          <button type="button" data-command="restart" data-copy="restart"></button>
          <button type="button" data-command="settings" data-copy="settings" aria-haspopup="dialog"></button>
          <button type="button" data-command="mute"></button>
          <button type="button" data-command="language" data-copy="language"></button>
          <button type="button" data-command="fullscreen" data-copy="fullscreen"></button>
        </nav>
      </header>

      <section class="wake-play-area" aria-label="Cutlass Wake">
        <div class="wake-stage">
          <div id="game-host" class="wake-game-host"></div>
          <div class="wake-hud" aria-live="off">
            <div class="wake-hero">
              <div class="wake-hero-name" data-copy="hero"></div>
              <div class="wake-health" role="meter" aria-valuemin="0"></div>
              <div class="wake-guard-state" hidden><span data-copy="pressure"></span><span class="wake-pressure-track"><i></i></span></div>
              <div class="wake-momentum" hidden><b data-copy="momentum"></b><small data-copy="momentumHint"></small></div>
            </div>
            <div class="wake-chapter"><span data-copy="location"></span><small data-copy="subtitle"></small><span class="wake-encounter-time" aria-label="Encounter time"></span></div>
          </div>
          <div class="wake-scene-overlay" hidden>
            <div class="wake-pause-card">
              <span class="wake-card-rule" aria-hidden="true"></span>
              <h1 class="wake-card-title"></h1>
              <p class="wake-card-note"></p>
              <button type="button" class="wake-primary" data-command="primary"></button>
            </div>
          </div>
          <div class="wake-loading" role="status" hidden data-copy="loading"></div>
        </div>

        <div class="wake-touch" aria-label="Touch controls">
          <div class="wake-touch-move">
            <button type="button" class="wake-touch-key wake-direction" data-action="left"><span aria-hidden="true">←</span></button>
            <button type="button" class="wake-touch-key wake-direction" data-action="right"><span aria-hidden="true">→</span></button>
          </div>
          <div class="wake-touch-actions">
            <button type="button" class="wake-touch-key" data-action="jump" data-copy="jump"></button>
            <button type="button" class="wake-touch-key wake-touch-attack" data-action="attack" data-copy="attack"></button>
            <button type="button" class="wake-touch-key" data-action="dodge" data-copy="dodge"></button>
            <button type="button" class="wake-touch-key wake-touch-guard" data-action="guard" data-copy="guard"></button>
          </div>
          <button type="button" class="wake-touch-key wake-touch-interact" data-action="interact" hidden></button>
        </div>
      </section>

      <footer class="wake-foot">
        <div class="wake-cue" role="status" aria-live="polite"></div>
        <div class="wake-keyboard-help" aria-label="Keyboard controls">
          <span><kbd>A D</kbd><span data-copy="moveHelp"></span></span>
          <span><kbd>Space</kbd><span data-copy="jumpHelp"></span></span>
          <span><kbd>J</kbd><span data-copy="attackHelp"></span></span>
          <span><kbd>K</kbd><span data-copy="guardHelp"></span></span>
          <span><kbd>Shift</kbd><span data-copy="dodgeHelp"></span></span>
          <span><kbd>E</kbd><span data-copy="interactHelp"></span></span>
        </div>
        <div class="wake-cannon-hint" hidden><kbd>E</kbd><span class="wake-context-label"></span><small class="wake-context-target"></small></div>
      </footer>

      <section class="wake-settings" hidden role="dialog" aria-modal="true" aria-labelledby="wake-settings-title">
        <div class="wake-settings-card">
          <span class="wake-card-rule" aria-hidden="true"></span>
          <h2 id="wake-settings-title" data-copy="settingsTitle"></h2>
          <div class="wake-setting-row"><div><b data-copy="sound"></b><small data-copy="soundNote"></small></div><button type="button" data-command="mute" class="wake-setting-toggle"></button></div>
          <div class="wake-setting-row" data-setting="effects"><div><b data-copy="effects"></b><small data-copy="effectsNote"></small></div><button type="button" data-command="effects" class="wake-setting-toggle"></button></div>
          <div class="wake-setting-row" data-setting="display"><div><b data-copy="display"></b><small data-copy="displayNote"></small></div><div class="wake-display-options"><button type="button" data-display="640">640</button><button type="button" data-display="960">960</button></div></div>
          <button type="button" class="wake-primary" data-command="close-settings" data-copy="closeSettings"></button>
        </div>
      </section>

      <div class="wake-portrait" hidden role="status">
        <div class="wake-orientation-mark" aria-hidden="true"></div>
        <h2 data-copy="portrait"></h2>
        <p data-copy="portraitNote"></p>
        <span class="wake-portrait-review" data-copy="review"></span>
      </div>
    `;

    this.host = this.required<HTMLDivElement>('#game-host');
    (target ?? document.querySelector<HTMLElement>('#app') ?? document.body).append(this.element);

    const signal = this.listeners.signal;
    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-command]')) {
      button.addEventListener('click', (event) => {
        this.command(button.dataset.command ?? '');
        // Pointer toolbar use returns to play; keyboard activation retains Tab focus.
        if (event.detail > 0 && this.state.mode === 'playing' && !this.settingsOpen) button.blur();
      }, { signal });
    }
    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-display]')) {
      button.addEventListener('click', () => this.callbacks.display?.(button.dataset.display as UiDisplayMode), { signal });
    }

    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      button.addEventListener('pointerdown', (event) => this.press(event, button), { signal });
      button.addEventListener('pointerup', (event) => this.release(event.pointerId), { signal });
      button.addEventListener('pointercancel', (event) => this.release(event.pointerId), { signal });
      button.addEventListener('lostpointercapture', (event) => this.release(event.pointerId), { signal });
      button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
      button.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
    }

    window.addEventListener('blur', this.releaseAll, { signal });
    window.addEventListener('keydown', (event) => {
      if (!this.settingsOpen) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.command('close-settings');
      } else if (event.code === 'Tab') this.trapSettingsFocus(event);
    }, { signal, capture: true });
    window.addEventListener('resize', this.syncOrientation, { signal });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    }, { signal });
    this.update(defaultState);
  }

  update(next: Partial<UiState>): void {
    const previousMode = this.state.mode;
    this.state = { ...this.state, ...next };
    const signature = JSON.stringify([this.state, this.settingsOpen]);
    if (signature === this.lastRenderSignature) return;
    this.lastRenderSignature = signature;
    const locale: UiLocale = this.state.locale === 'en' ? 'en' : 'zh';
    const t = copy[locale];
    this.element.lang = locale === 'zh' ? 'zh-CN' : 'en';
    this.element.dataset.mode = this.state.mode;

    for (const node of this.element.querySelectorAll<HTMLElement>('[data-copy]')) {
      const key = node.dataset.copy as keyof typeof t;
      if (key in t) node.textContent = t[key];
    }

    const maxHp = Math.max(1, Math.min(20, Math.floor(this.state.maxHp)));
    const hp = Math.max(0, Math.min(maxHp, Math.floor(this.state.hp)));
    const health = this.required<HTMLElement>('.wake-health');
    if (health.childElementCount !== maxHp) {
      health.replaceChildren(...Array.from({ length: maxHp }, () => {
        const pip = document.createElement('i');
        pip.className = 'wake-health-pip';
        pip.setAttribute('aria-hidden', 'true');
        return pip;
      }));
    }
    Array.from(health.children).forEach((pip, index) => pip.classList.toggle('is-empty', index >= hp));
    health.setAttribute('aria-label', t.health);
    health.setAttribute('aria-valuemax', String(maxHp));
    health.setAttribute('aria-valuenow', String(hp));
    health.setAttribute('aria-valuetext', `${hp} / ${maxHp}`);

    const pressure = Math.max(0, Math.min(100, this.state.guardPressure));
    this.required<HTMLElement>('.wake-guard-state').hidden = pressure === 0;
    this.required<HTMLElement>('.wake-pressure-track i').style.width = `${pressure}%`;
    this.required<HTMLElement>('.wake-guard-state').setAttribute('aria-label', `${t.pressure} ${Math.ceil(pressure)}%`);
    this.element.classList.toggle('is-pressured', pressure >= 75);
    this.required<HTMLElement>('.wake-momentum').hidden = !this.state.momentumReady;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    this.required<HTMLElement>('[data-copy="momentumHint"]').textContent = this.state.contextAction === 'shove'
      ? touch ? locale === 'zh' ? '攻：追击 · 推撞：改位置' : 'Cut: follow-up · Shove: reposition' : t.momentumHint
      : locale === 'zh' ? touch ? '靠近后点「攻」追击 · 也可脱离' : '靠近目标追击 · 也可脱离'
        : touch ? 'Move closer, then Cut · Or disengage' : 'Close in to follow up · Or disengage';

    const pauseButton = this.required<HTMLButtonElement>('[data-command="pause"]');
    pauseButton.textContent = this.state.mode === 'paused' ? t.resume : t.pause;
    pauseButton.setAttribute('aria-pressed', String(this.state.mode === 'paused'));
    for (const muteButton of this.element.querySelectorAll<HTMLButtonElement>('[data-command="mute"]')) {
      muteButton.textContent = this.state.muted ? t.unmute : t.mute;
      muteButton.setAttribute('aria-pressed', String(this.state.muted));
    }
    this.required<HTMLButtonElement>('[data-command="fullscreen"]').setAttribute('aria-label', t.fullscreenLabel);
    this.required<HTMLElement>('.wake-cue').textContent = this.state.cue;
    const context = this.state.contextAction;
    const contextLabel = context === 'shove' ? t.shove : t.cannon;
    const contextTarget = this.state.contextTarget ?? '';
    this.required<HTMLElement>('.wake-cannon-hint').hidden = context === 'none' || this.state.mode !== 'playing' || this.settingsOpen;
    this.required<HTMLElement>('.wake-context-label').textContent = contextLabel;
    this.required<HTMLElement>('.wake-context-target').textContent = contextTarget.includes('sword') ? t.targetSword : contextTarget.includes('musket') ? t.targetMusket : context === 'cannon' ? t.targetCannon : '';
    const contextButton = this.required<HTMLButtonElement>('[data-action="interact"]');
    contextButton.hidden = context === 'none';
    contextButton.textContent = contextLabel;
    contextButton.dataset.context = context;
    contextButton.dataset.target = contextTarget;
    contextButton.setAttribute('aria-label', context === 'none' ? t.contextNone : contextLabel);

    this.required<HTMLElement>('.wake-encounter-time').textContent = `${Math.floor(Math.max(0, this.state.elapsedSeconds) / 60)}:${String(Math.floor(Math.max(0, this.state.elapsedSeconds)) % 60).padStart(2, '0')}`;
    const effectsButton = this.required<HTMLButtonElement>('[data-command="effects"]');
    effectsButton.textContent = this.state.effectsEnabled ? t.enabled : t.disabled;
    effectsButton.setAttribute('aria-pressed', String(this.state.effectsEnabled));
    this.required<HTMLElement>('[data-setting="effects"]').hidden = !this.callbacks.effects;
    this.required<HTMLElement>('[data-setting="display"]').hidden = !this.callbacks.display;
    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-display]')) {
      button.setAttribute('aria-pressed', String(button.dataset.display === this.state.displayMode));
    }
    this.required<HTMLElement>('.wake-settings').hidden = !this.settingsOpen;

    for (const button of this.element.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const action = button.dataset.action as UiAction;
      if (action !== 'interact') button.setAttribute('aria-label', t[action]);
      button.disabled = this.state.mode !== 'playing' || this.settingsOpen;
    }

    const mode = this.state.mode;
    const isTitle = mode === 'title' || mode === 'ready' || mode === 'menu';
    const isVictory = mode === 'complete' || mode === 'victory';
    const hasCard = !this.settingsOpen && (isTitle || mode === 'paused' || mode === 'dead' || isVictory);
    this.required<HTMLElement>('.wake-scene-overlay').hidden = !hasCard;
    this.required<HTMLElement>('.wake-loading').hidden = mode !== 'loading';
    if (hasCard) {
      const title = mode === 'paused' ? t.paused : mode === 'dead' ? t.dead : isVictory ? t.complete : t.title;
      const note = mode === 'paused' ? t.pausedNote : mode === 'dead' ? t.deadNote : isVictory ? t.completeNote : t.titleNote;
      this.required<HTMLElement>('.wake-card-title').textContent = title;
      this.required<HTMLElement>('.wake-card-note').textContent = note;
      this.required<HTMLButtonElement>('[data-command="primary"]').textContent = mode === 'paused' ? t.resume : isTitle ? t.start : t.restart;
    }

    if (previousMode === 'playing' && mode !== 'playing') this.releaseAll();
    this.syncOrientation();
  }

  /** Clear only UI-owned pointers. The game's keyboard layer clears its own input. */
  releaseAll = (): void => {
    const held = [...this.heldCounts.keys()];
    this.pointers.clear();
    this.heldCounts.clear();
    for (const button of this.element.querySelectorAll<HTMLElement>('[data-action]')) {
      button.classList.remove('is-held');
    }
    for (const action of held) this.callbacks.action(action, false);
  };

  destroy(): void {
    this.releaseAll();
    this.listeners.abort();
    this.element.remove();
  }

  private required<T extends HTMLElement>(selector: string): T {
    const node = this.element.querySelector<T>(selector);
    if (!node) throw new Error(`Missing UI element: ${selector}`);
    return node;
  }

  private command(name: string): void {
    if (name === 'primary') {
      if (this.state.mode === 'paused') this.callbacks.pause();
      else if (this.state.mode === 'dead' || this.state.mode === 'complete' || this.state.mode === 'victory') this.callbacks.restart();
      else this.callbacks.start();
      return;
    }
    if (name === 'settings') {
      this.settingsOpen = true;
      this.releaseAll();
      if (this.state.mode === 'playing') this.callbacks.pause();
      this.update({});
      this.required<HTMLButtonElement>('[data-command="close-settings"]').focus({ preventScroll: true });
      return;
    }
    if (name === 'close-settings') {
      this.settingsOpen = false;
      this.update({});
      this.required<HTMLButtonElement>('[data-command="settings"]').focus({ preventScroll: true });
      return;
    }
    if (name === 'effects') { this.callbacks.effects?.(!this.state.effectsEnabled); return; }
    if (name === 'restart') this.releaseAll();
    if (name === 'pause') this.callbacks.pause();
    else if (name === 'restart') this.callbacks.restart();
    else if (name === 'language') this.callbacks.language();
    else if (name === 'mute') this.callbacks.mute();
    else if (name === 'fullscreen') this.callbacks.fullscreen();
  }

  private press(event: PointerEvent, button: HTMLButtonElement): void {
    if (this.state.mode !== 'playing' || this.settingsOpen || event.button !== 0) return;
    event.preventDefault();
    if (this.pointers.has(event.pointerId)) this.release(event.pointerId);
    const action = button.dataset.action as UiAction;
    this.pointers.set(event.pointerId, action);
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-held');
    const count = this.heldCounts.get(action) ?? 0;
    this.heldCounts.set(action, count + 1);
    if (count === 0) this.callbacks.action(action, true);
  }

  private release(pointerId: number): void {
    const action = this.pointers.get(pointerId);
    if (!action) return;
    this.pointers.delete(pointerId);
    const count = Math.max(0, (this.heldCounts.get(action) ?? 1) - 1);
    if (count > 0) {
      this.heldCounts.set(action, count);
      return;
    }
    this.heldCounts.delete(action);
    this.required<HTMLElement>(`[data-action="${action}"]`).classList.remove('is-held');
    this.callbacks.action(action, false);
  }

  private syncOrientation = (): void => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.isPortrait = isTouch && window.innerHeight > window.innerWidth;
    this.element.classList.toggle('is-portrait', this.isPortrait);
    this.required<HTMLElement>('.wake-portrait').hidden = !this.isPortrait;
    if (!this.isPortrait) this.portraitPauseRequested = false;
    if (this.isPortrait && this.state.mode === 'playing' && !this.portraitPauseRequested) {
      this.portraitPauseRequested = true;
      this.releaseAll();
      this.callbacks.pause();
    }
  };

  private trapSettingsFocus(event: KeyboardEvent): void {
    const nodes = [...this.required<HTMLElement>('.wake-settings').querySelectorAll<HTMLButtonElement>('button')]
      .filter((button) => !button.disabled && button.getClientRects().length > 0);
    const first = nodes[0];
    const last = nodes.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !this.required<HTMLElement>('.wake-settings').contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
}
