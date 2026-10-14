# Boss behaviour contract

Ten planned bosses, two candidates for each of five acts. A seeded run selects one candidate per act. The engine owns room selection, collision, projectile updates and safe spawning. `monsters.js` owns boss actions and transitions. This document describes the intended implementation; passing module tests alone does not establish browser visual acceptance.

| Act / type | Core loop | Phase change with a mechanical difference | Required engine support | Confirmed original art |
| --- | --- | --- | --- | --- |
| 1 / sentinel | Rotating cross volleys, then two charges with a fresh body tell between them | At 50% health, summons two shield guards once | Safe bounded spawn | GiantFrog |
| 1 / briar | Temporary solid thorn posts restrict passage, alternating with seed shots | At 50%, changes two side posts into four separated posts, and seeds accompany planting | Temporary obstacle lifetime; posts must not overlap bodies or close all passages | GiantBamboo |
| 2 / leviathan | Returning tidal shots, then a sideways surfing charge | At 50%, returning shots remain active during a second opposite surfing charge | Boomerang projectile movement | SquidGreen, 76×79 |
| 2 / mirror | One short-lived prism decoy and bouncing shards | At 50%, two decoys and a safe exchange with one decoy before the shard volley; boss retains its own visible identity | Normal spawn cap; harmless expiry without kill credit | GiantSlime, 62×52 |
| 3 / warden | Teleport, clearly marked falling rocks, rotating bullets | At 35%, a separate three-arm rage burst; subsequent rain changes from a line to a cross | Meteor landing hazards | TenguBlue |
| 3 / kiln | Consecutive flame fans, followed by an open-core punish window | At 50%, side outlets alternate and the exposed core moves to a side; frontal fire no longer gets the same open-core multiplier | Incoming-damage origin hook | GiantFlam |
| 4 / tempest | Moves around the player while emitting a double helix, alternating with lightning | At 50%, changes orbit direction each attack cycle; lightning changes from a line to a diagonal | Weave phase, lightning landing hazards | GiantBlueSamurai: Idle/Walk 96×48; Charge/Attack 96×96 |
| 4 / eclipse | Slow homing orbs, then a teleport followed by cross snipes | At 50%, recalls its outstanding orbs before teleporting, creating a readable safe window before the snipes | Hostile homing; projectile source ID | DemonCyclop |
| 5 / sovereign | Shield guards and a forward wedge | At 65%, limited sniper reinforcements and opposite firing formations; at 30%, stops summoning and attacks in three directions | Safe bounded spawn, enemy owner markers | GiantRacoonGold |
| 5 / chronarch | Bullets advance, stop in space, then release; alternates with two aimed charges returning through its previous position | At 50%, the second thrust after rewind becomes a perpendicular short thrust (0.22 s versus 0.30 s), with a fresh 0.55 s body tell; the first thrust remains aimed | Projectile pause/release timeline; fixed rewind anchor; existing resize-safe attack angle offset | GiantSpirit |

## Bounds and visual rules

- Ordinary attacks use enemy body animation, colour, sound and visible projectiles. Do not draw rectangular, fan or ring floor warnings.
- Only actual falling rocks or lightning use landing circles. Mines and thorns are physical entities, not warning geometry.
- Summons use the engine's 18-live-enemy cap and safe spawn delay. Sovereign summons at most six enemies over its lifetime and keeps at most four active owned guards. Mirror keeps at most two decoys; they expire without currency or kill credit.
- Thorn posts last five seconds, max four per boss. Placement checks existing collision, all live bodies and a clear escape side. They are removed during room transitions and are not checkpointed as partial room progress.
- Timers use simulation seconds. No wall-clock state, global randomness or mutable module-level encounter state.
- Each phase transition occurs once. Interruptions must clear invisibility and pending attack state safely. No attack may teleport onto the player and cause damage in the same frame.
- A room checkpoint continues to restore its entrance. Enemy action timers, projectiles, mines, thorns and partial damage are rebuilt together, preserving the established rollback boundary.

## Verification required

1. Exercise each boss's distinct action sequence and all health phases through the actual engine `step`.
2. Test finite state, bounded summons/projectiles, hidden-body collision immunity, thorn expiry and safe placement.
3. Verify homing, weave, return, pause and release as real projectile movement rather than metadata-only fields.
4. Inspect original animation frames in the browser, including phone portrait/landscape, before calling the visual implementation accepted.

## Observed verification

- `node --test tests/monsters.test.mjs`: 34 passing tests. This includes each new ordinary behaviour, all ten boss definitions and health phases, and actual engine `step` tests for projectile motion, temporary slow, directional shielding, decoy expiry, thorn expiry/escape passage, summons, core damage, homing, suspended bullets, Chronarch's phase-specific perpendicular second thrust, and resize-safe surf/rewind coordinates.
- The integration tests found a missing `sniper` entry in the safe summon allowlist; the engine owner fixed it, and Sovereign's second-stage sniper reinforcements now pass through real `step`.
- The standard `develop-web-game` Playwright client completed two action bursts in the first room, with movement, shooting and dash. The captured state advanced to 6.8 simulation seconds with one enemy defeated; there were no captured console/page errors. Screenshots were opened and inspected. Art status was 91/91 loaded at that time.
- Those first-room screenshots do not establish visual acceptance of all ten bosses or all phone sizes. Full-run and boss animation review remain separate browser QA responsibilities.
- Local smoke artifacts: `.qa/monster-smoke/shot-0.png`, `shot-1.png`, `state-0.json`, `state-1.json`. They are task QA evidence, not publishable game assets.
