/** Plays only the credited downloaded recordings. No oscillators or synthesized effects. */
export function createAudio(onUnavailable = () => {}) {
  let context, master, music = false, sfx = false, loaded = false, pending;
  let bg, warned = false, activeVoices = 0, lastShot = 0;
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
  async function setMusic(enabled) {
    music = enabled;
    if (!bg) { bg = new Audio('./assets/music-fight.ogg'); bg.loop = true; bg.volume = .22; bg.preload = 'none'; }
    if (music) { try { await bg.play(); } catch { if (!warned) { onUnavailable(); warned = true; } } } else bg.pause();
  }
  return {
    unlock, play,
    async configure(settings) { sfx = !!settings.sfx; if (sfx || settings.music) await unlock(); await setMusic(!!settings.music); },
    suspend() { bg?.pause(); context?.suspend().catch(() => {}); },
    async resume() { if (sfx || music) await unlock(); if (music) await setMusic(true); },
    status() { return { enabled: music || sfx, music, sfx, effectsReady: loaded, context: context?.state || 'idle', musicPlaying: !!bg && !bg.paused, source: 'Ninja Adventure original recordings' }; },
  };
}
