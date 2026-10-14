import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, enterRoom, interact, nearestInteractable } from '../src/engine.js';
import { discoveryInfo, focusedDiscovery } from '../src/discovery.js';
import { setLanguage } from '../src/i18n.js';
function room(seed) {
  const s = createRun({ seed }); s.phase = 'exit'; s.stats.embers = 30;
  s.player.hp = 3; s.player.novaCharge = 5; enterRoom(s, 'refuge');
  return s;
}
function approach(s, item) { s.player.x = item.x; s.player.y = item.y + 30; }

test('discovery focus agrees with actual interaction range, then removes rescued traveler without mutating the run', () => {
  setLanguage('zh-CN');
  const s = room(2), traveler = s.interactables.find(i => i.kind === 'traveler');
  approach(s, traveler);
  const before = JSON.stringify(s);
  assert.equal(focusedDiscovery(s).item.id, nearestInteractable(s).id);
  const info = discoveryInfo(s, traveler);
  assert.ok(info.available && info.inRange);
  assert.match(info.detail, /下一房/);
  assert.equal(JSON.stringify(s), before);
  assert.ok(interact(s, traveler.id).ok);
  assert.notEqual(focusedDiscovery(s)?.item.id, traveler.id);
  assert.match(discoveryInfo(s, traveler).detail, /第 3 房/);
});

test('lamp instructions follow real partial progress and reset, while completed lamps leave the focus', () => {
  setLanguage('zh-CN');
  const s = room(3), lamps = s.interactables.filter(i => i.kind === 'lamp').sort((a,b)=>a.order-b.order);
  approach(s, lamps[0]); interact(s, lamps[0].id);
  assert.match(discoveryInfo(s, lamps[1]).detail, /1\/3/);
  approach(s, lamps[2]); interact(s, lamps[2].id);
  assert.match(discoveryInfo(s, lamps[0]).detail, /0\/3/);
  for (const lamp of lamps) { approach(s, lamp); interact(s, lamp.id); }
  assert.ok(lamps.every(lamp => discoveryInfo(s,lamp).complete));
  assert.notEqual(focusedDiscovery(s)?.item.kind, 'lamp');
  s.phase = 'reward'; assert.equal(focusedDiscovery(s), null);
});

test('shrine uses spendable wallet and both language versions keep costs and real outcomes consistent', () => {
  const s = room(1), shrine = s.interactables.find(i => i.kind === 'offering');
  s.adventure.spent = 25; setLanguage('zh-CN');
  assert.match(discoveryInfo(s,shrine).detail, /还差 5/);
  s.adventure.spent = 0; approach(s,shrine);
  assert.match(discoveryInfo(s,shrine).detail, /10/);
  const hp=s.player.hp,nova=s.player.novaCharge;
  s.player.hp=s.player.maxHp;s.player.novaCharge=100;
  assert.equal(discoveryInfo(s,shrine).action,'无需供奉');
  assert.match(discoveryInfo(s,shrine).detail,/不消耗/);
  assert.equal(interact(s,shrine.id).reason,'already-restored');
  assert.equal(s.adventure.spent,0);
  s.player.hp=hp;s.player.novaCharge=nova;
  setLanguage('en');
  assert.equal(discoveryInfo(s,shrine).action, 'Offer 10 embers');
  interact(s,shrine.id);
  assert.equal(discoveryInfo(s,shrine).statusLabel, 'Completed');
  assert.equal(focusedDiscovery(s), null);
  setLanguage('zh-CN');
});

test('sealed walls describe actual remaining hits and never advertise an interaction button', () => {
  const s = room(2), wall = s.interactables.find(i => i.kind === 'cracked-wall');
  approach(s,wall);
  for (let hits=0; hits<3; hits++) {
    wall.hits=hits; const info=discoveryInfo(s,wall);
    assert.equal(info.available,false);
    assert.match(info.detail,new RegExp(String(3-hits)));
    assert.equal(info.action,'射击裂纹');
  }
});
