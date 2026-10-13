# Implementation

## Runtime

- `engine.js`: deterministic seed-based world, 120 Hz caller tick, room/wave state, collisions, enemies, bosses, relic effects and entrance snapshots. It uses no DOM, wall clock or ambient random values.
- `renderer.js`: original sprite sheets with inspected direction/frame mapping, cached dungeon floor/walls, visible telegraphs, effects and title composition. It reads state without owning the simulation.
- `input.js`: keyboard, mouse and independent pointer-captured mobile sticks. Blur, cancel, modal transitions and resizing clear held input.
- `app.js`: lifecycle, semantic HUD/dialogs, fixed-step accumulator, fullscreen, settings, source-safe imports, deterministic test interface and Web Lock coordinated persistence.
- `storage.js`: bounded schema, prototype/field/numeric validation, revision CAS, explicit exact-original replacement, local failure reporting and backup format.
- `audio.js`: downloaded recordings through Web Audio and HTML audio. Starts after a gesture; bounded voices and rate-limited shots; pauses in the background.

The world adapts its bounds to the viewport. Portrait reserves its bottom band for touch controls. Resizing repositions entities, checks obstacle overlaps and preserves the current run. CSS accounts for mobile safe areas and prevents page overflow. Browser-native fullscreen is requested only through an input gesture.

## Progress accounting

Run statistics and lifetime statistics are separate. `banked` records how much of the current run has already been credited. An entrance checkpoint can be older than `banked`; replaying its already-credited portion does not duplicate lifetime rewards. New runs reset only this bookkeeping and retain unlock progress. Completion clears the active checkpoint. Pausing saves an entrance checkpoint, not a frozen bullet field.

Another tab never replaces an active world. Remote changes pause and offer a manual load. Read/write failures leave live progress available for export. Lack of Web Locks produces explicit memory-only operation rather than a silently non-atomic cross-tab write.

## Evidence boundaries

The 532 references are actual author-page readings with mechanism notes and source hashes. The ledger states each group's depth and preserves the distinction between author claims, partial readings, short browser plays and complete gameplay checks. It is not a claim of playing 532 games.

The first combat pilot cleared an early single-wave build in 55.92 simulated seconds. This exposed insufficient encounter depth; multi-wave normal rooms and finite second-stage boss support were added before publication. The original 4–7 minute design budget was a hypothesis, not a verified claim. Actual final-build run results are recorded in `.qa/combat-report.json`; an automated pilot is not a human difficulty benchmark.

Node model tests cover actual effects and progression boundaries. Browser tests cover real keyboard/mouse/touch actions, source assets, audio/fullscreen, pause, death/retry, save restoration, corruption and concurrency failures. Combat pilots invoke only normal UI input, read-only state descriptions and the public time-step hook; they do not grant themselves health, relics or victory. Local emulated phone checks do not claim a physical iOS/Android device test.

Publication uses the official Sites source helper and archive-backed saved version. The main `personal-web` repository receives its new MyWeb display name only after the deployed game is publicly reachable. The previous accepted homepage/theme work remains outside this change.
