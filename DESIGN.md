# Cinder Below

Design decision: 2026-10-14, after the 532-page research merge and identity audit. This replaces the rejected slow cozy game, while preserving its source history and existing public Sites project.

## Product

A full-viewport, immediate-play, single-player room action roguelite. WASD movement, mouse aim/hold fire, Space dash, E nova, Escape pause. Arrow keys provide keyboard-only aim/fire. Mobile uses a left movement stick, right aim/fire stick, and explicit dash/nova buttons. A real Fullscreen button requests the browser API after a gesture; the game already fills the page when fullscreen is unavailable.

Eight combat rooms, with a Sentinel at room 4 and a Cinder Warden at room 8. Target 4–7 minutes per completed run; measured playtests will calibrate this rather than claim it in advance. Clear a room, choose one of three distinct relics, then walk into one of two exits. Hunt adds enemies and awards extra embers; Refuge is easier and heals one heart. Bosses remain milestones. First room is deliberately readable and begins as soon as Play is pressed.

Satisfying action: visible enemy wind-ups, directional shots, dash invulnerability, short hit-stop, recoil, restrained screen shake, impact sparks, enemy knockback and dropped embers pulled into the player. No random contact damage on spawn. Walls/obstacles shape positioning. A charged nova clears nearby hostile shots and damages enemies. Enemy types: chasing slime, burst shooter, telegraphed charger, orbiting caster; bosses combine readable fans, rings and dashes.

Relics change behavior: split shot, ricochet, piercing, seeking, chain lightning, burn, cold, explosive kills, orbiting blades, dash trail, nova mastery, blood tradeoff; a few straightforward stats can supplement them. Relics stack, repeated choices describe the next level, incompatible/fully capped options are excluded. Effects must be implemented and tested, not just displayed.

Persistent growth is bounded and light: lifetime embers/rooms/kills/runs/wins, best room and unlocked starter weapons. Cinderbolt is immediate; Scatter and Needle unlock from small room-clear milestones. No wait timers, energy, daily chore, account or recurring punishment. Store separately from the previous game's localStorage. A browser-local run snapshot resumes at the most recent safe room entrance; clearly state that cross-device/cloud save is absent. Import/export save and actual persistence failure feedback.

## Visual direction

Dark stone crypt, ember orange projectiles, cold teal runes and violet enemy magic. Licensed cohesive pixel art, crisp integer-sized sprite silhouettes. Deep vignette outside the active arena, restrained glow, chunky typographic title and sparse HUD. Game world is the whole experience, with no website navigation, dashboard cards or marketing sections. Title uses the live dungeon as its backdrop. An ordered room strip and hearts flank the compact HUD. Relic choices temporarily interrupt combat and show an icon, behavior and level.

Use existing CC0 Ninja Adventure and/or a verified compatible dungeon pack; selected sprites, exact frames and licenses must be inspected. Original downloaded music and effects, not synthesized. Audio begins only after interaction and remains optional. Reduced motion disables shake, flashes and cosmetic particles; essential gameplay stays readable.

## Why this direction

- Room Cleaner short playtest: movement, contextual pickup and the first reward create a clear action chain; contextual overloading is avoidable with explicit dash/nova inputs.
- Over/Under and Fair Squares author pages: choices need a cost or consequence; Hunt/Refuge and Blood Pact expose those choices without management chores.
- MagiCard and spellloom author pages: a small combinable vocabulary is more meaningful than many numerical upgrades; implemented projectile modifiers should visibly combine.
- Damocles Gaze, Bucket Brawl and the contrast with WomboCombo's long demo: write a concrete run budget and endpoint, not a vague 'short run'.
- NIMRODS and Hollow Mine author pages: persistent progression can unlock play styles rather than add an endless stat treadmill.
- Browser samples exposed loading and viewport problems: no engine download gate, no required account, no scrollbars or unreadable letterboxed phone arena.

Sources and precise read/playtest scope are retained in research/; author claims are distinct from our direct observations.

## Module contract (implementation baseline)

`src/engine.js` exports `createRun({seed=...,width=1100,height=720,weapon='cinder',meta={}})`, `step(state,input,dt)`, `chooseRelic(state,id)`, `enterRoom(state,route='hunt')`, `setWorldSize(state,width,height)`, `snapshot(state)`, `restoreRun(snapshot)`, `describe(state)`, and constants `RELICS`, `WEAPONS`. Engine is deterministic and contains no DOM, audio or storage. All times are seconds. Step accepts at most 1/30; caller uses 1/120 fixed steps. Input: `{moveX,moveY,aimX,aimY,fire,dash,nova}`; aim is an absolute world coordinate. One-shot inputs dash/nova consumed once. State phase: `combat`, `reward`, `exit`, `won`, `dead`. Root owns pause/title outside engine.

State fields consumed by renderer/UI: `width,height,time,seed,room` (1-based), `route`, `phase`, `player:{x,y,r,hp,maxHp,angle,invuln,dashTime,dashCooldown,novaCharge,novaMax,weapon}`, `enemies:[{id,type,x,y,r,hp,maxHp,angle,phase,windup,hitFlash,...}]`, `bullets:[{id,x,y,vx,vy,r,owner:'player'|'enemy',color,...}]`, `obstacles:[{x,y,w,h}]`, `pickups:[{x,y,value,...}]`, `effects:[{type,x,y,life,maxLife,color,...}]`, `relics:{id:level}`, `choices:[relicId]`, `gates:[{x,y,r,route,label}]`, `stats:{kills,rooms,embers,shots,hits,damageTaken,elapsed}`, `events:[{type,...}]` (cleared at beginning of each step; app consumes each step), `shake,hitStop`. More fields are allowed. Boss type is `sentinel` or `warden`; all entities use world coordinates and positive y downward. Hitbox/attack warning fields must be documented for renderer.

`RELICS` is an array of `{id,name,description,maxLevel,color,tag}`; description is truthful at level one, UI adds next level. `WEAPONS` array `{id,name,description,unlockRooms}`. `chooseRelic` returns boolean and sets exit; `enterRoom` consumes safe exit and creates next room. Walking onto a gate in exit invokes the transition. Final room ends won without extra reward. Snapshot/restoration preserves seed, build, health, room and entrance state; invalid input returns null. describe gives a compact JSON-safe state, including coordinate rules, entities, gates, visible choices and pending goals.

`src/renderer.js` exports `async loadArt()` (must gracefully surface any missing critical art), and `render(ctx,state,{width,height,dpr=1,reduceMotion=false,title=false})`. width/height are canvas CSS pixels; root configures backing store and ctx DPR. Renderer scales world to these exact viewport dimensions; engine world matches the viewport aspect ratio. No per-frame DOM or asset fetching. Renderer may export `drawRelicIcon`/`assetStatus`; root can use CSS/simple text for UI icons.

`src/app.js` owns fixed-step RAF, inputs, audio playback, DOM HUD/modals, local persistence, test hooks and accessibility. Logical landscape width=1100, height=width*canvasHeight/canvasWidth; portrait height=1000, width=height*canvasWidth/canvasHeight. Keep min height=560 and min width=380. Room layouts use normalized positions so resize can rescale entities safely. Portrait floor leaves bottom 150 world units for touch controls; all enemies remain visible. Escape/blur/hidden pauses and clears held input. No simulation while overlays/pause/title are active.

`window.render_game_to_text()` returns JSON string from describe plus UI mode, save status and unlocks. `window.advanceTime(ms)` advances deterministic steps, not a second live RAF. Test mode pauses automatic RAF stepping and uses the same simulation code. No production debug win/kill buttons or test-only fake completion path.

## Acceptance

Meaningful Node tests for collision, dash safety, telegraph timing, stacking relic changes, boss phases, room rewards/gates, death/win, seed determinism and safe snapshots. Bundled develop-web-game Playwright client plus browser functional tests for input, real projectile kills, rewards, two bosses, loss/retry, pause/visibility, audio/fullscreen, mobile touch, resize, keyboard, persistence/import/export and blocked-storage recovery. Inspect actual desktop/portrait screenshots and browser logs. Publish existing public Sites identity, verify anonymously, then update main MyWeb entry and its required sequential gates.
