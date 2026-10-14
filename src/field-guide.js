import { getLanguage } from './i18n.js';

// Player-facing counterplay lives beside both translations; IDs remain language-neutral.
const entries = [
  ['slime', '黏液追猎者', 'Slime', '持续追赶并近身碰撞，绕障碍拉开距离。', 'Chases into contact. Use cover to make space.'],
  ['shooter', '散弹骷髅', 'Bone Gunner', '保持距离后射出扇形散弹，从弹隙穿过。', 'Keeps its distance and fires a spread. Slip between the shots.'],
  ['charger', '撞角兽', 'Ram', '蓄力后沿锁定方向冲锋，横向闪避。', 'Locks a direction before charging. Dodge sideways.'],
  ['caster', '环咒巫师', 'Ring Caster', '横向游走并释放环形弹幕，距离越远弹隙越大。', 'Strafes and releases a ring. Gaps widen at a distance.'],
  ['sniper', '赤眼狙击手', 'Red-eye Sniper', '短暂瞄准后打出高速单发，观察自身闪光。', 'Flashes while locking a fast aimed shot. Move after the lock.'],
  ['orbiter', '巡游灯笼', 'Orbit Lantern', '绕着你移动，连续三轮扇射，别停在原地。', 'Circles you with three successive spreads. Keep moving.'],
  ['brood', '育巢蛛', 'Brood Spider', '死亡会分裂出两只幼体，击杀后仍要留出空间。', 'Splits into two larvae on death. Leave room for the hatch.'],
  ['meteor', '坠星术士', 'Star Caller', '在你刚才的位置召唤落石，离开落点圆。', 'Calls a falling rock at your old position. Leave its impact circle.'],
  ['weaver', '织弹蛇', 'Weaver', '子弹沿波浪轨迹前进，注意弯曲后的路线。', 'Shots weave through the air. Watch the curve, not just the launch.'],
  ['bomber', '爆燃菌', 'Fusecap', '靠近后点燃自身，趁引信燃烧迅速撤开。', 'Lights a short fuse at close range. Retreat before it bursts.'],
  ['trapper', '布雷竹妖', 'Trap Stalker', '移动时留下实体地雷，避开地上的雷体。', 'Leaves physical mines as it moves. Step around them.'],
  ['summoner', '召唤幼龙', 'Brood Caller', '召出有限数量的支援怪，优先处理可减少围攻。', 'Calls a limited escort. Prioritize it to reduce pressure.'],
  ['leech', '噬能触手', 'Ember Leech', '近距离蓄力吸取星爆能量，受击可打断。', 'Channels nearby to drain Nova charge. Hit it to interrupt.'],
  ['shieldbearer', '盾壳卫兵', 'Shell Guard', '正面有硬壳防护，绕到背后射击。', 'Its shell guards the front. Get behind it to deal full damage.'],
  ['prism', '棱镜独眼', 'Prism Eye', '旋转十字弹会反弹一次，小心回弹。', 'Fires a rotating cross that bounces once. Watch the return.'],
  ['boomerang', '回刃蜥', 'Blade Skink', '投出的回旋弹还会返回，不要追着弹尾走。', 'Thrown blades turn back. Do not follow their tail.'],
  ['burrower', '掘地伏兵', 'Burrower', '潜入地下后从先前锁定的位置出现，保持移动。', 'Dives underground and emerges at a locked position. Keep moving.'],
  ['medic', '缝魂者', 'Soul Mender', '治疗附近受伤的怪物，先切断治疗。', 'Heals wounded allies nearby. Stop the healing first.'],
  ['frost', '霜鳃兽', 'Frost Gill', '冰弹命中会短暂减速，留着冲刺脱身。', 'Frost shots briefly slow you. Save a dash to escape.'],
  ['duelist', '双刺猎兽', 'Duelist', '侧闪接连刺两次，第一刺后不要立即回身。', 'Sidesteps into two lunges. Expect the second strike.'],
  ['sentinel', '门卫', 'The Gatekeeper', '十字扫射后立刻追击；等身体蓄力锁定再横闪，半血后准备躲第二冲。', 'Crossfire links into a long pursuit. Dodge after the body locks; expect a second charge below half health.', true],
  ['briar', '荆棘之母', 'Briar Matron', '根墙后接多轮种子扇射，提前留好退路，别在窄路里来回走。', 'Thorn posts lead into successive seed fans. Keep an escape route before the spread arrives.', true],
  ['leviathan', '深潮巨口', 'Leviathan', '远程潮汐弹折返时会接斜向冲浪，半血后还有反向第二冲。', 'Long tidal shots return during a diagonal surge. Below half health a second surge cuts back.', true],
  ['mirror', '镜沼魔像', 'Mirror Ooze', '召出镜像后紧接反弹碎片，半血后会换位；先辨本体再追击。', 'Decoys lead straight into bouncing shards. Below half health it swaps before firing; track the true body.', true],
  ['warden', '灰烬守卫', 'Cinder Warden', '瞬移后落石与旋转弹幕连发，先离落点，再穿弹隙；低血会暴走。', 'Blink, falling rocks and rotating volleys form a combo. Leave the landing circles, then cross the gaps.', true],
  ['kiln', '熔心炉主', 'The Kiln', '会前压喷出长程火扇，喷焰后的开炉时间适合反击；半血后绕到侧边亮核。', 'Advances with long flame fans, then exposes its core. Below half health attack the glowing side.', true],
  ['tempest', '风暴武者', 'Tempest', '落雷后立即绕行射出双螺旋，离开落点后继续观察弯曲弹路。', 'Lightning leads into a moving double spiral. After leaving the circle, watch the curved shots.', true],
  ['eclipse', '蚀日独眼', 'Eclipse', '追踪暗球后接交叉狙击；半血后瞬移会先召回暗球，趁空档换位。', 'Seeking orbs lead into cross snipes. Its low-health blink recalls the orbs; use that break to reposition.', true],
  ['sovereign', '黄金君主', 'Sovereign', '有限精英援军掩护扩散编队，低血改为三向交错射击；先清援军腾出空间。', 'A finite elite escort covers widening formations. Low health adds three-way fire; clear escorts for space.', true],
  ['chronarch', '时隙之灵', 'Chronarch', '时停弹恢复时紧接回溯突袭；看清第二次蓄力，半血后第二刺会横切。', 'Stopped shots release into a rewinding assault. Read the second tell: below half health it cuts sideways.', true],
];

export function fieldGuide() {
  const chinese = getLanguage() === 'zh-CN';
  return entries.map(([id, zhName, enName, zhText, enText, boss = false]) => ({
    id, boss, name: chinese ? zhName : enName, description: chinese ? zhText : enText,
  }));
}
