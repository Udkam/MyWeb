# Boss behaviour contract

Ten implemented bosses, two candidates for each of five acts. A seeded run selects one candidate per act. The engine owns room selection, collision, projectile updates and safe spawning. `monsters.js` owns boss actions and transitions. Passing module tests alone does not establish browser visual acceptance.

## Pressure revision, 2026-10-15

The v6 problem was reach and downtime, rather than health: in a 30-second open-arena test, simply walking around the desktop perimeter without shooting or dashing avoided all damage from both phases of Briar, Leviathan, Kiln, Eclipse and Chronarch. Briar P1, Leviathan P1, both Kiln phases and both Chronarch phases produced no projectile within 85 px of the moving player. Their target was frozen for the entire initial 0.8–0.9 s tell, slow shots often expired or returned before reaching the perimeter, and recovery plus idle cooldown left long gaps.

This revision keeps every boss's HP and per-hit damage unchanged. Bosses advance when outside their useful range, lead steady movement during the early body tell and stop moving/aiming for the final 0.32–0.38 s. A player changing direction after that lock can evade. Individual attacks link into short combos with fresh 0.55–0.9 s tells; ordinary foes retain their old timing. Every combo ends in at least 0.6 s recovery, with Kiln exposing its core for 1.25 s. The one-second damage grace and dash invulnerability are unchanged.

| Act / type | Core loop | Phase change with a mechanical difference | Required engine support | Confirmed original art |
| --- | --- | --- | --- | --- |
| 1 / sentinel | Six rotating cross volleys link into a 440 px/s, distance-aware pursuit charge; separate double-charge cycles remain | At 50%, eight crosses link into two charges and summons two shield guards once | Safe bounded spawn; final locked aim | GiantFrog |
| 1 / briar | Safe temporary thorn posts lead directly into three staggered seed fans | At 50%, up to four posts and four seed fans, with separated escape corridors | Temporary obstacle lifetime; posts must not overlap bodies or close all passages | GiantBamboo |
| 2 / leviathan | Tidal blades travel farther when the target is distant, then return to their original firing position during a diagonal surge | At 50%, returning shots overlap a second, opposite diagonal surge | Boomerang projectile movement; fixed return origin | SquidGreen, 76×79 |
| 2 / mirror | One short-lived prism decoy immediately leads into bouncing shards | At 50%, two decoys and a safe exchange with one decoy before the shard volley; boss retains its own visible identity | Normal spawn cap; harmless expiry without kill credit | GiantSlime, 62×52 |
| 3 / warden | Teleport links into marked falling rocks, then a separately told rotating volley while rocks are falling | At 35%, a separate three-arm rage burst; subsequent rain changes from a line to a cross | Meteor landing hazards | TenguBlue |
| 3 / kiln | Consecutive flame fans, followed by an open-core punish window | At 50%, side outlets alternate and the exposed core moves to a side; frontal fire no longer gets the same open-core multiplier | Incoming-damage origin hook | GiantFlam |
| 4 / tempest | Lightning leads directly into a moving double helix; standalone spiral cycles remain | At 50%, changes orbit direction each attack cycle; lightning changes from a line to a diagonal | Weave phase, lightning landing hazards | GiantBlueSamurai: Idle/Walk 96×48; Charge/Attack 96×96 |
| 4 / eclipse | Persistent slow homing orbs lead into separately told cross snipes; alternates with teleport snipes | At 50%, recalls its outstanding orbs before teleporting, creating a readable safe window before the snipes | Hostile homing; projectile source ID | DemonCyclop |
| 5 / sovereign | Shield guards and a forward wedge | At 65%, limited sniper reinforcements and opposite firing formations; at 30%, stops summoning and attacks in three directions | Safe bounded spawn, enemy owner markers | GiantRacoonGold |
| 5 / chronarch | A widening paused-shot curtain releases during two long aimed charges returning through its previous position | At 50%, the second thrust after rewind becomes a perpendicular thrust (0.44 s versus 0.62 s), with a fresh 0.55 s body tell; the first thrust remains aimed | Projectile pause/release timeline; fixed rewind anchor; existing resize-safe attack angle offset | GiantSpirit |

## Bounds and visual rules

- Ordinary attacks use enemy body animation, colour, sound and visible projectiles. Do not draw rectangular, fan or ring floor warnings.
- Only actual falling rocks or lightning use landing circles. Mines and thorns are physical entities, not warning geometry.
- Summons use the engine's 18-live-enemy cap and safe spawn delay. Sovereign summons at most six enemies over its lifetime and keeps at most four active owned guards. Mirror keeps at most two decoys; they expire without currency or kill credit.
- Thorn posts last five seconds, max four per boss. Placement checks existing collision, all live bodies and a clear escape side. They are removed during room transitions and are not checkpointed as partial room progress.
- Timers use simulation seconds. No wall-clock state, global randomness or mutable module-level encounter state.
- Each phase transition occurs once. Interruptions must clear invisibility and pending attack state safely. No attack may teleport onto the player and cause damage in the same frame.
- The final aim-lock portion is fixed in angle and position. Body motion before that lock conveys tracking; no ordinary floor geometry is added. `aimLocked`, `comboStep` and the current action are exposed read-only for browser QA and readable rendering.
- A room checkpoint continues to restore its entrance. Enemy action timers, projectiles, mines, thorns and partial damage are rebuilt together, preserving the established rollback boundary.
- New runs use map version 3. Existing explicit version 2 geometry and omitted version 1 geometry remain pinned through save/restore/resize. Snapshot schema version remains 2 for the five-act campaign; map version is a separate field.

## Verification required

1. Exercise each boss's distinct action sequence and all health phases through the actual engine `step`.
2. Test finite state, bounded summons/projectiles, hidden-body collision immunity, thorn expiry and safe placement.
3. Verify homing, weave, return, pause and release as real projectile movement rather than metadata-only fields.
4. Inspect original animation frames in the browser, including phone portrait/landscape, before calling the visual implementation accepted.

## Current verification

- `node --test tests/engine.test.mjs tests/monsters.test.mjs`: 80 passing tests, including original enemies, all ten boss phases, actual returning/paused/homing projectiles, safe thorns, summon budgets, and v1/v2/v3 save/resize compatibility.
- `node --test tests/boss-pressure.test.mjs`: 21 passing tests. Every boss phase is stepped against alternating movement to verify its last aiming segment cannot track, every charge follows a locked tell, every combo reaches an actual recovery window, one-second damage grace remains, and seeded state is deterministic.
- Pressure comparison: 84 deterministic 30-second scenarios (21 boss phases × desktop/portrait × idle/perimeter). For the 42 perimeter scenarios, total time within 85 px of hostile projectiles, close charges or landing hazards increased from **136.36 s to 299.50 s**; damage increased from **96 to 203**. These use 1000 HP solely to observe full encounter cycles, preserve real collisions and damage grace, and do not claim human play or game completion. Peak live projectile count was **63**, and peak enemy count **5**, below the unchanged global limits of 150/18.
- Avoidance margin: a separate deterministic threat-aware pilot, using only ordinary move/dash/nova inputs and **six real HP**, survived all **42** desktop/portrait phase scenarios for 30 seconds; minimum remaining HP was **2**. This demonstrates a measured escape margin, not novice or real-phone usability acceptance.
- Real Chromium application integration used explicitly labelled legal room-entry save fixtures, then only mouse/keyboard and the public time hook. Sentinel (desktop), Kiln (390×844 viewport) and Chronarch (desktop) each exercised both health phases, body locks and distinct actions. Bosses were defeated after about **9.5 s / 25.8 s / 13.0 s** with the fixture's legal builds. There were zero console/page errors. These are isolated boss encounters, not an earned full run.
- Standard `develop-web-game` client completed two ordinary first-room input bursts. State advanced 2 simulation seconds with real movement, eight shots and a dash. Art loaded **95/95**. Screenshots were opened and inspected.
- Evidence: `.qa/boss-pressure/baseline-v6.json`, `candidate-v7.json`, `survival-v7.json`, `browser-report.json`, `browser-*.png/json`, and `first-room-smoke/`. These are retained local QA evidence and are not publishable runtime assets.

## Earlier implementation evidence (historical)

- `node --test tests/monsters.test.mjs`: 34 passing tests. This includes each new ordinary behaviour, all ten boss definitions and health phases, and actual engine `step` tests for projectile motion, temporary slow, directional shielding, decoy expiry, thorn expiry/escape passage, summons, core damage, homing, suspended bullets, Chronarch's phase-specific perpendicular second thrust, and resize-safe surf/rewind coordinates.
- The integration tests found a missing `sniper` entry in the safe summon allowlist; the engine owner fixed it, and Sovereign's second-stage sniper reinforcements now pass through real `step`.
- The standard `develop-web-game` Playwright client completed two action bursts in the first room, with movement, shooting and dash. The captured state advanced to 6.8 simulation seconds with one enemy defeated; there were no captured console/page errors. Screenshots were opened and inspected. Art status was 91/91 loaded at that time.
- Those first-room screenshots do not establish visual acceptance of all ten bosses or all phone sizes. Full-run and boss animation review remain separate browser QA responsibilities.
- Local smoke artifacts: `.qa/monster-smoke/shot-0.png`, `shot-1.png`, `state-0.json`, `state-1.json`. They are task QA evidence, not publishable game assets.
