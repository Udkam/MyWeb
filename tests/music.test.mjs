import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MUSIC_CUES, MUSIC_SCENES } from '../src/audio.js';

const manifest = JSON.parse(readFileSync(new URL('../src/assets/music-manifest.json', import.meta.url), 'utf8'));

test('every published score is an attributed CC0 recording with verified bytes', () => {
  assert.equal(manifest.tracks.length, 4);
  for (const row of manifest.tracks) {
    assert.equal(row.license, 'CC0-1.0');
    assert.equal(row.author, 'Juhani Junkala (SubspaceAudio)');
    assert.match(row.sourcePage, /^https:\/\/opengameart.org\/content\//);
    const bytes = readFileSync(new URL(`../src/assets/${row.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    assert.equal(bytes.length, row.bytes);
    assert.equal(MUSIC_CUES[row.id].file, row.file);
    assert.equal(MUSIC_CUES[row.id].gain, row.playbackGain);
  }
});

test('three original OGG files are unchanged; the boss conversion is disclosed', () => {
  for (const row of manifest.tracks) {
    if (row.id !== 'boss') assert.equal(row.sha256, row.originalSha256);
    else { assert.notEqual(row.sha256, row.originalSha256); assert.match(row.processing, /3 ms/); }
    assert.ok(row.durationSeconds > 80 && row.durationSeconds < 130);
    assert.equal(row.humanListeningVerified, false);
  }
});

test('seven scene keys share a coherent four-cue palette', () => {
  assert.deepEqual(Object.keys(MUSIC_SCENES).sort(), ['cinder', 'dungeon', 'fight', 'mire', 'rift', 'storm', 'void']);
  assert.equal(MUSIC_SCENES.dungeon, MUSIC_SCENES.mire);
  assert.equal(MUSIC_SCENES.cinder, MUSIC_SCENES.storm);
  assert.equal(MUSIC_SCENES.void, MUSIC_SCENES.rift);
  assert.equal(MUSIC_SCENES.fight, 'boss');
  for (const cue of Object.values(MUSIC_SCENES)) assert.ok(MUSIC_CUES[cue]);
});

test('measured gain staging gives bosses intensity without an original-volume blast', () => {
  const level = row => row.measuredOriginalLufs + 20 * Math.log10(row.playbackGain);
  const ordinary = manifest.tracks.filter(row => row.id !== 'boss').map(level);
  assert.ok(Math.max(...ordinary) - Math.min(...ordinary) < .2);
  assert.ok(ordinary.every(lufs => Math.abs(lufs + 22) < .15));
  const boss = level(manifest.tracks.find(row => row.id === 'boss'));
  assert.ok(boss > -19.1 && boss < -18.9);
  assert.ok(boss - Math.max(...ordinary) < 3.2);
});
