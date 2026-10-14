import { t } from './i18n.js';

/** A shared presentation of real room objects. Reading this never changes a run. */
export function discoveryInfo(state, item) {
  const distance = Math.hypot(item.x - state.player.x, item.y - state.player.y);
  const complete = item.status === 'done';
  const inRange = distance <= (item.r || 18) + state.player.r + 30;
  const active = ['combat', 'exit'].includes(state.phase);
  const info = { title: '', action: '', detail: '', statusLabel: '', tone: 'gold', complete,
    available: active && item.status === 'ready', inRange, near: distance <= 155, marker: complete ? '✓' : '!' };
  if (item.kind === 'traveler') {
    info.title = t('Stranded traveler'); info.action = t('Rescue traveler'); info.tone = 'mint';
    info.detail = t('Escort through the next room · +8 embers, +1 heart');
    if (['following', 'rescued'].includes(item.status)) {
      info.statusLabel = t('Rescued'); info.marker = '✓';
      info.detail = t('Escort: clear room {room}', { room: state.adventure?.escort?.dueRoom || state.room + 1 });
    }
  } else if (item.kind === 'lamp') {
    info.title = t('Sequence lamp {number}', { number: item.order });
    info.action = t('Light lamp {number}', { number: item.order });
    info.detail = t('Light 1 → 2 → 3 · {count}/3 lit', { count: item.progress || 0 });
    info.marker = complete ? '✓' : String(item.order);
    if (item.status === 'lit') info.statusLabel = t('Lit');
    if (complete) info.detail = t('Puzzle complete · +6 embers, +25 nova');
  } else if (item.kind === 'offering') {
    info.title = t('Ember shrine'); info.action = t('Offer 10 embers');
    const wallet = Math.max(0, state.stats.embers - (state.adventure?.spent || 0));
    info.detail = wallet < 10 ? t('Need {count} more embers', { count: 10 - wallet }) : t('Recover up to 2 hearts + fill nova · costs 10 embers');
    if (state.player.hp >= state.player.maxHp && state.player.novaCharge >= 100) {
      info.action = t('No offering needed');
      info.detail = t('Hearts and nova full · no embers spent');
    }
    if (complete) info.detail = t('Offering accepted');
  } else if (item.kind === 'cracked-wall') {
    info.title = t('Cracked masonry'); info.action = t('Shoot the crack'); info.available = false; info.marker = '?';
    info.detail = t('{count} more hits to break it open', { count: Math.max(0, 3 - (item.hits || 0)) });
  } else if (item.kind === 'chest') {
    info.title = t('Hidden cache'); info.action = t('Open hidden chest'); info.detail = t('Take 12 embers');
  } else if (item.kind === 'ghost') {
    info.title = t('Lost spirit'); info.action = t('Greet the lost spirit'); info.tone = 'violet'; info.marker = complete ? '✓' : '✦';
    info.detail = t('Untouched-room gift · +8 embers, +1 heart');
  }
  if (complete) info.statusLabel = t('Completed');
  return info;
}

export function focusedDiscovery(state) {
  if (!state || !['combat', 'exit'].includes(state.phase)) return null;
  return (state.interactables || []).filter(item => !['done', 'rescued', 'following'].includes(item.status))
    .map(item => ({ item, info: discoveryInfo(state, item), distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) }))
    .sort((a, b) => Number(b.info.available && b.info.inRange) - Number(a.info.available && a.info.inRange)
      || Number(b.item.status === 'ready') - Number(a.item.status === 'ready') || a.distance - b.distance)[0] || null;
}
