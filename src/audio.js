/** Plays only the credited downloaded recordings. No oscillators or synthesized effects. */
export function createAudio(onUnavailable = () => {}) {
  let context, master, music = false, sfx = false, loaded = false, pending;
  let bg, bgGain, warned = false, activeVoices = 0, lastShot = 0;
  let suspended = false, musicRevision = 0, desiredTrack = 'dungeon', currentTrack = null;
  // Original recordings have different loudness. Playback gain preserves their bytes.
  const tracks = {
    dungeon: { file: 'music-dungeon.ogg', gain: .70 }, fight: { file: 'music-fight.ogg', gain: .85 },
    mire: { file: 'music-aquatic.ogg', gain: 1 }, cinder: { file: 'music-dark-castle.ogg', gain: .39 },
    storm: { file: 'music-tension.ogg', gain: .60 }, void: { file: 'music-final-area.ogg', gain: .44 },
    rift: { file: 'music-dream.ogg', gain: .86 },
  };
  const buffers = new Map();
  async function unlock() {
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!master) { master = context.createGain(); master.gain.value = .65; master.connect(context.destination); }
      await context.resume();
      if (!pending) pending = Promise.all(['shot', 'dash', 'hit', 'death', 'relic'].map(async (name) => {
        const response = await fetch(`./assets/${name}.wav`); if (!response.ok) throw new Error(`Missing ${name}`);
        buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
      })).then(() => { loaded = true; });
      await pending;
    } catch { if (!warned) { onUnavailable(); warned = true; } }
  }
  function play(name) {
    if (!sfx || !loaded || context?.state !== 'running' || activeVoices >= 10 || !buffers.has(name)) return;
    if (name === 'shot' && context.currentTime - lastShot < .07) return;
    if (name === 'shot') lastShot = context.currentTime;
    const source = context.createBufferSource(), volume = context.createGain();
    source.buffer = buffers.get(name); volume.gain.value = name === 'shot' ? .1 : name === 'hit' ? .25 : .3;
    source.connect(volume); volume.connect(master); activeVoices++;
    source.onended = () => { activeVoices--; source.disconnect(); volume.disconnect(); }; source.start();
  }
  async function startMusic() {
    if (!music || suspended || !context || !master) return;
    if (!bg) {
      bg = new Audio(); bg.loop = true; bg.preload = 'none';
      bgGain = context.createGain(); bgGain.gain.value = 0;
      context.createMediaElementSource(bg).connect(bgGain); bgGain.connect(master);
    }
    const revision = ++musicRevision, next = desiredTrack;
    if (currentTrack !== next) {
      const playing = !bg.paused;
      bgGain.gain.cancelScheduledValues(context.currentTime);
      bgGain.gain.setValueAtTime(bgGain.gain.value, context.currentTime);
      bgGain.gain.linearRampToValueAtTime(0, context.currentTime + .15);
      if (playing) await new Promise(resolve => setTimeout(resolve, 160));
      if (revision !== musicRevision || !music || suspended) return;
      bg.pause(); bg.src = `./assets/${tracks[next].file}`; currentTrack = next;
    }
    try {
      await bg.play();
      if (revision !== musicRevision || !music || suspended) return;
      bgGain.gain.cancelScheduledValues(context.currentTime);
      bgGain.gain.setValueAtTime(0, context.currentTime);
      bgGain.gain.linearRampToValueAtTime(.28 * tracks[next].gain, context.currentTime + .4);
    } catch (error) { if (error?.name !== 'AbortError' && revision === musicRevision && !warned) { onUnavailable(); warned = true; } }
  }
  async function setMusic(enabled) {
    music = enabled;
    if (music) await startMusic();
    else { musicRevision++; bg?.pause(); }
  }
  return {
    unlock, play,
    setScene({ biome = 'hollow', boss = false, title = false } = {}) {
      const next = title ? 'dungeon' : boss ? 'fight' : biome in tracks ? biome : 'dungeon';
      if (next === desiredTrack) return;
      desiredTrack = next;
      void startMusic();
    },
    async configure(settings) { sfx = !!settings.sfx; if (sfx || settings.music) await unlock(); await setMusic(!!settings.music); },
    suspend() { suspended = true; musicRevision++; bg?.pause(); context?.suspend().catch(() => {}); },
    async resume() { suspended = false; if (sfx || music) await unlock(); if (music) await setMusic(true); },
    status() { return { enabled: music || sfx, music, sfx, effectsReady: loaded, context: context?.state || 'idle', musicPlaying: !!bg && !bg.paused && context?.state === 'running', track: currentTrack, desiredTrack, source: 'Ninja Adventure original recordings' }; },
  };
}
