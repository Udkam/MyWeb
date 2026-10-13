import { restoreRun, WEAPONS } from './engine.js';

export const SAVE_KEY = 'cinder-below-v1';
export const MAX_SAVE_BYTES = 200_000;
const MAX_COUNTER = 1_000_000_000;
const MAX_REVISION = 1_000_000_000_000;
const STAT_KEYS = ['runs', 'wins', 'kills', 'rooms', 'embers', 'bestRoom'];
const BANK_KEYS = ['kills', 'rooms', 'embers'];
const SETTING_KEYS = ['music', 'sfx', 'reduceMotion'];
const ROOT_KEYS = ['version', 'revision', 'stats', 'settings', 'checkpoint', 'banked', 'unlocks'];
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const clone = value => JSON.parse(JSON.stringify(value));

export function createDefaultSave() {
  return {
    version: 1,
    revision: 0,
    stats: { runs: 0, wins: 0, kills: 0, rooms: 0, embers: 0, bestRoom: 0 },
    settings: { music: true, sfx: true, reduceMotion: false },
    checkpoint: null,
    banked: { kills: 0, rooms: 0, embers: 0 },
    unlocks: ['cinder'],
  };
}

function inspectJSON(value, depth = 0, seen = new Set(), budget = { nodes: 0 }) {
  if (++budget.nodes > 10_000 || depth > 12) throw new Error('The save structure is too large.');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('The save contains an invalid number.');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 10_000) throw new Error('The save contains too much text.');
    return;
  }
  if (typeof value !== 'object' || seen.has(value)) throw new Error('The save is not valid JSON data.');
  const proto = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (proto !== Array.prototype || value.length > 256) throw new Error('The save contains an invalid list.');
  } else if (proto !== Object.prototype && proto !== null) throw new Error('The save contains an invalid object.');
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string' || FORBIDDEN.has(key)) throw new Error('The save contains an invalid field.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('The save contains an invalid field.');
    inspectJSON(descriptor.value, depth + 1, seen, budget);
  }
  seen.delete(value);
}

function objectKeys(value, allowed, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) throw new Error('Save fields are missing or unrecognized.');
}

function integer(value, max = MAX_COUNTER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function normalize(data) {
  inspectJSON(data);
  objectKeys(data, ROOT_KEYS, ['version', 'revision', 'stats', 'settings', 'checkpoint']);
  if (data.version !== 1) throw new Error('This save version is not supported.');
  if (!integer(data.revision, MAX_REVISION)) throw new Error('The save revision is invalid.');
  objectKeys(data.stats, STAT_KEYS);
  if (STAT_KEYS.some(key => !integer(data.stats[key], key === 'bestRoom' ? 8 : MAX_COUNTER)) || data.stats.wins > data.stats.runs) throw new Error('Lifetime progress is invalid.');
  objectKeys(data.settings, SETTING_KEYS);
  if (SETTING_KEYS.some(key => typeof data.settings[key] !== 'boolean')) throw new Error('The saved settings are invalid.');
  const banked = data.banked === undefined ? { kills: 0, rooms: 0, embers: 0 } : data.banked;
  objectKeys(banked, BANK_KEYS);
  if (BANK_KEYS.some(key => !integer(banked[key]) || banked[key] > data.stats[key])) throw new Error('The credited progress for this run is invalid.');
  if (data.checkpoint !== null && !restoreRun(data.checkpoint)) throw new Error('The room checkpoint is invalid and cannot be resumed.');
  if (data.unlocks !== undefined && (!Array.isArray(data.unlocks) || new Set(data.unlocks).size !== data.unlocks.length || data.unlocks.some(id => !WEAPONS.some(weapon => weapon.id === id)))) throw new Error('The weapon record is invalid.');
  const result = {
    version: 1,
    revision: data.revision,
    stats: clone(data.stats),
    settings: clone(data.settings),
    checkpoint: data.checkpoint === null ? null : clone(data.checkpoint),
    banked: clone(banked),
    // Unlocks are derived from progress, never an independent source of truth.
    unlocks: WEAPONS.filter(weapon => data.stats.rooms >= weapon.unlockRooms).map(weapon => weapon.id),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_SAVE_BYTES) throw new Error('The save file is too large.');
  return result;
}

export function parseImport(text) {
  try {
    if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES) throw new Error('The save file is too large or has an invalid format.');
    return { data: normalize(JSON.parse(text)), error: null };
  } catch (error) {
    return { data: null, error: error instanceof SyntaxError ? 'This JSON save could not be read. Select the original exported file.' : error.message || 'The save is invalid.' };
  }
}

export function exportSave(data) {
  return JSON.stringify(normalize(data), null, 2);
}

export function loadSave(storage) {
  let raw;
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    raw = target.getItem(SAVE_KEY);
  } catch {
    return { data: createDefaultSave(), status: 'unavailable', message: 'This browser has blocked local saves. Export this page’s progress before leaving.', raw: undefined };
  }
  if (raw === null) return { data: createDefaultSave(), status: 'empty', message: '', raw: null };
  const result = parseImport(raw);
  if (result.error) return { data: createDefaultSave(), status: 'corrupt', message: 'The existing save could not be read and has been preserved. Import a backup to recover.', raw };
  return { data: result.data, status: 'ready', message: '', raw };
}

/** Call inside the app's Web Lock. A synchronous localStorage CAS alone cannot
 * make cross-tab read/write atomic. Replacement requires an exact raw snapshot
 * captured before the user's explicit confirmation, including null if empty. */
export function saveSave(data, storage, options = {}) {
  let next;
  try { next = normalize(data); }
  catch (error) { return { ok: false, status: 'invalid', message: error.message || 'The save is invalid.' }; }
  let target, currentRaw;
  try {
    target = storage === undefined ? globalThis.localStorage : storage;
    currentRaw = target.getItem(SAVE_KEY);
  } catch { return { ok: false, status: 'unavailable', message: 'The local save could not be read. Export this page’s progress.' }; }
  const current = currentRaw === null ? null : parseImport(currentRaw);
  if (options.replace === true) {
    if (!Object.hasOwn(options, 'expectedRaw') || currentRaw !== options.expectedRaw) return { ok: false, status: 'conflict', message: 'Another tab changed the save during confirmation. Reload before importing.' };
    next.revision = Math.max(next.revision, current?.data?.revision ?? 0);
  } else {
    if (current?.error) return { ok: false, status: 'corrupt', message: 'The existing save could not be read. Automatic overwrite was blocked. Import a backup to recover.' };
    if (next.revision !== (current?.data?.revision ?? 0)) return { ok: false, status: 'conflict', message: 'Another tab updated the save. Export this page’s progress, then reload.' };
  }
  if (next.revision >= MAX_REVISION) return { ok: false, status: 'invalid', message: 'The save revision has reached its limit.' };
  next.revision++;
  const raw = JSON.stringify(next);
  try { target.setItem(SAVE_KEY, raw); }
  catch { return { ok: false, status: 'unavailable', message: 'Local saving failed. This page’s progress is still in memory; export it before leaving.' }; }
  return { ok: true, status: 'saved', message: '', data: next, raw };
}
