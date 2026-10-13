import * as M from "./model.js";
import {
  TOOLS,
  REGIONS,
  FRIENDS,
  DECOR,
  LETTERS,
  THEMES,
  PLOTS,
} from "./content.js";
import { createScene } from "./scene.js";

const $ = (selector) => document.querySelector(selector);
const find = (items, id) => items.find((item) => item.id === id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const KEY = "mosslight-post-v1";
function sameData(a, b) {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && sameData(a[key], b[key]))
  );
}
let state = M.createState(),
  tab = "home",
  screen = "home",
  letterId = "letter-1";
let selectedDecor = null,
  selectedPlot = null,
  selectedNode = null,
  friendId = null;
let storageOK = true,
  corruptRaw = null,
  scene,
  toastTimer,
  audioReady = false,
  modalReturnFocus;
let busy = false,
  atlas,
  artImages = {};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const music = new Audio(new URL("./assets/music.ogg", import.meta.url));
music.loop = true;
music.volume = 0.28;
music.preload = "none";
const sounds = {
  tick: new Audio(new URL("./assets/ui-tick.wav", import.meta.url)),
  accept: new Audio(new URL("./assets/ui-accept.wav", import.meta.url)),
};
Object.values(sounds).forEach((a) => {
  a.volume = 0.18;
  a.preload = "none";
});
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      state = M.parseState(raw);
    } catch {
      corruptRaw = raw;
    }
  }
} catch {
  storageOK = false;
}
// Shared writes require a real browser lock. Older browsers remain exportable
// in memory instead of risking two tabs overwriting each other's progress.
if (!navigator.locks) storageOK = false;
if (state.trip) {
  screen = "journey";
  letterId = state.trip.letterId;
}

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
function sound(name = "tick") {
  if (!state.settings.sound || document.hidden) return;
  const audio = sounds[name];
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
function warning() {
  const element = $("#save-warning");
  element.hidden = storageOK && corruptRaw === null;
  element.textContent =
    corruptRaw !== null
      ? "原存档未能读取，已保留原文。请在恢复窗口处理后继续。"
      : !navigator.locks
        ? "此浏览器暂不支持安全保存。进度仅在本页，离开前请在设置里导出；建议使用新版浏览器。"
        : "此浏览器暂时不能保存。本页进度会保留，请先在设置里导出备份。";
  $("#save-status").textContent =
    storageOK && corruptRaw === null
      ? state.savedAt
        ? "已自动保存 · 此浏览器"
        : "每一步，自动保存在此浏览器"
      : "当前进度仅在本页，请导出备份";
}
function applyRemote(raw) {
  if (!storageOK) {
    toast("另一页有新进度。本页未保存的进度已保留，请先导出备份。");
    return false;
  }
  try {
    const next = raw ? M.parseState(raw) : M.createState();
    const recovering = corruptRaw !== null;
    if (raw && !recovering && next.revision < state.revision) return false;
    if (raw && !recovering && next.revision === state.revision) {
      if (!sameData(next, state)) {
        storageOK = false;
        warning();
        toast("发现同时写入的不同进度。本页内容已保留，请先导出备份。");
      }
      return false;
    }
    corruptRaw = null;
    if (recovering && $("#modal").open) closeDialog();
    state = next;
    screen = state.trip ? "journey" : "home";
    tab = "home";
    selectedNode = null;
    selectedDecor = null;
    if (state.trip) letterId = state.trip.letterId;
    render();
    syncAudio();
    toast("已同步另一个标签页的进度。");
    return true;
  } catch {
    toast("另一个标签页的存档无法读取，当前进度已保留。");
    return false;
  }
}
async function change(operation, after, audio = "tick", replace = false) {
  if (busy) return false;
  if (corruptRaw !== null && !replace) {
    showRecovery();
    return false;
  }
  busy = true;
  const commit = async () => {
    if (storageOK) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const latest = M.parseState(raw);
          if (
            latest.revision > state.revision ||
            (latest.revision === state.revision && !sameData(latest, state))
          ) {
            if (replace) state = latest;
            else {
              applyRemote(raw);
              return false;
            }
          }
        }
      } catch {
        if (!replace) storageOK = false;
      }
    }
    try {
      const next = operation(state);
      if (next !== state) {
        next.savedAt = Date.now();
        const raw = M.serializeState(next);
        if (storageOK) {
          try {
            localStorage.setItem(KEY, raw);
          } catch {
            storageOK = false;
            toast("自动保存未成功，请在设置导出备份。");
          }
        }
        state = next;
      }
      after?.();
      render();
      sound(audio);
      return true;
    } catch (error) {
      toast(error.message || "这一步暂时未能完成。");
      return false;
    }
  };
  try {
    return navigator.locks
      ? await navigator.locks.request(KEY, commit)
      : await commit();
  } finally {
    busy = false;
  }
}
window.addEventListener("storage", (event) => {
  if (event.key === KEY) applyRemote(event.newValue);
});

function button(label, action, classes = "primary", attrs = "") {
  return `<button class="${classes}" data-action="${action}" ${attrs}>${label}</button>`;
}
function animal(friend, unknown = false) {
  return `<span class="animal${unknown ? " unknown" : ""}" aria-hidden="true" style="background-image:url('./assets/art/${friend.species}.png')"></span>`;
}
function progressStats() {
  const p = M.getProgress(state);
  return `<div class="stats"><div class="stat"><strong>${p.lettersDone}<small> / 9</small></strong><span>封信已送达</span></div><div class="stat"><strong>${p.friendsMet}<small> / 6</small></strong><span>林间朋友</span></div><div class="stat"><strong>${state.materials}</strong><span>枝叶</span></div></div>`;
}
function currentLetter() {
  return find(LETTERS, letterId) || LETTERS[0];
}
function head(title, subtitle = "", right = "") {
  return `<div class="panel-head"><div><span class="eyebrow">${subtitle}</span><h2>${title}</h2></div>${right}</div>`;
}
function homePanel() {
  const p = M.getProgress(state),
    next = LETTERS[p.lettersDone];
  if (state.trip)
    return `${head("信还在路上", "A LITTLE JOURNEY")}<p class="intro">你停在${esc(find(find(REGIONS, state.trip.regionId).nodes, state.trip.position).name)}。<br>行囊和走过的路，都替你记着。</p>${progressStats()}${button("继续这趟旅途 →", "resume", "primary full")}<p class="inline-note">随时关掉页面也没关系，下次从这里继续。</p>`;
  return `${head(p.ending ? "这里，已经是家。" : p.lettersDone ? "小院又有了新模样。" : "一间小屋，一封来信。", "YOUR QUIET CORNER")}
    <p class="intro">${p.ending ? "九封信写到了这里。<br>剩下的日子，留给布置和偶尔的相见。" : p.lettersDone ? "送信时顺路见个朋友。<br>回来，再添一点喜欢的东西。" : "住进溪边的小屋，替林间的邻居送几封信。<br>不赶时间，路上也可以坐坐。"}</p>${progressStats()}
    ${p.ending ? `<div class="ending"><h3>九封信，都有了回音。</h3><p class="subtle">故事已经完成。你可以自由布置小院，也可以带着旧信再去看朋友。没有需要按时完成的事。</p>${button("布置我的小院", "go-decor", "primary full")}</div>${button("翻看旧信与路线", "go-letters", "secondary full")}` : `<p class="section-label">${p.lettersDone ? "新的来信" : "从这里开始"}</p><article class="letter-card"><div class="letter-meta"><span>第 ${p.lettersDone + 1} 封 / 9</span><span class="stamp">林间邮便</span></div><h3>${esc(next.title)}</h3><p>${esc(find(REGIONS, next.regionId).name)} · 寄往${esc(next.recipient)}</p>${button("收好信，整理行囊 →", "prepare", "primary full", `data-id="${next.id}"`)}</article>`}
    ${state.lastTrip ? button("看看上次带回了什么", "recap", "text-button full") : '<p class="inline-note">每一步自动保存。没有签到、喂养或离线倒计时。</p>'}`;
}
function lettersPanel() {
  return `${head("窗边的信匣", `${state.completedLetters.length} / 9 LETTERS`)}<p class="subtle">${state.completedLetters.length === 9 ? "故事已完成。旧信仍可带你回到熟悉的路上。" : "送达并回家后，下一封信会来到窗边。"}</p><div class="letter-list spaced">${LETTERS.map(
    (letter, index) => {
      const done = state.completedLetters.includes(letter.id),
        available = index <= state.completedLetters.length;
      return `<button class="letter-row ${available ? "" : "locked"}" data-action="read-letter" data-id="${letter.id}" ${available ? "" : "disabled"}><span class="letter-no">${String(index + 1).padStart(2, "0")}</span><span><strong>${esc(letter.title)}</strong><small>${done ? "已送达 · 可以重访" : available ? "新来信 · 等你启程" : "前一封送达后开启"}</small></span><span class="letter-arrow">${done ? "✓" : available ? "↗" : "·"}</span></button>`;
    },
  ).join("")}</div>`;
}
function letterPanel() {
  const l = currentLetter(),
    done = state.completedLetters.includes(l.id);
  return `${button("← 返回信匣", "go-letters", "text-button back")}${head(esc(l.title), `LETTER ${LETTERS.indexOf(l) + 1} / 9`)}<p class="subtle">寄往 ${esc(l.recipient)}</p><div class="mail-paper">${esc(l.body)}</div>${done ? `<p class="section-label">收到的回信</p><div class="mini-reply">${esc(l.reply)}</div><p class="inline-note">已领取首通信件奖励。重访仍可会友、采集。</p>` : '<p class="inline-note">首次送达并回家：获得 2 份枝叶。</p>'}${state.trip ? button("继续正在进行的旅途", "resume", "primary full") : button(done ? "再走一趟 →" : "整理行囊 →", "prepare", "primary full", `data-id="${l.id}"`)}`;
}
function preparePanel() {
  const l = currentLetter(),
    region = find(REGIONS, l.regionId),
    used = state.pack.reduce((n, id) => n + find(TOOLS, id).slots, 0);
  const result = M.getReachableOutcomes(region.id, state.pack);
  return `${button("← 放回信匣", "go-letters", "text-button back")}${head("出门前，带些什么？", esc(region.name))}<p class="subtle">${esc(l.title)} · 本趟 ${region.energy} 点精力</p><div class="pack-head"><span class="section-label" style="margin:0">行囊 ${used} / 4 格</span><span class="slot-indicator" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i < used ? "filled" : ""}"></i>`).join("")}</span></div><div class="tool-grid">${TOOLS.map((tool) => `<button class="tool" data-action="tool" data-id="${tool.id}" aria-pressed="${state.pack.includes(tool.id)}"><span class="tool-top"><strong>${tool.name}</strong><small>${tool.slots} 格 ${state.pack.includes(tool.id) ? "✓" : "＋"}</small></span><p>${tool.description}</p></button>`).join("")}</div>
  <div class="outcomes"><strong>这套行囊，可以……</strong><p>${
    result.visitorIds.length
      ? result.visitorIds
          .map((id) => {
            const f = find(FRIENDS, id);
            return `拜访${f.name}${state.friendVisits[id] ? "（老朋友）" : `，获得${find(DECOR, f.gift).name}`}`;
          })
          .join("；")
      : "沿途送信，或顺路采集"
  }</p><p>采集路线最多带回 <strong>${result.collectionMax}</strong> 份枝叶。</p><p class="subtle">会友与最多采集可能是不同路线；出发后逐段选择。</p></div>${button("信收好了，出发 →", "start", "primary full", result.deliverable ? "" : "disabled")}<p class="inline-note">只影响这一趟，不消耗家中物品。点选已装工具可取出。</p>`;
}
function rewardText(route) {
  const r = route.reward,
    rewards = [];
  if (r.delivery) rewards.push("送达信件");
  if (r.guestId) {
    const f = find(FRIENDS, r.guestId);
    rewards.push(
      `拜访${f.name}${state.friendVisits[f.id] ? "" : ` · ${find(DECOR, f.gift).name}`}`,
    );
  }
  if (r.collection) rewards.push(`枝叶 +${r.collection}`);
  if (r.energyRestore) rewards.push(`喝茶恢复 ${r.energyRestore} 精力`);
  if (route.to === "home") rewards.push("收好本趟所得");
  return rewards.join(" · ") || "继续向前，下一处再选路";
}
function journeyPanel() {
  const trip = state.trip;
  if (!trip) {
    screen = "home";
    return homePanel();
  }
  const region = find(REGIONS, trip.regionId),
    routes = M.getRoutes(trip),
    node = find(region.nodes, trip.position);
  const terrain = {
    forest: "林路",
    rain: "雨路",
    plain: "小径",
    tunnel: "隧道",
  };
  return `${head(esc(node.name), esc(region.name), button("暂回小屋", "rest", "text-button"))}<div class="energy-bar"><span class="subtle">本趟精力 <strong>${trip.energy} / ${region.energy}</strong></span><span class="energy-dots" aria-hidden="true">${Array.from({ length: region.energy }, (_, i) => `<i class="${i < trip.energy ? "on" : ""}"></i>`).join("")}</span></div><p class="journey-bag">${trip.tools.map((id) => find(TOOLS, id).name).join(" · ")}${trip.teaUsed ? "（茶已饮）" : ""}</p><div class="row between"><p class="section-label">下一段，走哪里？</p><span class="subtle">枝叶 ${trip.collection} · ${trip.delivered ? "信已送达" : "信在行囊"}</span></div>
  <div class="route-list">${routes.map((route) => `<button class="route-option${selectedNode === route.to ? " selected" : ""}" data-action="step" data-id="${route.id}" ${route.safeAvailable ? "" : "disabled"}><span class="route-title"><strong>${esc(route.name)}</strong><span class="route-cost">−${route.cost} 精力 · ${terrain[route.terrain]}</span></span><p>${esc(rewardText(route))}</p>${route.safeAvailable ? `<p class="subtle">到达后余 ${route.energyAfter} 点 · 可完成归途 →</p>` : `<p class="reason">${esc(route.reason)}${route.missingTool ? "回家重新整理行囊可更换工具。" : ""}</p>`}</button>`).join("")}</div>
  <div class="row between spaced">${button("← 退回上一处", "rewind", "text-button", trip.path.length ? "" : "disabled")}${button("放下这趟旅途", "abandon", "text-button")}</div><p class="inline-note">每段都已确认有路回家。奖励归家时收好；退回不会损失家中物品。</p>`;
}
function recapPanel() {
  const result = state.lastTrip;
  if (!result) {
    screen = "home";
    return homePanel();
  }
  const l = find(LETTERS, result.letterId),
    gift = result.newDecor.map((id) => find(DECOR, id)),
    theme = result.newThemes.map((id) => find(THEMES, id));
  return `${head("回到小屋了。", result.firstDelivery ? "A LETTER, DELIVERED" : "A FAMILIAR PATH")}<p class="subtle">${esc(l.title)} · ${result.firstDelivery ? "已送达" : "重访归来"}</p><div class="mini-reply">${esc(l.reply)}</div><div class="trip-summary"><div class="summary-item"><strong>＋${result.collection + (result.firstDelivery ? l.reward : 0)}</strong><small>枝叶${result.firstDelivery ? ` · 含送信 ${l.reward}` : ""}</small></div><div class="summary-item"><strong>${result.guestId ? find(FRIENDS, result.guestId).name : "一段静路"}</strong><small>${result.guestId ? "今天拜访的朋友" : "沿途采集，安然归家"}</small></div></div>${gift.length ? `<div class="letter-card"><p class="section-label">带回的小心意</p><h3>${gift.map((d) => d.name).join("、")}</h3><p>${gift.map((d) => d.description).join(" ")}</p><p class="inline-note">${gift.some((d) => state.plots.includes(d.id)) ? "已放在小院的空位，随时可以挪动。" : "院里已满，可以在布置中替换喜欢的位置。"}</p></div>` : result.guestId ? '<p class="inline-note">老朋友的礼物已经收好，这次留下一段相见。</p>' : ""}${theme.length ? `<div class="outcomes">新院景：<strong>${theme.map((t) => t.name).join("、")}</strong><br>在「布置」中随时切换。</div>` : ""}${M.getProgress(state).ending && result.firstDelivery ? '<div class="ending"><h3>九封信，都有了回音。</h3><p class="subtle">故事完成了。小院和朋友都会留下来。</p></div>' : ""}${button("在家坐一会儿", "go-home", "primary full")}${gift.length ? button("挪挪新陈设", "go-decor", "text-button full") : ""}`;
}
function friendsPanel() {
  if (friendId) {
    const friend = find(FRIENDS, friendId),
      memories = M.getFriendMemories(state, friendId),
      gift = find(DECOR, friend.gift),
      region = REGIONS.find((r) =>
        r.nodes.some((n) => n.guestId === friend.id),
      );
    return `${button("← 林间的朋友", "friends-list", "text-button back")}<div class="row">${animal(friend, !memories.length)}${head(friend.name, friend.role)}</div><p class="subtle">${memories.length ? `带来的礼物：${gift.name}` : `在${region.name}，顺路去坐坐。`}</p>${memories.length ? memories.map((memory, i) => `<div class="memory"><span class="memory-index">${["初见", "渐熟", "自在相处"][i]}</span>${esc(memory)}</div>`).join("") : `<div class="mail-paper">还没正式见过面。带好行囊，路过时去打个招呼吧。</div>`}<p class="inline-note">${memories.length < 3 ? "相处的记忆会随信的故事展开，不需要反复拜访刷次数。" : "有些朋友，不必每天见面也会惦记。"}</p>${button("去信匣看看路线", "go-letters", "secondary full")}`;
  }
  return `${head("林间的朋友", `${M.getProgress(state).friendsMet} / 6 NEIGHBORS`)}<p class="subtle">见过面后，他们会把一份小心意留在院里。</p><div class="friend-list spaced">${FRIENDS.map((friend) => `<button class="friend-card" data-action="friend" data-id="${friend.id}">${animal(friend, !state.friendVisits[friend.id])}<span><strong>${friend.name}</strong><small>${friend.role} · ${state.friendVisits[friend.id] ? "已经相识" : "等待初见"}</small></span><span class="letter-arrow">↗</span></button>`).join("")}</div>`;
}
function decorPanel() {
  const chosen = find(DECOR, selectedDecor);
  return `${head("慢慢布置，慢慢喜欢。", `${state.unlockedDecor.length} / 12 LITTLE THINGS`)}<div class="row between"><span class="subtle">枝叶 <strong>${state.materials}</strong></span><span class="subtle">拥有后可反复摆放</span></div><div class="theme-switch" aria-label="小院主题">${THEMES.map((theme, i) => `<button data-action="theme" data-id="${theme.id}" aria-pressed="${state.theme === theme.id}" ${state.unlockedThemes.includes(theme.id) ? "" : "disabled"}>${theme.name}${state.unlockedThemes.includes(theme.id) ? "" : ` · ${i * 3}封信`}</button>`).join("")}</div><div class="selected-decor"><strong>${chosen ? `已选：${chosen.name}` : selectedDecor === "remove" ? "收起陈设" : "选一件，再点小院里的圆圈"}</strong><p class="subtle">${chosen ? "点击一个位置摆放。不会消耗物品。" : selectedDecor === "remove" ? "点选位置即可收起，物件仍然拥有。" : "朋友的礼物自动放进空位，也能随时挪动。"}</p>${button("收起一个位置", "remove-decor", "text-button")}</div><div class="decor-grid">${DECOR.map(
    (decor) => {
      const owned = state.unlockedDecor.includes(decor.id);
      return `<button class="decor-card${selectedDecor === decor.id ? " selected" : ""}" data-action="decor" data-id="${decor.id}"><span class="decor-tag">${owned ? "已拥有" : decor.friendId ? "朋友赠礼" : `${decor.cost} 枝叶`}</span><div class="decor-thumb"><canvas data-sprite="${decor.sprite}" width="96" height="64" aria-hidden="true"></canvas></div><strong>${decor.name}</strong><small>${owned ? "选择并摆放" : decor.friendId ? `拜访${find(FRIENDS, decor.friendId).name}获得` : "点击查看并购置"}</small></button>`;
    },
  ).join("")}</div>`;
}
function render() {
  warning();
  $("#new-letter-dot").hidden = state.completedLetters.length === 9;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.setAttribute(
      "aria-current",
      button.dataset.tab === tab ? "page" : "false",
    );
  });
  const focus = document.activeElement?.dataset,
    scroll = $("#panel").scrollTop;
  const view =
    screen === "prepare"
      ? preparePanel
      : screen === "journey"
        ? journeyPanel
        : screen === "recap"
          ? recapPanel
          : screen === "letter"
            ? letterPanel
            : tab === "letters"
              ? lettersPanel
              : tab === "friends"
                ? friendsPanel
                : tab === "decor"
                  ? decorPanel
                  : homePanel;
  $("#panel").innerHTML = view();
  $("#panel").scrollTop = scroll;
  if (focus?.action) {
    const candidate = [...$("#panel").querySelectorAll("[data-action]")].find(
      (e) =>
        e.dataset.action === focus.action &&
        e.dataset.id === focus.id &&
        !e.disabled,
    );
    candidate?.focus({ preventScroll: true });
  }
  renderScene();
  renderThumbs();
  syncControls();
}
function renderScene() {
  if (!scene) return;
  const routeMode = screen === "journey" || screen === "prepare",
    region = routeMode
      ? find(REGIONS, state.trip?.regionId || currentLetter().regionId)
      : null;
  const trip = screen === "journey" ? state.trip : null,
    routes = trip ? M.getRoutes(trip) : [];
  scene.render({
    mode: routeMode ? "route" : "home",
    theme: routeMode ? region.theme : state.theme,
    plots: state.plots,
    residents: FRIENDS.filter((f) => state.friendVisits[f.id]).map(
      (f) => f.species,
    ),
    region,
    trip,
    selectedPlot,
    routes,
  });
  scene.setMotion(state.settings.motion && !reduced.matches);
  $("#scene-title").textContent = routeMode
    ? region.name
    : tab === "decor"
      ? "把喜欢的，留下来。"
      : state.completedLetters.length === 9
        ? "这里，已经是家。"
        : "今天，也慢慢来。";
  $("#scene-eyebrow").textContent = routeMode
    ? trip
      ? "一封信的归途"
      : "看看今天的路"
    : "溪边的一隅";
  $("#scene-badge").textContent = routeMode
    ? trip
      ? `${trip.energy} 点精力`
      : `出发精力 ${region.energy}`
    : find(THEMES, state.theme).name;
  $("#scene-caption").textContent = routeMode
    ? "点地图查看，在手记中选路前进。"
    : "信会送到，路也会等你。";
  $("#postcard").hidden = routeMode;
  $("#scene-note").innerHTML =
    tab === "decor" && !routeMode
      ? "<span>选好物件后，点一个圆圈摆放</span>"
      : routeMode && selectedNode
        ? `<span>${esc(find(region.nodes, selectedNode)?.name || "")} · ${trip?.position === selectedNode ? "现在在这里" : "在手记中选择下一段路"}</span>`
        : "";
  let targets = scene.getHitTargets();
  if (routeMode)
    targets = region.nodes.map((n) => ({
      kind: "node",
      id: n.id,
      x: n.x,
      y: n.y,
      label: n.name,
    }));
  $("#scene-targets").innerHTML = targets
    .filter(
      (t) =>
        t.kind === "node" ||
        (t.kind === "friend" && tab !== "decor") ||
        (t.kind === "plot" && tab === "decor"),
    )
    .map((target) => {
      const plotIndex =
        target.kind === "plot"
          ? PLOTS.findIndex((p) => p.id === target.id)
          : -1;
      const current = target.kind === "node" && trip?.position === target.id,
        available =
          target.kind === "node" &&
          routes.some((r) => r.to === target.id && r.safeAvailable);
      return `<button class="world-target ${target.kind}${current ? " current" : ""}${available ? " available" : ""}${selectedNode === target.id || (selectedPlot === plotIndex && plotIndex >= 0) ? " selected" : ""}" style="left:clamp(22px,${target.x / 2.88}%,calc(100% - 22px));top:clamp(22px,${target.y / 2.88}%,calc(100% - 22px))" data-action="world-${target.kind}" data-id="${esc(target.id)}" aria-label="${esc(target.label)}${target.kind === "plot" ? "，摆放陈设" : ""}">${target.kind === "plot" ? "+" : target.kind === "node" ? `<span class="node-label">${esc(target.label)}</span>` : ""}</button>`;
    })
    .join("");
}
async function loadAtlas() {
  try {
    atlas = await fetch(
      new URL("./assets/asset-map.json", import.meta.url),
    ).then((r) => r.json());
    await Promise.all(
      Object.entries(atlas.files).map(async ([id, file]) => {
        const image = new Image();
        image.src = new URL(`./assets/${file}`, import.meta.url);
        await image.decode();
        artImages[id] = image;
      }),
    );
    renderThumbs();
  } catch {
    toast("部分物件预览暂未载入，可刷新重试。");
  }
}
function renderThumbs() {
  if (!atlas) return;
  document.querySelectorAll("[data-sprite]").forEach((canvas) => {
    const sprite = atlas.sprites[canvas.dataset.sprite],
      image = sprite && artImages[sprite.file];
    if (!image) return;
    const [x, y, w, h] = sprite.rect,
      ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 96, 64);
    const scale = Math.min(2, 84 / w, 60 / h);
    ctx.drawImage(
      image,
      x,
      y,
      w,
      h,
      (96 - w * scale) / 2,
      (64 - h * scale) / 2,
      w * scale,
      h * scale,
    );
  });
}
function go(nextTab, nextScreen = nextTab) {
  tab = nextTab;
  screen = nextScreen;
  selectedNode = null;
  friendId = null;
  $("#panel").scrollTop = 0;
  render();
}
function focusPanel() {
  if (matchMedia("(max-width:760px)").matches) {
    $(".journal").scrollIntoView({ block: "start", behavior: "instant" });
  }
  $("#panel").focus({ preventScroll: true });
}
function openDialog(title, html) {
  modalReturnFocus = document.activeElement;
  $("#modal-title").textContent = title;
  $("#modal-content").innerHTML = html;
  if (!$("#modal").open) $("#modal").showModal();
}
function closeDialog() {
  $("#modal").close();
  modalReturnFocus?.focus?.({ preventScroll: true });
}
$("#modal-close").addEventListener("click", closeDialog);
$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeDialog();
  }
});
function download(content, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function settings() {
  openDialog(
    "把小事安排好",
    `<div class="setting-row"><span><strong>音乐</strong><small>Pixel-boy & AAA · Peaceful</small></span>${button(state.settings.music ? "开" : "关", "setting", "switch", `data-id="music" aria-pressed="${state.settings.music}"`)}</div><div class="setting-row"><span><strong>轻声音效</strong><small>选取与归家的小回声</small></span>${button(state.settings.sound ? "开" : "关", "setting", "switch", `data-id="sound" aria-pressed="${state.settings.sound}"`)}</div><div class="setting-row"><span><strong>场景微动</strong><small>${reduced.matches ? "系统已要求减少动态效果" : "水纹和动物的轻微变化"}</small></span>${button(state.settings.motion ? "开" : "关", "setting", "switch", `data-id="motion" aria-pressed="${state.settings.motion}"`)}</div><p class="inline-note">进度只保存在此浏览器。更换设备、清除浏览器数据前，请导出备份；没有账号或云同步。</p><div class="row spaced">${button("导出进度", "export", "secondary")}${button("导入备份", "import", "secondary")}</div>${button("怎么游玩", "help", "text-button full")}`,
  );
}
function showRecovery() {
  openDialog(
    "先把原来的进度收好",
    `<div class="dialog-copy"><p>浏览器里有一份暂时无法读取的存档。原文还在，尚未被覆盖。</p><p>可以先下载原存档，或导入之前的备份。选择重新开始才会替换它。</p></div><div class="row spaced">${button("下载原存档", "export-raw", "secondary")}${button("导入备份", "import", "secondary")}</div>${button("确认重新开始", "reset-corrupt", "danger full")}`,
  );
}
function syncControls() {
  const playing = state.settings.music && !music.paused;
  $("#music-toggle").setAttribute("aria-pressed", String(playing));
  $("#music-toggle").setAttribute(
    "aria-label",
    playing ? "关闭音乐" : state.settings.music ? "继续音乐" : "开启音乐",
  );
  $("#music-label").textContent = playing ? "音乐开" : "音乐关";
}
async function syncAudio() {
  if (state.settings.music && audioReady && !document.hidden) {
    try {
      await music.play();
    } catch {
      toast("音乐暂未播放，点一下音乐按钮重试。");
    }
  } else music.pause();
  syncControls();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    music.pause();
    Object.values(sounds).forEach((audio) => audio.pause());
  } else syncAudio();
});
reduced.addEventListener("change", () =>
  scene?.setMotion(state.settings.motion && !reduced.matches),
);
$("#settings-open").addEventListener("click", settings);
$("#credits-open").addEventListener("click", () =>
  openDialog(
    "林间小物的来处",
    `<div class="dialog-copy"><p>美术、音乐与音效来自 <a href="https://pixel-boy.itch.io/ninja-adventure-asset-pack" target="_blank" rel="noopener">Ninja Adventure · Pixel-boy & AAA ↗</a>，使用作者提供的原始资源，许可 CC0。</p><p>背景曲：5 - Peaceful。角色采用原图的两帧状态，场景由原始图块组合。设计、程序与文字：4c。</p><p><a href="./assets/art/LICENSE-Ninja-Adventure.txt" target="_blank">查看原始素材许可 ↗</a></p></div>`,
  ),
);
$("#music-toggle").addEventListener("click", async () => {
  audioReady = true;
  const next = music.paused ? true : false;
  await change((s) => M.setSetting(s, "music", next));
  await syncAudio();
});
$("#postcard").addEventListener("click", () => {
  if (!scene) return;
  const a = document.createElement("a");
  a.href = scene.toDataURL();
  a.download = "苔光来信-我的小院.png";
  a.click();
  toast("小院图片已准备下载。");
});
document.addEventListener("click", async (event) => {
  const element = event.target.closest("[data-action],[data-tab]");
  if (!element || element.disabled) return;
  if (element.dataset.tab) {
    go(element.dataset.tab);
    sound();
    return;
  }
  const { action, id } = element.dataset;
  if (action === "go-home") {
    go("home");
    return;
  }
  if (action === "go-letters") {
    go("letters");
    return;
  }
  if (action === "go-decor") {
    go("decor");
    return;
  }
  if (action === "read-letter") {
    letterId = id;
    go("letters", "letter");
    return;
  }
  if (action === "prepare") {
    if (state.trip) {
      toast("先收好正在路上的那封信吧。");
      return;
    }
    letterId = id || letterId;
    go("letters", "prepare");
    focusPanel();
    return;
  }
  if (action === "tool") {
    await change((s) =>
      M.setPack(
        s,
        s.pack.includes(id) ? s.pack.filter((x) => x !== id) : [...s.pack, id],
      ),
    );
    return;
  }
  if (action === "start") {
    await change(
      (s) => M.beginTrip(s, letterId),
      () => {
        screen = "journey";
        tab = "home";
      },
      "accept",
    );
    focusPanel();
    return;
  }
  if (action === "resume") {
    screen = "journey";
    tab = "home";
    letterId = state.trip.letterId;
    render();
    focusPanel();
    return;
  }
  if (action === "rest") {
    go("home");
    return;
  }
  if (action === "step") {
    const wasDelivery = state.trip?.delivered;
    await change(
      (s) => M.stepTrip(s, id),
      () => {
        selectedNode = null;
        if (!state.trip) {
          screen = "recap";
          tab = "home";
        } else if (!wasDelivery && state.trip.delivered)
          toast("信已送达，沿路慢慢回家。");
      },
      id.endsWith("11") || id.endsWith("12") ? "accept" : "tick",
    );
    return;
  }
  if (action === "rewind") {
    await change(M.rewindTrip, () => {
      selectedNode = null;
    });
    return;
  }
  if (action === "abandon") {
    openDialog(
      "这趟先放一放？",
      `<p class="dialog-copy">本趟还没带回家的枝叶和礼物会放回原处。家里的布置、朋友和已完成的信都保留。</p><div class="row spaced">${button("继续走走", "close", "secondary")}${button("回家重新准备", "confirm-abandon", "primary")}</div>`,
    );
    return;
  }
  if (action === "confirm-abandon") {
    await change(M.abandonTrip, () => {
      closeDialog();
      screen = "prepare";
      tab = "letters";
    });
    return;
  }
  if (action === "recap") {
    screen = "recap";
    tab = "home";
    render();
    return;
  }
  if (action === "friend") {
    friendId = id;
    tab = "friends";
    screen = "friends";
    render();
    return;
  }
  if (action === "friends-list") {
    friendId = null;
    render();
    return;
  }
  if (action === "theme") {
    await change((s) => M.setTheme(s, id));
    return;
  }
  if (action === "remove-decor") {
    selectedDecor = "remove";
    render();
    return;
  }
  if (action === "decor") {
    const decor = find(DECOR, id);
    if (state.unlockedDecor.includes(id)) {
      selectedDecor = id;
      render();
      if (matchMedia("(max-width:760px)").matches) {
        $(".scene-frame").scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      }
      return;
    }
    if (decor.friendId) {
      toast(
        `到${REGIONS.find((r) => r.nodes.some((n) => n.guestId === decor.friendId)).name}拜访${find(FRIENDS, decor.friendId).name}，就会收到这份礼物。`,
      );
      return;
    }
    openDialog(
      `把${decor.name}带回家`,
      `<p class="dialog-copy">${esc(decor.description)}<br>需要 ${decor.cost} 份枝叶，现有 ${state.materials} 份。拥有后可自由摆放、反复使用。</p>${button(`用 ${decor.cost} 枝叶购置`, "buy", "primary full", `data-id="${id}" ${state.materials < decor.cost ? "disabled" : ""}`)}`,
    );
    return;
  }
  if (action === "buy") {
    await change(
      (s) => M.buyDecor(s, id),
      () => {
        selectedDecor = id;
        closeDialog();
      },
      "accept",
    );
    return;
  }
  if (action === "world-plot") {
    const index = PLOTS.findIndex((p) => p.id === id);
    selectedPlot = index;
    if (!selectedDecor) {
      toast("先在布置中选一件喜欢的物品。");
      renderScene();
      return;
    }
    await change((s) =>
      M.placeDecor(s, index, selectedDecor === "remove" ? null : selectedDecor),
    );
    return;
  }
  if (action === "world-friend") {
    const friend = FRIENDS.find((f) => f.id === id || f.species === id);
    if (friend) {
      friendId = friend.id;
      tab = "friends";
      screen = "friends";
      render();
      focusPanel();
    }
    return;
  }
  if (action === "world-node") {
    selectedNode = id;
    render();
    return;
  }
  if (action === "setting") {
    audioReady = true;
    await change((s) => M.setSetting(s, id, !s.settings[id]));
    await syncAudio();
    settings();
    return;
  }
  if (action === "export") {
    download(M.serializeState(state), "苔光来信-进度备份.json");
    toast("备份已准备下载。");
    return;
  }
  if (action === "export-raw") {
    download(corruptRaw, "苔光来信-原存档.json");
    return;
  }
  if (action === "reset-corrupt") {
    if (!navigator.locks) {
      toast("请先下载原存档，再使用新版浏览器恢复；本页不会删除原数据。");
      return;
    }
    await navigator.locks.request(KEY, async () => {
      try {
        const currentRaw = localStorage.getItem(KEY);
        if (currentRaw !== corruptRaw) {
          try {
            M.parseState(currentRaw);
            storageOK = true;
            applyRemote(currentRaw);
          } catch {
            corruptRaw = currentRaw;
            showRecovery();
          }
          toast("存档已在另一页更新，这次重新开始已取消。");
          return;
        }
        localStorage.removeItem(KEY);
        storageOK = true;
        corruptRaw = null;
        state = M.createState();
        closeDialog();
        go("home");
      } catch {
        toast("尚未修改原存档。请先下载备份，再重试。");
      }
    });
    return;
  }
  if (action === "import") {
    $("#import-file").value = "";
    $("#import-file").click();
    return;
  }
  if (action === "confirm-import") {
    const imported = pendingImport;
    if (!imported) return;
    await change(
      (s) => ({
        ...imported,
        revision: Math.max(s.revision, imported.revision) + 1,
      }),
      () => {
        corruptRaw = null;
        pendingImport = null;
        closeDialog();
        tab = "home";
        screen = state.trip ? "journey" : "home";
        if (state.trip) letterId = state.trip.letterId;
      },
      "accept",
      true,
    );
    await syncAudio();
    return;
  }
  if (action === "help") {
    openDialog(
      "一封信的时间",
      `<div class="dialog-copy"><p>① 在信匣选一封信，整理四格行囊。工具会改变路段的精力和收获。</p><p>② 点路线前，看看要花的精力和能带回的东西。送达后走到「归家」，这趟的收获才会放进小屋。途中可以退回上一步。</p><p>③ 伙伴的礼物自动放进空位。用采集的枝叶购置其他陈设，在「布置」选择物品，再点小院圆圈摆放。</p><p>九封信有一个结尾。之后可随心布置和重访，没有每日任务。按 F 切换全屏，Esc 退出。</p></div>`,
    );
    return;
  }
  if (action === "close") closeDialog();
});
let pendingImport = null;
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 200000)
      throw new Error("这份备份太大，请选择苔光来信导出的 JSON。");
    pendingImport = M.parseState(await file.text());
    const p = M.getProgress(pendingImport);
    openDialog(
      "用这份备份继续？",
      `<p class="dialog-copy">备份中已送达 ${p.lettersDone} 封信，结识 ${p.friendsMet} 位朋友，拥有 ${pendingImport.materials} 份枝叶。${pendingImport.trip ? "有一趟尚未归家的旅途。" : ""}<br>确认后会替换此浏览器的当前进度。</p><div class="row spaced">${button("暂时不用", "close", "secondary")}${button("确认导入", "confirm-import", "primary")}</div>`,
    );
  } catch (error) {
    pendingImport = null;
    toast(error.message || "这份备份暂时无法读取。");
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key.toLowerCase() === "f" &&
    !$("#modal").open &&
    !["INPUT", "TEXTAREA"].includes(event.target.tagName)
  ) {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
});
window.render_game_to_text = () =>
  JSON.stringify({
    title: "苔光来信",
    tab,
    screen,
    coordinateSystem: "top-left origin; x right, y down; scene 288×288",
    progress: M.getProgress(state),
    materials: state.materials,
    theme: state.theme,
    plots: state.plots,
    pack: state.pack,
    trip: state.trip
      ? {
          letterId: state.trip.letterId,
          regionId: state.trip.regionId,
          position: state.trip.position,
          energy: state.trip.energy,
          delivered: state.trip.delivered,
          collection: state.trip.collection,
          path: state.trip.path,
          routes: M.getRoutes(state.trip).map((r) => ({
            id: r.id,
            name: r.name,
            cost: r.cost,
            safeAvailable: r.safeAvailable,
            reason: r.reason,
            reward: r.reward,
          })),
        }
      : null,
    lastTrip: state.lastTrip,
    storage: storageOK ? "local" : "memory",
    revision: state.revision,
    audio: { enabled: state.settings.music, playing: !music.paused },
  });
window.advanceTime = (ms) => {
  scene?.advanceTime(ms);
  return Promise.resolve();
};
window.addEventListener("pagehide", () => {
  music.pause();
  scene?.setMotion(false);
});
window.addEventListener("pageshow", () => {
  scene?.setMotion(state.settings.motion && !reduced.matches);
});
render();
try {
  scene = await createScene($("#world"));
  renderScene();
  loadAtlas();
  if (corruptRaw !== null) showRecovery();
} catch (error) {
  $("#scene-note").innerHTML =
    "<span>场景未能载入，请刷新重试；存档仍保留。</span>";
  console.error("Scene load failed", error);
}
