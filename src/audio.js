/** Existing, credited recordings only. No generated tones or synthesized music. */
export const MUSIC_CUES = Object.freeze({
  catacombs: { file: 'music/catacombs.ogg', gain: .315, title: 'Catacombs' },
  ancient: { file: 'music/ancient-evil.ogg', gain: .286, title: 'Ancient Evil Awakens!' },
  whispers: { file: 'music/whispers.ogg', gain: .489, title: 'Whispers From Beyond' },
  boss: { file: 'music/epic-boss.ogg', gain: .246, title: 'Epic Boss Battle' },
});
export const MUSIC_SCENES = Object.freeze({
  dungeon: 'catacombs', mire: 'catacombs', cinder: 'ancient', storm: 'ancient',
  void: 'whispers', rift: 'whispers', fight: 'boss',
});

export function createAudio(onUnavailable = () => {}) {
  let context, master, music = false, sfx = false, loaded = false, pending;
  let warned = false, activeVoices = 0, lastShot = 0;
  let suspended = false, musicRevision = 0, desiredTrack = 'dungeon', currentTrack = null;
  let desiredCue = 'whispers', activeDeck = null;
  const decks = [], buffers = new Map(), FADE_SECONDS = 1.1;
  const unavailable = () => { if (!warned) { onUnavailable(); warned = true; } };

  async function unlock() {
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!master) { master = context.createGain(); master.gain.value = .65; master.connect(context.destination); }
      // A late effect decode must never undo a pause or hidden-tab suspension.
      if (!suspended) await context.resume();
      if (!pending) pending = Promise.all(['shot', 'dash', 'hit', 'death', 'relic'].map(async (name) => {
        const response = await fetch(`./assets/${name}.wav`); if (!response.ok) throw new Error(`Missing ${name}`);
        buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
      })).then(() => { loaded = true; });
      await pending;
    } catch { unavailable(); }
  }

  function play(name) {
    if (!sfx || suspended || !loaded || context?.state !== 'running' || activeVoices >= 10 || !buffers.has(name)) return;
    if (name === 'shot' && context.currentTime - lastShot < .07) return;
    if (name === 'shot') lastShot = context.currentTime;
    const source = context.createBufferSource(), volume = context.createGain();
    source.buffer = buffers.get(name); volume.gain.value = name === 'shot' ? .1 : name === 'hit' ? .25 : .3;
    source.connect(volume); volume.connect(master); activeVoices++;
    source.onended = () => { activeVoices--; source.disconnect(); volume.disconnect(); }; source.start();
  }

  function createDeck() {
    const media = new Audio(); media.loop = true; media.preload = 'metadata';
    const gain = context.createGain(); gain.gain.value = 0;
    context.createMediaElementSource(media).connect(gain); gain.connect(master);
    const deck = { media, gain, cue: null, generation: 0, timer: null };
    decks.push(deck); return deck;
  }

  function ramp(deck, target, seconds) {
    clearTimeout(deck.timer); deck.timer = null;
    const param = deck.gain.gain, time = context.currentTime;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(time);
    else { const value = param.value; param.cancelScheduledValues(time); param.setValueAtTime(value, time); }
    param.linearRampToValueAtTime(target, time + seconds);
  }

  function pauseDecks() {
    for (const deck of decks) {
      clearTimeout(deck.timer); deck.timer = null;
      deck.media.pause();
      deck.gain.gain.cancelScheduledValues(context.currentTime);
      deck.gain.gain.setValueAtTime(0, context.currentTime);
    }
  }

  async function startMusic() {
    if (!music || suspended || !context || !master) return;
    const revision = ++musicRevision, cue = desiredCue, track = desiredTrack;
    let incoming = decks.find(deck => deck.cue === cue);
    if (!incoming) incoming = decks.length < 2 ? createDeck() : decks.find(deck => deck !== activeDeck);
    clearTimeout(incoming.timer); incoming.timer = null;
    if (incoming.cue !== cue) {
      incoming.media.pause(); incoming.generation++;
      incoming.gain.gain.cancelScheduledValues(context.currentTime);
      incoming.gain.gain.setValueAtTime(0, context.currentTime);
      incoming.media.src = `./assets/${MUSIC_CUES[cue].file}`; incoming.cue = cue;
    }
    const generation = incoming.generation;
    incoming.request = revision;
    try {
      await incoming.media.play();
      if (revision !== musicRevision || !music || suspended) {
        if (generation === incoming.generation && incoming.request === revision) incoming.media.pause();
        return;
      }
      const outgoing = activeDeck;
      activeDeck = incoming; currentTrack = track;
      // Shared cues retain position; different cues overlap without a silent gap.
      ramp(incoming, MUSIC_CUES[cue].gain, outgoing === incoming ? .18 : FADE_SECONDS);
      if (outgoing && outgoing !== incoming) {
        ramp(outgoing, 0, FADE_SECONDS);
        const outgoingGeneration = outgoing.generation;
        outgoing.timer = setTimeout(() => {
          if (outgoing !== activeDeck && outgoing.generation === outgoingGeneration) outgoing.media.pause();
          outgoing.timer = null;
        }, (FADE_SECONDS + .08) * 1000);
      }
    } catch (error) { if (error?.name !== 'AbortError' && revision === musicRevision) unavailable(); }
  }

  async function setMusic(enabled) {
    music = enabled;
    if (music) await startMusic();
    else { musicRevision++; pauseDecks(); }
  }

  return {
    unlock, play,
    setScene({ biome = 'hollow', boss = false, title = false } = {}) {
      const next = title ? 'dungeon' : boss ? 'fight' : biome in MUSIC_SCENES ? biome : 'dungeon';
      const cue = title ? 'whispers' : MUSIC_SCENES[next];
      if (next === desiredTrack && cue === desiredCue) return;
      desiredTrack = next; desiredCue = cue;
      void startMusic();
    },
    async configure(settings) { sfx = !!settings.sfx; if (sfx || settings.music) await unlock(); await setMusic(!!settings.music); },
    suspend() { suspended = true; musicRevision++; pauseDecks(); context?.suspend().catch(() => {}); },
    async resume() { suspended = false; if (sfx || music) await unlock(); if (music) await setMusic(true); },
    status() {
      return {
        enabled: music || sfx, music, sfx, effectsReady: loaded, context: context?.state || 'idle',
        musicPlaying: decks.some(deck => !deck.media.paused) && context?.state === 'running' && !suspended,
        track: currentTrack, desiredTrack, cue: activeDeck?.cue || null, desiredCue,
        position: activeDeck ? +activeDeck.media.currentTime.toFixed(3) : 0,
        recording: activeDeck ? MUSIC_CUES[activeDeck.cue].title : null,
        activeMusicPlayers: decks.filter(deck => !deck.media.paused).length,
        source: 'Juhani Junkala CC0 original music / Ninja Adventure original sound effects',
      };
    },
  };
}
