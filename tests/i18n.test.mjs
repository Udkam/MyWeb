import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WEAPONS, RELICS, createRun, snapshot } from '../src/engine.js';
import { SAVE_KEY, createDefaultSave, exportSave, parseImport } from '../src/storage.js';

const LANGUAGE_KEY = 'cinder-below-language';
let serial = 0;
function memoryStorage(entries = []) {
  const values = new Map(entries);
  const writes = [];
  return { values, writes, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); values.set(key, value); } };
}
async function withModule(storage, callback, options = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const definition = options.throwOnAccess
    ? { configurable: true, get() { throw new Error('Storage access blocked'); } }
    : { configurable: true, value: storage };
  Object.defineProperty(globalThis, 'localStorage', definition);
  try {
    const i18n = await import(`../src/i18n.js?test=${++serial}`);
    return await callback(i18n);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
}

test('default is Chinese, independent of browser language, and opening does not write storage', async () => {
  const storage = memoryStorage();
  await withModule(storage, ({ getLanguage, t }) => {
    assert.equal(getLanguage(), 'zh-CN');
    assert.equal(t('Music'), '音乐');
    assert.deepEqual(storage.writes, []);
  });
  for (const invalid of ['fr', 'zh', '', 'EN', 'null', '{}']) {
    await withModule(memoryStorage([[LANGUAGE_KEY, invalid]]), ({ getLanguage }) => assert.equal(getLanguage(), 'zh-CN'));
  }
});

test('only the dedicated language preference is written, and valid choices survive module reload', async () => {
  const gameSave = '{"version":1,"unchanged":true}';
  const storage = memoryStorage([[SAVE_KEY, gameSave]]);
  await withModule(storage, ({ setLanguage, getLanguage, t }) => {
    assert.equal(setLanguage('en'), 'en');
    assert.equal(getLanguage(), 'en');
    assert.equal(t('Music'), 'Music');
    for (const invalid of ['EN', 'zh', '', null, undefined, {}, 1]) assert.equal(setLanguage(invalid), 'en');
    assert.deepEqual(storage.writes, [[LANGUAGE_KEY, 'en']]);
    assert.equal(storage.values.get(SAVE_KEY), gameSave);
  });
  await withModule(storage, ({ getLanguage, setLanguage }) => {
    assert.equal(getLanguage(), 'en');
    assert.equal(setLanguage('zh-CN'), 'zh-CN');
  });
  await withModule(storage, ({ getLanguage }) => assert.equal(getLanguage(), 'zh-CN'));
});

test('missing storage, blocked getters and failed reads/writes never prevent in-memory language switching', async () => {
  const callback = ({ getLanguage, setLanguage, t }) => {
    assert.equal(getLanguage(), 'zh-CN');
    assert.equal(setLanguage('en'), 'en');
    assert.equal(t('Music'), 'Music');
    assert.equal(setLanguage('zh-CN'), 'zh-CN');
    assert.equal(t('Music'), '音乐');
  };
  await withModule(undefined, callback);
  await withModule(undefined, callback, { throwOnAccess: true });
  await withModule({ getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } }, callback);
  await withModule({ getItem() { return 'en'; }, setItem() { throw new Error('Quota'); } }, ({ getLanguage, setLanguage }) => {
    assert.equal(getLanguage(), 'en');
    assert.equal(setLanguage('zh-CN'), 'zh-CN');
  });
});

test('template substitution works in both languages without replacing absent or inherited values', async () => {
  await withModule(memoryStorage(), ({ t, setLanguage }) => {
    assert.equal(t('LEVEL {level}', { level: 0 }), '0 级');
    assert.equal(t('LEVEL {level}'), '{level} 级');
    assert.equal(t('LEVEL {level}', Object.create({ level: 3 })), '{level} 级');
    assert.equal(t('{name}: clear {rooms} rooms across any number of runs to unlock.', { name: '$& <b>', rooms: 4 }), '$& <b>：跨局累计清空 4 个房间后解锁。');
    assert.equal(t('constructor'), 'constructor');
    assert.equal(t('Unknown {value}', { value: 2 }), 'Unknown 2');
    assert.equal(t('Unknown {value}', null), 'Unknown {value}');
    setLanguage('en');
    assert.equal(t('LEVEL {level}', { level: 3 }), 'LEVEL 3');
    assert.equal(t('Victory. {rooms} rooms cleared.', { rooms: 8 }), 'Victory. 8 rooms cleared.');
  });
});

test('all three weapons and twelve relics localize every display field while preserving source objects and IDs', async () => {
  const originals = JSON.stringify({ WEAPONS, RELICS });
  assert.equal(WEAPONS.length, 3);
  assert.equal(RELICS.length, 12);
  await withModule(memoryStorage(), ({ localizeWeapon, localizeRelic, setLanguage }) => {
    for (const [items, localize] of [[WEAPONS, localizeWeapon], [RELICS, localizeRelic]]) {
      for (const original of items) {
        const translated = localize(original);
        assert.notEqual(translated, original);
        assert.equal(translated.id, original.id);
        for (const key of Object.keys(original)) {
          if (['name', 'description', 'tag'].includes(key)) {
            assert.notEqual(translated[key], original[key], `${original.id}.${key}`);
            assert.match(translated[key], /\p{Script=Han}/u);
          } else assert.deepEqual(translated[key], original[key]);
        }
      }
    }
    assert.equal(JSON.stringify({ WEAPONS, RELICS }), originals);
    setLanguage('en');
    WEAPONS.forEach((item) => { assert.deepEqual(localizeWeapon(item), item); assert.notEqual(localizeWeapon(item), item); });
    RELICS.forEach((item) => assert.deepEqual(localizeRelic(item), item));
  });
});

test('language switching and localized item copies do not change an existing valid game backup', async () => {
  const save = createDefaultSave();
  save.stats.runs = 2; save.stats.rooms = 12;
  save.checkpoint = snapshot(createRun({ seed: 42, weapon: 'needle' }));
  const backup = exportSave(save);
  const storage = memoryStorage([[SAVE_KEY, backup]]);
  await withModule(storage, ({ setLanguage, localizeWeapon, localizeRelic }) => {
    for (const language of ['zh-CN', 'en', 'zh-CN']) {
      setLanguage(language); WEAPONS.map(localizeWeapon); RELICS.map(localizeRelic);
    }
    assert.equal(storage.values.get(SAVE_KEY), backup);
    assert.equal(exportSave(save), backup);
    const imported = parseImport(backup);
    assert.equal(imported.error, null);
    assert.equal(imported.data.checkpoint.weapon, 'needle');
    assert.deepEqual(imported.data.unlocks, ['cinder', 'scatter', 'needle']);
  });
});

function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  return literal.slice(1, -1).replace(/\\(['\\])/g, '$1').replace(/\\n/g, '\n');
}
function stringLiterals(source) {
  return [...source.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)].map((match) => decodeLiteral(match[0]));
}
function translationCallKeys(source) {
  const keys = [];
  for (const match of source.matchAll(/\bt\s*\(/g)) {
    let depth = 0, index = match.index + match[0].length, expression = '';
    for (; index < source.length; index++) {
      const char = source[index];
      if (char === '"' || char === "'") {
        const start = index, quote = char;
        while (++index < source.length) {
          if (source[index] === '\\') index++;
          else if (source[index] === quote) break;
        }
        expression += source.slice(start, index + 1); continue;
      }
      if (char === '(') depth++;
      if (char === ')') { if (!depth) break; depth--; }
      if (char === ',' && !depth) break;
      expression += char;
    }
    for (const literal of expression.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)) {
      // A ternary condition can contain machine IDs; only its value branches are UI keys.
      const before = expression.slice(0, literal.index).trimEnd();
      if (!before || /[?:]$/.test(before)) keys.push(decodeLiteral(literal[0]));
    }
  }
  return keys;
}
const readSource = (file) => readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('all current HTML translation attributes and literal app/renderer translation calls have Chinese entries', async () => {
  const [html, app, renderer, discovery] = await Promise.all(['index.html', 'app.js', 'renderer.js', 'discovery.js'].map(readSource));
  const htmlKeys = [...html.matchAll(/data-i18n(?:-aria-label|-title|-content)?="([^"]*)"/g)].map((match) => match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  const keys = new Set([...htmlKeys, ...translationCallKeys(app), ...translationCallKeys(renderer), ...translationCallKeys(discovery)]);
  assert.ok(htmlKeys.length >= 45, 'The real HTML attributes must be inspected');
  assert.ok(keys.size >= 90, 'The real app translation calls must be inspected');
  await withModule(memoryStorage(), ({ t, setLanguage }) => {
    const missing = [...keys].filter((key) => t(key) === key && /[A-Za-z]/.test(key));
    assert.deepEqual(missing, [], 'Untranslated declared UI keys');
    setLanguage('en');
    for (const key of keys) assert.equal(t(key), key);
  });
});

test('all storage validation messages and concatenated recovery warnings are translated', async () => {
  const messages = [...new Set(stringLiterals(await readSource('storage.js')).filter((text) => /^[A-Z]/.test(text) && /\.$/.test(text)))];
  assert.ok(messages.length >= 27, 'All current storage warnings are inspected');
  await withModule(memoryStorage(), ({ translateMessage, setLanguage }) => {
    for (const message of messages) {
      assert.notEqual(translateMessage(message), message, message);
      assert.match(translateMessage(message), /\p{Script=Han}/u);
    }
    const sentence = 'The save contains an invalid field.';
    assert.equal(translateMessage(`Import failed: ${sentence} Open settings to export a backup.`), '导入失败：存档字段无效。 可在设置中导出备份。');
    assert.equal(translateMessage('Save failed: The save revision is invalid.'), '保存失败：存档修订号无效。');
    assert.equal(translateMessage('Unknown diagnostic: ABC-123'), 'Unknown diagnostic: ABC-123');
    assert.equal(translateMessage(''), '');
    setLanguage('en');
    for (const message of messages) assert.equal(translateMessage(message), message);
    assert.equal(translateMessage(`Import failed: ${sentence}`), `Import failed: ${sentence}`);
  });
});

test('control-array labels, raw app notifications and engine human-readable goals are translated', async () => {
  const app = await readSource('app.js');
  const keys = [...app.matchAll(/(?:\btoast\s*\(|\bannounce\s*\(|\bsaveMessage\s*=)\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g)].map((match) => decodeLiteral(match[1])).filter(Boolean);
  keys.push('MOUSE + HOLD CLICK', 'ARROW KEYS', 'SPACE / RIGHT CLICK', 'Move', 'Aim and fire', 'Keyboard aim and fire', 'Dash through danger', 'Nova: damage + clear bullets', 'Pause · fullscreen · audio', 'Interact with nearby objects');
  keys.push('Hunt · More foes and embers', 'Refuge · Heal one heart', 'World coordinates; origin top-left; x right, y down. Aim uses absolute world position.', 'Defeat every enemy. Avoid attack warnings; use dash and charged nova.', 'Choose one relic.', 'Walk into Hunt or Refuge.', 'The Cinder Warden is defeated. All eight rooms are cleared.', 'This run is over. Start a new descent.');
  await withModule(memoryStorage(), ({ t }) => assert.deepEqual([...new Set(keys)].filter((key) => t(key) === key), []));
});

test('adventure interactions and six layout titles retain variables in both languages', async () => {
  const layouts = ['PILLAR COURT', 'SIDE CLOISTERS', 'CROSSROADS', 'BROKEN HALL', 'ALTAR RING', 'TWIN HALLS'];
  await withModule(memoryStorage(), ({ t, setLanguage }) => {
    for (const layout of layouts) assert.match(t(layout), /\p{Script=Han}/u);
    assert.equal(t('Light lamp {number}', { number: 3 }), '点亮第 3 盏灯');
    assert.equal(t('Traveler: clear room {room}', { room: 5 }), '旅人同行：清空第 5 室');
    assert.equal(t('{layout} · {room}', { layout: t('TWIN HALLS'), room: '02' }), '双厅 · 第 02 室');
    setLanguage('en');
    for (const layout of layouts) assert.equal(t(layout), layout);
    assert.equal(t('Light lamp {number}', { number: 3 }), 'Light lamp 3');
    assert.equal(t('Traveler: clear room {room}', { room: 5 }), 'Traveler: clear room 5');
    assert.equal(t('{layout} · {room}', { layout: t('TWIN HALLS'), room: '02' }), 'TWIN HALLS · 02');
  });
});

class FakeElement {
  constructor(attributes = {}, children = []) { this.attributes = new Map(Object.entries(attributes)); this.children = children; this.textContent = ''; }
  hasAttribute(key) { return this.attributes.has(key); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  matches() { return [...this.attributes.keys()].some((key) => ['data-i18n', 'data-i18n-aria-label', 'data-i18n-title', 'data-i18n-content'].includes(key)); }
  querySelectorAll() { return this.children.flatMap((child) => [...(child.matches() ? [child] : []), ...child.querySelectorAll()]); }
}

test('applyTranslations updates root, descendants and all three attributes using textContent, then restores English', async () => {
  const label = new FakeElement({ 'data-i18n': 'Music' });
  const button = new FakeElement({ 'data-i18n-aria-label': 'Enable audio', 'data-i18n-title': 'Audio' });
  const meta = new FakeElement({ 'data-i18n-content': 'Loading the dungeon.' });
  const root = new FakeElement({ 'data-i18n-aria-label': 'Cinder Below game' }, [label, new FakeElement({}, [button, meta])]);
  await withModule(memoryStorage(), ({ applyTranslations, setLanguage }) => {
    assert.equal(applyTranslations(root), 5);
    assert.equal(label.textContent, '音乐');
    assert.equal(button.getAttribute('aria-label'), '开启声音');
    assert.equal(button.getAttribute('title'), '声音');
    assert.equal(meta.getAttribute('content'), '正在加载地牢。');
    assert.equal(root.getAttribute('aria-label'), 'Cinder Below 游戏');
    assert.equal(label.getAttribute('data-i18n'), 'Music');
    setLanguage('en');
    assert.equal(applyTranslations(root), 5);
    assert.equal(label.textContent, 'Music');
    assert.equal(button.getAttribute('aria-label'), 'Enable audio');
    assert.equal(meta.getAttribute('content'), 'Loading the dungeon.');
    assert.equal(applyTranslations(null), 0);
    assert.equal(applyTranslations(), 0);
  });
});
