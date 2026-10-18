# Changelog

## 2026-10-18 — MyWeb branch repository migration

- Canonical local source is `E:\Proj\Active\MyWeb\TetraMorph`; source is now
  organized on `Udkam/MyWeb` branch `codex/tetramorph`, preserving the full accepted
  1,908-commit history through `96057f1b`. The former remote is retained as `legacy`.
- Updated current documentation for the repository, branch, source path, and Vercel
  connection target. Other local branches and the inherited T27/progress changes
  are excluded; gameplay, assets, lockfile, build settings, and browser saves are unchanged.
- Existing public domain remains `https://tetramorph.vercel.app/`. Source migration
  and platform reconnection are separate checks; this entry does not claim the
  Vercel Git connection has already changed.
- Verification: Node 24.12.0, typecheck, 789 tests passed / 17 optional skipped,
  and production build pass. Current documentation links resolve, and all 13
  inherited modified/untracked files retain their pre-migration SHA-256 hashes.

## 2026-09-22 — Selected crystal icon and file organization

- User accepted the exact isometric cube: 18-degree tilt, ice-blue gradient faces,
  thin white ridges, one lowest vertex. Apple PNG SHA256 starts `9CE5FAB339C0`.
- Source `993b9942`: typecheck/build PASS, 789 tests PASS / 17 optional skipped,
  12 production browser scenes with zero errors, independent icon QA PASS.
- Replaced two 12,000-line accumulated entrypoints with concise current docs; full
  originals retained in `docs/archive/2026-09-22/`. Added docs/release/archive indexes.
  Independent comparison verifies lossless archive and valid entrypoint links.
- Moved 155 ignored local files (~13.8 MiB) from root output, old Playwright logs and
  inactive Serena data into `.local/archive/`; all content hashes identical. No deletion.
- GitHub already named TetraMorph; local root rename retried and still blocked by
  Windows file-in-use lock. Inherited T27/progress work remains intact and unstaged.

## 2026-09-22 — T39 publication

- Replaced the site icon with a three-face tilted cube balanced on one corner.
- Renamed GitHub repository to Udkam/TetraMorph and updated local origin.
- Published https://tetramorph.vercel.app/ through the existing Vercel account's
  Git integration; personal-web untouched. First install exposed a missing optional
  wasm peer lock entry; corrected it without bypassing npm ci.
- Typecheck/build PASS; 788 tests PASS / 17 optional skipped; 12 production browser
  scenes PASS, zero errors; independent initial and lock-delta QA PASS.
- Local directory rename was attempted but Windows reports an open-process lock.
  Original directory and all inherited dirty paths remain intact; no forced termination.

## 2026-09-22 — T38 tactile Mutation and release candidate hardening

- Implemented coherent frost/ceramic/gold/amethyst item materials, local causal
  activation cues, quieter Bomb camera movement and unobstructed multiplier reward.
  Bomb uses a damped synthetic block fracture; chain overlap no longer needlessly
  attenuates the whole event. Gravity/multiplier percussion matches that palette.
- Survival now settles pending pressure and earned relief atomically, preserving
  top cells and checking final mover overflow. Added regressions that failed before
  the correction. Unknown/corrupt leaderboard data is protected and unavailable
  saving is disclosed; rendering failures provide non-destructive recovery.
- Updated targeted dependencies; npm audit reports zero advisories. Added clean-lock
  CI gates, production browser smoke and static hosting/rollback instructions.
- Full verification: typecheck, 787 tests passed / 17 optional skipped, build passed;
  12 production Chromium scenes plus eight real Mutation frames and current product
  audio review work. Independent QA: PASS, 211 additional targeted tests passed.
  No claim of physical-device/Safari certification or subjective listening approval.
- Source `d5b46903`; smoke corrections through `e0062984`; evidence `9961a341`;
  independent QA `f534dab5`. Inherited T27/progress changes remain excluded.
- Consolidated player review: `/docs/evidence/t38/` on the local dev server.
  Deferred exact certificates remain outside scope. No formal accepted release tag
  or external deployment is created by this candidate.

## 2026-09-06 — T37 unified sensory curriculum integrated; player review open

- Player-directed scope excludes the unfinished Horizon, Terrace, and Keystone exact proofs. They
  are retained as deferred non-release residue, not implied by the product; the mastery registry
  exposes only its three genuine existing certificates while the 46-level `5 / 25 / 16` course
  remains fully playable.
- Product range `8034e66..92ec0fc` adds the quiet procedural Bomb block-break cue, fixed five
  Classic pace presets, Endgame migration/course/UI, D1 route recapture, D2B category/detail
  motion, and the verified long-clear reward presentation. The Survival optimization output stays
  explicitly audit-only rather than changing Survival rules.
- Final typecheck, full suite (`775 passed / 17 skipped`), and build pass. Vite reports only its
  non-failing 624 kB chunk-size warning. Read-only integration review of
  `8034e66..9692ee2` finds no whitespace defect, no inherited T27 path, and no fabricated deferred
  certificate.
- Final Chromium evidence binds D1 to source `92ec0fc` with zero failures/errors, confirms
  normal/chain/reduced product Bomb behavior with lifecycle cleanup, and verifies real Endgame
  5/25/16 category motion without horizontal overflow. The final evidence commit is `9692ee2`.
- Player acceptance remains the last gate: judge normal Bomb and chained clear timbre/loudness,
  Classic pace feel, Endgame playability, and page/category transitions. Exact optimality proof is
  deliberately not part of this review.

## 2026-08-16 — T37 R5B provisional product audio implemented

- Added byte-exact R5A A/B/C stems as provisional product assets, a strict single-buffer
  Bomb compositor, and constructor-frozen default A routing for normal and shared-plan
  chain events. Old Bomb/Bomb-chain palette recipes and fixed propagation pulses are
  retired; no Core, Renderer, timeline, UI, storage, or score behavior changed.
- Source range `9bf3f62..94957fd` passes focused tests, typecheck, the complete suite
  (`544 passed / 15 skipped`), and the 770-module build. Independent numeric recomputation
  confirms normal 400 ms, full row-39 chain 1368 ms, reduced chain 466 ms, finite unclipped
  samples, one source per event, and exact R5A asset bytes.
- Source/lifecycle QA is `P0/P1/P2/P3/automatic-GAP = 0/0/0/0/0`; its separate human GAP
  stays open. Audio/provenance QA is `0/0/0/1/1`, with the P3 and human GAP described below.
- Audio/provenance QA records one P3 because three logical authorized claims became four
  small commits and retirement followed routing. The final 15-path tree is within scope;
  routing made the legacy branch unreachable before final retirement removed it. The
  deviation is disclosed without history rewrite. Human listening is still OPEN: no
  variant or provisional default is accepted.
- Product-backed R5B evidence is authorized only under
  `docs/evidence/t37/bomb-familiar-language-chain-audition-r5b/**`. It must use real Core,
  production Renderer/AudioEngine, no copied WAVs, fail-closed defaults, complete lifecycle
  proof, Git-blob/UTF-8-LF hash semantics immune to checkout EOL, and defer its listening
  surface to the final consolidated review.

## 2026-08-16 — T37 completion-first recovery and R5B source work opened

- The player's latest sequencing instruction defers all subjective review to one final
  consolidated gate. Contract `6c0c87d` supersedes older intermediate human blockers while
  explicitly leaving every new choice provisional; independent docs QA reports
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`.
- R5A's final evidence chain is `54a3277` / `9d30894` / `99b47be` / `4ce7ba3`.
  Verification passes `204/204`; typecheck, `537 passed / 15 skipped`, and the 770-module
  build pass. Independent UI/lifecycle and audio/provenance reviews report no P0-P3
  finding. Human listening remains open and no candidate is accepted.
- R5B source work is authorized as three bounded checkpoints: admit the byte-exact A/B/C
  stems, compose normal/chain events as one mono buffer/source without old Bomb recipes,
  then route the provisional constructor-frozen default A through AudioEngine/GameRuntime.
  Core, Renderer, the shared chain timeline, UI/storage, and all accepted anchors remain
  frozen.
- Ice original-WAV provenance remains a disclosed login-gated evidence gap. The remaining
  implementation order is material proof, F4E-R5/F5, D2B, line-clear tiers, Falling Fold,
  five Classic presets, and the explicitly unimplemented Survival proposal before final
  gates and consolidated player review.

## 2026-08-14 — T37 Bomb R3 stylized audio contract opened

- The player accepts the complete full-motion `1x` Bomb visual and the D1 Settled
  Handoff route transition. Their product behavior and current evidence are frozen; this
  sound redesign does not reopen Bomb causality/animation or route-transition source.
- Human listening rejects all six R2 recorded-explosion choices: normal A/B/C and
  chain-clear A/B/C. Their realistic, loud, startling identity is the defect, so the
  archived source recordings and R2 evidence remain historical and may not be filtered,
  shortened, gain-reduced, or relabelled into R3.
- Contract checkpoints `a589ed1` and `84036cc` open an evidence-only procedural audition
  under `docs/evidence/t37/bomb-block-burst-audition-r3/**`: three dry, rounded, game-like
  block-collapse pairs with accepted hard-drop/clear references, bounded duration and
  spectral/level checks, reject-all defaults, and a mandatory human listening gate.
- Independent final contract QA over `aa2c9fd..84036cc` reports
  `P0/P1/P2/P3 = 0/0/0/0`. Product integration requires both cues of one same-letter
  pair; any cross-letter preference must be exactly recomposed and re-auditioned first.
  Material/Ice, D2B, and Endgame remain paused through the later product-integration QA.

## 2026-08-14 — T37 D1 current-head route review ready for player verdict

- A read-only current-HEAD refresh at `961c87e` confirms the D1 navigation owner and
  Settled Handoff CSS retain their frozen behavior after the Puzzle-to-Endgame namespace
  migration and D2A overlay work. Canonical paths are now `/endgames` and
  `/play/endgame/:id`; the old evidence remains historical rather than being relabelled.
- Real Chromium verifies native forward/back direction, exact `120/200 ms` animations,
  Canvas-ready Classic entry, Game exit cleanup, rapid latest-request ownership, the
  continuous `160 ms` fallback, opacity-only reduced motion, and a bounded 390x844
  Endgame endpoint. Every D1-scoped invariant passes with one route surface, at most one
  Canvas, zero DOM cells, no horizontal overflow, and zero browser errors.
- The prescribed web-game client reaches the real Endgame gallery after confirming the
  first-entry rules, and the final full-page screenshots were inspected. Focused current
  App/route/navigation-style tests pass `84/84`; the earlier complete `537/15-skipped`
  suite remains source-valid because no product path changed in this refresh.
- Independent read-only source review finds no D1 regression and reports
  `P0/P1/P2/P3/GAP = 0/0/0/0/1`. The only gap is the player's normal-speed judgment of
  the 200 ms / 6 px handoff. D2B category/selection motion remains unimplemented and is
  explicitly outside this D1 review.

## 2026-08-14 — T37 Bomb R2 live review surface ready for player verdict

- Evidence-helper candidate `70ce61f` adds only the deterministic live Bomb R2 review
  README and page. It drives the public Core hard-drop transition through the production
  `TetrisRenderer`, fails closed on clear/trigger row `[30]`, origin rows `[29,30]`, and a
  zero-cell committed board, and does not import or play product audio.
- The prescribed web-game client completes three runs with one Canvas, no residual Bomb
  activation, and zero error files. A separate real-time desktop/mobile matrix verifies
  full `1x`, inspection-only `0.5x`, reduced motion, pause/resume, twelve rapid replays,
  explicit disposal, no horizontal overflow, and zero console/page/request errors.
- The isolated Boom page separately exposes three normal/chain pairs with six working
  controls, exact durations `0.92/2.74`, `1.08/2.96`, and `1.16/2.86 s`, two decoded
  48 kHz sources, and zero browser errors. This is listening eligibility, not acceptance.
- Final typecheck, complete suite (`537 passed / 15 skipped` in `55 passed / 2 skipped`
  files), and 770-module production build pass. Independent candidate QA over
  `74e75f3..70ce61f` reports `P0/P1/P2/P3/GAP = 0/0/0/0/0` and confirms the two committed
  blobs match the pre-commit audit byte-for-byte.
- Product audio integration and later material/transition/Endgame work remain closed
  until the player explicitly chooses or rejects the normal cue, chooses or rejects the
  chain cue, and accepts or rejects the live `1x` visual presentation.

## 2026-08-14 — T37 precise gravity and causal Bomb automated gates accepted

- Precise-gravity checkpoints `9a5977a` and `4aac3c3` implement the exact fractional
  Classic/Mutation ladder and `0.80 s/cell` Ice override without whole-tick rounding or
  expiry catch-up.
- Bomb source `f5bc3c5..4d39951` replaces the legacy bottom-band behavior with clipped
  triggering-row bands and one immutable settlement. A direct Bomb hit activates every
  locked carrier once, emits the complete primary carrier origin, and drives one shared
  bidirectional renderer/audio beat plan with reduced-motion and hidden-row handling.
- Final typecheck, complete suite (`514 passed / 15 skipped` in `54 passed / 2 skipped`
  files), and production build pass after the last source change; independent source,
  rules, and presentation reviews close their automatic findings.
- Listening evidence `968ab43` exposes distinct production normal-Bomb and chain-clear
  comparisons, 29 verified controls, and zero browser errors. Its provenance deliberately
  keeps both sounds unaccepted and `human=required`; automatic checks do not replace the
  player's listening verdict.
- Presentation evidence `0b97cdf` binds 32 images and 27 audited captures to source
  `4d39951`: real App keyboard/lifecycle smoke, full/reduced bidirectional propagation,
  runtime motion switching, normal disjoint blast bands, hidden-only suppression, exactly
  one Canvas, zero DOM cells, zero browser errors, and matching image hashes all pass.
- Work now resumes at the remaining page-inner transition audit. The newly requested
  five-tier Classic calibration is held as the last product implementation item, after
  transitions/material review, the 5/25/16 curriculum, line-clear rewards/duration, and
  the theme icon. Survival remains proposal-only for the final report.

## 2026-08-13 — T37 F4E-R3 key-frontier proof recovery accepted

- Contract `e09526b`, Core checkpoints `46a1efd` / `a38fdbd`, hash-sync contract
  `c46e727`, and source correction `d467744` replace full-state proof frontiers with
  strict complete 11-segment keys while preserving exhaustive landings, the target
  lower bound, layer-local deduplication, shorter-route rejection, and telemetry order.
- A compile-time exhaustive `GameState` policy, fail-closed codec, ordinary-material
  quotient, Bedrock/Survival rejection, proof-observed lock projection, and independent
  object-versus-key BFS tests establish the representative-state boundary.
- The exact gate exposed five mastery fingerprints left stale by the earlier active
  namespace migration. Only those five literals were synchronized to the current
  `endgame` serializer; all routes, optimums, frontiers, transitions, prunes, target and
  support results, and real replays remained unchanged.
- Focused tests pass `16/16` and `4/4`; the mastery exact gate passes `5/5`; the complete
  six-file exact gate passes `29/29`. Final typecheck, ordinary suite
  (`492 passed / 15 skipped`), and 768-module build pass.
- Independent final QA accepts `e09526b..d467744` with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. No browser evidence is required for this
  renderer-independent Core slice. A newly pinned validator contract is the sole next
  step; the retired 26,059-byte validator remains permanently unauthorized.

## 2026-08-13 — T37 canonical Endgame namespace accepted

- Atomic active migration `d623ef9` changes Core, UI, routes, storage, authoring, tests,
  tools, filenames, behavior hashes, and exact fixtures to `残局` / `Endgame` / `endgame`.
- Final source `1a348c2` localizes the home mode name, uses neutral campaign-count
  accessibility copy, and adds real App-boot route/storage migration coverage inside the
  isolated compatibility test.
- Typecheck, the complete suite (`484 passed / 15 skipped`), the 768-module build, and five
  explicit canonical exact-certificate files (`24/24`) pass.
- Evidence `9a68dda` provides four stable bilingual full-page Chromium frames, a passing
  canonical route/history audit, and a verified 7/7 SHA-256 manifest bound to source
  `1a348c2`; port 4217 is released.
- Independent final QA reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. Canonical Intro-05
  contract work may resume; abandoned pre-namespace proof shards remain non-proof.

## 2026-08-12 — T37 Stage F4D Intro-04 accepted

- Source `d3aafc0` adds only the non-published Intro-04 definition, schema-8 artifact, and
  exact test in 381 lines; the live 50 remain unchanged.
- The two optimal four-lock routes prove a local bottom-row clear, zero-clear Z branch, and
  J-to-T migration of the only opening. Current-Core exact proof excludes every shorter route.
- Focused, opt-in exact, typecheck, clean full suite (`449 / 15 skipped`), build, and two
  independent P0–P3/GAP-zero source reviews pass. F4E opens docs-first.

## 2026-08-12 — T37 Intro-04 R3 candidate frozen for QA

- A complete current-Core candidate corrects R2's two remaining infeasible assumptions:
  exact row gaps are `[5,2,3,2]`, and the only opening migrates after the third lock instead
  of ending in a forced vertical I.
- Setup `49` / gameplay `83` produces two four-lock S-Z-J-T solutions that first diverge at
  lock 2, release `[1,0,2,1]` and `[1,0,1,2]`, and complete through openings 0 or 1.
- All 53 pairwise admissions pass; uncapped proof excludes shorter routes with 12 explored
  states and 308 transitions. Source remains closed pending fresh independent R3 QA.

## 2026-08-12 — T37 Stage F4C Intro-03 accepted

- Source `95f3316` adds only the non-published Intro-03 draft, canonical schema-8 artifact,
  and direct exact test: 336 lines across three paths; the live 50 remain unchanged.
- Setup seed `37220` builds gap vector `[3,1,1,3]`. Two five-lock routes diverge at lock 1,
  prove O-support before the horizontal-I bridge, and release `[0,0,2,1,1]`.
- Opt-in exact proof establishes optimum 5 over 2,498 states and 46,762 transitions.
  Typecheck/build pass; the final full suite passes `445 / 14 skipped` after the unrelated
  renderer hook timeout passed its isolated `54/54` rerun.
- Three independent source reviews report `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`.
  F4D opens docs-first for Intro-04 local-clear/only-opening authoring.

## 2026-08-12 — T37 Stage F4C contract accepted; discovery opened

- Two independent reviews of `3e9811a` report P0–P3/GAP all zero after the row-height,
  paragraph-scope, coordinate, alternative-release, and checkpoint repairs.
- The accepted contract causally proves support then bridge for both routes and requires at
  least two later positive releases summing to four.
- Only bounded repository-external heuristic discovery opens. Source remains closed until a
  candidate passes current-Core replay, pairwise admission, and strict exact proof.

## 2026-08-12 — T37 Stage F4C contract repaired after first QA

- Final body review is P0/P1/P2/GAP zero; the checkpoint now stably asks for review of the
  current HEAD containing its own record, avoiding another stale “commit this” instruction.
- Second re-QA finds one P2 release ambiguity: the alternative now explicitly shares the
  complete `[0,0]` then at-least-two-positive/sum-four/finish-zero invariant.
- First review rejects `588e065` with `P1 2 / P3 1`: an Intro-02 final-three-row paragraph
  sat under the F4C heading, and source-run cells were conflated with shifted blocker cells.
- The repair returns that paragraph to F4B and defines an interior bridge source `{x,y}` whose
  shifted `{x,y+1}` destination is support, with empty shifted destinations on both sides.
- Discovery remains closed until two fresh reviews of the repaired SHA are all zero.

## 2026-08-12 — T37 Stage F4C Intro-03 contract frozen

- The v3 draft deliberately uses four target rows while pinning the unchanged live three-row
  definition; existing noncanonical validation already supports the rebuild without Core work.
- Both routes must prove a causal two-lock lesson: a zero-clear support is followed by a
  horizontal bridge whose only downward blockers are cells from that support, with open span
  on both sides, before at least two later events clear all four rows.
- F4C is limited to one draft append, one schema-8 JSON, and one direct test under 500 lines.
  Candidate discovery waits for two fresh all-zero contract reviews.

## 2026-08-12 — T37 Stage F4B Intro-02 accepted

- Follow-up fact correction distinguishes the 621-byte serialized draft definition
  (`1E67…A9EB`) from the 1,421-byte schema-8 certificate file (`8EC555…3B75`).
- Source `c571f54` changes only the four frozen non-product paths (340 additions, two
  deletions) and preserves the live 50-level library plus the accepted Intro-01 artifact.
- Normal Intro/live regression passes `19 passed / 2 skipped`, combined opt-in exact passes
  `10/10`, typecheck passes, the complete suite passes `441 passed / 13 skipped`, and the
  767-module build passes.
- Two independent source reviews report P0–P3/GAP all zero after rebuilding all bytes,
  hashes, topology comparisons, legal setup, both well-preserving routes, and exact proof.
  Only a docs-first Intro-03 support-before-bridge contract opens next.

## 2026-08-12 — T37 Stage F4B Intro-02 candidate frozen

- A legal six-drop `[4,1,1]` board exposes one unique x=6 well and passes all 51 pairwise
  structure comparisons with unique gameplay seed `560`.
- Two four-lock routes diverge at lock 1, preserve the well through three zero-clear locks,
  then finish with the same vertical I and a single three-row release.
- Strict proof exhausts 401 states and 14,267 transitions; independent preimplementation QA
  reports P0–P3/GAP all zero. Only the frozen four-path source checkpoint opens next.

## 2026-08-12 — T37 Stage F4B repaired contract accepted; discovery opened

- Two independent reviews report P0–P3/GAP all zero after the four-path, board-coordinate,
  release-invariant, and multiplicity-semantics repairs.
- Current Core can prove the unique three-row well, pre-final preservation, final vertical-I
  three-line release, early-divergent completion route, and strict three/four-lock optimum.
- Only non-published Intro-02 candidate discovery opens; source and live product stay closed.

## 2026-08-12 — T37 Stage F4B contract repaired before discovery

- Independent review finds the three-path boundary would break Intro-01's accepted
  one-element-array assertion; F4B now includes one minimal append-compatibility test repair.
- The well invariant now checks empty Core board cells at world rows 37–39, and each route's
  sole positive release is final `3` with targets 24 -> 0.
- Schema `multiple` is clarified as distinct completing routes, not multiple optima; the
  alternative remains bounded by optimum plus two. Discovery remains closed for fresh QA.

## 2026-08-12 — T37 Stage F4B Intro-02 contract frozen

- F4B opens only the second non-published Intro draft, its schema-8 artifact, and direct exact
  test, still below 500 changed lines and outside the live library.
- The definition must expose one unique three-row well; every pre-final lock preserves it and
  clears nothing, while the final vertical I releases all three rows. One early-divergent
  alternative must prove the same lesson.
- Live Intro-02 and accepted Intro-01 bytes/hashes, unique seed, pairwise structure, exact
  proof, and v8 serializers are mandatory. Discovery waits for independent contract QA.

## 2026-08-12 — T37 Stage F4A Intro-01 accepted

- Source `cfbcab4` adds only the non-published draft module, canonical schema-8 certificate,
  and direct current-Core test: 335 lines across three paths.
- Normal focused tests pass `15 passed / 1 skipped`; opt-in exact passes `5/5`. Typecheck,
  the complete `437 passed / 12 skipped` suite, and the 767-module build pass.
- Independent source QA reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`, including live-50
  isolation and complete hash/replay/exact-proof reconstruction. F4B Intro-02 contract is next.

## 2026-08-12 — T37 Stage F4A Intro-01 candidate frozen

- A six-drop `[2,2,2]` floor board with unique gameplay seed `1212` passes validator and
  all 50 pairwise exact/topology/near comparisons.
- Primary and alternative routes both finish in four locks with positive releases `[1,2]`;
  the alternative diverges at lock 1. Exact proof exhausts 779 states and 14,457 transitions
  across three shorter depths.
- Independent preimplementation QA reports P0–P3/GAP all zero. Only the three contracted
  non-product source/artifact/test paths open next; the live 50 remain unchanged.

## 2026-08-12 — T37 Stage F4A pairwise fingerprint gate accepted

- Fresh independent verification on the corrected HEAD reproduces the live-only baseline
  exact 0 / topology 0 / near 10 and confirms topology comparison does not use stable ID.
- The pairwise draft-versus-live admission receives
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`; non-published Intro-01 discovery reopens.
- Source creation still requires one candidate that passes every geometry, unique-seed,
  route, release, alternative, and pairwise fingerprint gate.

## 2026-08-12 — T37 Stage F4A fingerprint admission corrected before source

- A current-Core probe shows the unchanged live 50 definitions already contain ten
  historical near-candidate pairs, so the accepted requirement that the combined audit be
  globally empty is impossible.
- The corrected admission compares the draft individually against every live definition and
  rejects exact, normalized-topology, or near-topology matches involving the draft.
- The first local candidate also fails that repaired gate and used the live gameplay seed;
  it is discarded. Discovery and source editing pause for fresh contract QA.

## 2026-08-12 — T37 Stage F4A repaired contract accepted; Intro-01 discovery opened

- Fresh independent review reports `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0` for the repaired
  six-drop, three-floor-row authoring contract.
- The capacity, seed-only-copy, fingerprint, schema/hash, strict-proof, and alternate-route
  requirements are executable through current Core seams.
- Only non-published `t3r-shaft-01` candidate discovery is open. The live 50-level library,
  every other definition, progression/UI, sensory work, and icon remain unchanged.

## 2026-08-12 — T37 Stage F4A contract rejected and repaired before discovery

- Independent review rejects the first F4A contract with P1 1 / P2 1: seven setup drops
  cannot fit three non-full rows, and a unique gameplay seed can make a copied board's
  behavior hash look different.
- The repair requires exactly six legal drops, exactly three occupied floor rows, a changed
  six-gap ordering, and zero exact/topology/near fingerprint conflicts against all 50 live
  definitions. Exactly one alternative and two target-reducing `[1,2]` clears are required.
- Discovery and all source editing remain closed until fresh contract QA is all zero.

## 2026-08-12 — T37 Stage F3D accepted and F4A Intro-01 contracted

- Source `7f31802` adds immutable schema-8 `exhaustedDepths` telemetry and derives every
  legacy exact-proof total from it without changing routes, optima, state hashes, or counts.
- Writer and independent exact runs pass `9/9`; independent review reports P0–P3/GAP all
  zero. Final typecheck, full `433 passed / 11 skipped` suite, and 767-module build pass.
- F4A is frozen as one non-published `t3r-shaft-01` authoring draft plus its canonical
  schema-8 certificate and direct exact test. The live 50-level library remains unchanged;
  independent contract QA must pass before candidate discovery or source editing.

## 2026-08-12 — T37 Stage F3D schema-8 proof telemetry contracted

- Post-F3C inventory confirms that the live product still publishes the accepted 50-level
  campaign; the 5/25/16 roster has not silently entered product data.
- Schema 8 needs literal transition/prune totals for every exhausted lock depth, but the
  accepted Core certificate exposes only aggregate totals. F3D opens exactly the search
  certificate plus its existing mastery/F3C exact tests to add immutable depth records.
- Every legacy width and aggregate must be derived from those records without changing any
  route, optimum, state hash, replay, or count. Product definitions and later curriculum,
  progression, UI, sensory, and icon paths remain closed.

## 2026-08-12 — T37 Stage F3C exact ten-row prototype proof accepted

- Commit `b2c3bc5` adds only the canonical non-published prototype artifact and its direct
  current-Core proof test. Their SHA-256 values are `3AF6478949DA431A8BC063E1152DFD918FCEE5C61E8CE67B18ADE4764340E46A`
  and `CB2DAD4A2970BD0789502F0B91445FF132A2A52209B6528913F9BF9BA7EF4A9E`.
- Independent candidate QA reports P0–P3/GAP all zero, including repository-only input,
  canonical base identity, literal setup/route replay, and the opt-in no-beam certificate.
- Final typecheck, the complete suite (`433 passed / 11 skipped`), and the 767-module build
  pass. F3C closes without publishing a product level; the next step is read-only curriculum
  inventory followed by a separately committed F3D contract.

## 2026-08-12 — T37 Stage F3C canonical base hash corrected before implementation

- The final-file writer stops before editing after detecting that the frozen canonical
  `t3r-shaft-01` SHA-256 had been truncated to 61 hexadecimal characters.
- Independent current-Core serialization confirms 625 bytes and the full SHA-256
  `7678C0321BC76CEED6971BD644AB6BBC21134540706F71BBE7FA1BAE91AC1FA1`.
  The two-path proof boundary reopens with this corrected literal; no product file changed.

## 2026-08-12 — T37 Stage F3C final prototype schema completed

- The first final-file writer stops before editing because nested key names and top scalar
  literals were not fully specified. No artifact or test was created.
- The contract now freezes artifact/schema/claim literals and every provenance, route,
  metrics, and certificate key. The same exact two-path implementation boundary reopens.

## 2026-08-12 — T37 Stage F3C current-Core route and certificate accepted

- A fresh independent no-file replay accepts the exact 82-command public route, five lock
  signatures, target contraction, lower bounds, and `bec0ea65 → 8e34e0c8` state hashes.
- The no-beam proof certifies five locks with frontier `[1]`, one explored state, zero
  transitions, and one deficit prune. Independent review is P0–P3/GAP all zero.
- Canonical `t3r-shaft-01` remains byte-identical. Only the frozen prototype JSON and one
  direct opt-in Core test are open; no product or published Puzzle path is authorized.

## 2026-08-12 — T37 Stage F3C route literals frozen for independent QA

- A reviewer harness stops on its own unsupported `87` command expectation after both Core
  and direct counting return the correct value 82. No hash/certificate claim was accepted.
- The exact route, `82/5/5/11` metrics, `bec0ea65 → 8e34e0c8` hashes, and five-lock
  no-beam certificate statistics are now literal review inputs. A fresh reviewer is required.

## 2026-08-12 — T37 Stage F3C validation base ID frozen

- Independent replay confirms the route but exposes that `stateHash` includes the injected
  definition ID. The primary probe used `t3r-shaft-01`; a reviewer-selected ID correctly
  produced a different hash and stopped before certificate acceptance.
- `baseId=t3r-shaft-01` is now explicit as a non-published validation host, not a product
  replacement. The final test must prove the registered level remains unchanged.

## 2026-08-12 — T37 Stage F3C route diagnostic precondition corrected

- The first no-file route probe stops before any lock because it expected six Next pieces.
  Core correctly exposes active `I`, five-item Next `[O,T,J,L,S]`, and remaining bag `[Z]`.
- No route, certificate, source, or artifact was produced. One corrected no-file diagnostic
  is open with the same frozen seed/signatures; final fixture/product paths remain closed.

## 2026-08-12 — T37 Stage F3C candidate passes current-Core setup replay

- A no-file current-Core probe replays the accepted 20-drop setup and exactly reproduces its
  80 typed target cells with no hidden cells or setup clear. No source file changes.
- Setup seed `106933` remains authoring-only. Gameplay seed `4091` supplies the frozen
  `I → O → T → J → L` route; five lock signatures and `1/2/2/2/3` row releases are fixed.
- The final non-product boundary is frozen to one canonical prototype JSON plus one opt-in
  exact Core test. Only an in-memory route/state-hash/no-beam-certificate diagnostic is open.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 candidate accepted

- Shard 4 finds a candidate at seed `106933`, profile 1, tiling ordinal 82 after 240,468
  work. Output file SHA is `74550EA86D7C9424F71C904B6A8678C6FAE48C2C0719C0F93A13338CB5DA9891`;
  result hash is `A0C94A2D1C96F5AA595296AF614E0BE762AD88A371C578A235102F2CF31F7819`.
- Independent QA rebuilds the full authoring physics, target mask, typed board, and all hash
  identities with P0–P3/GAP zero. The five-entry candidate manifest hash is
  `25BF784987C3FE466F7DA084076959EAA0E4825F4FEF646EE9E1F016DA89616D`.
- The series stops at shard 4; shards 5–8 are permanently closed. Only exact current-Core
  replay and strict-certificate preparation are open; no fixture or product edit is allowed.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 shard 3 accepted

- Shard 3 completes naturally in 33.067 seconds with no candidate and 1,400,585 work.
  File SHA is `B2A3673736833D0AE8F4BC5505D5978C0917F454342FB3F874E143C49919F111`;
  result hash is `9E0BEC10FA6D272781FE546F3E89F965DC5462DA3E9E15D0E293225B8A2E72A3`.
- Independent shard/p04 QA is all zero; four-entry manifest hash is
  `AA2C0EB19EE7EB7027567517D5C268C7739F26E63E2E506B665BB12FB78D30EE`.
- Exactly one shard-4 run is open; prior retries and later shards remain closed.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 shard 2 accepted

- Shard 2 completes naturally in 33.768 seconds with no candidate and 1,406,629 work.
  File SHA-256 is `07624A7756F09A3621DAB22993A93589D7AB27863ED5A1FF830B747EF2405D81`;
  result hash is `D50A1606016D7DC22C4FCE7228011C8FE68FDEE4A39CA601F3599AD0D9705129`.
- Independent shard and three-entry cumulative-manifest QA report P0–P3/GAP all zero.
  Manifest hash is `06EA7C39F54F24C453B2CC122F2D20958639F7004FCB6FD88D2A5711EF3CAFAB`.
- Exactly one shard-3 run is open; prior retries and later shards remain closed.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 shard 1 accepted

- The single shard-1 run completes naturally in 32.987 seconds with no candidate and
  1,391,577 work. Output file SHA-256 is
  `54F6B655ECAD938CC2887E2B519E2C868592DC3786AE5367E104A6C61E27AFCB`.
- Independent raw-byte QA rebuilds the shard domain and result with P0–P3/GAP all zero;
  result hash is `BC66D8E9C4BC2D5690C788FCC8FC9E247930384348F1E1F226DA630B6DE348C8`.
- The ordered two-entry prefix manifest is independently accepted with hash
  `3D1C2E167C1AF1DFDF293E9162B48596F6A738643F46BBFC48D16DE87D978A04`.
  Exactly one shard-2 run is open; prior-run retries and later shards remain closed.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 shard 0 accepted

- The single authorized shard-0 run completes naturally in 32.967 seconds with no candidate,
  1,407,110 work, 20,000 processed seeds, seven profiles, and 373 strong tilings. Output file
  SHA-256 is `A790570DE8FB8FB07E93765B6C311755BD65E3B9952A6A2BC42B7FD19682CABE`.
- Independent raw-byte QA rebuilds queues, membership, the 282,530-node trie, domain, result
  hash, and work arithmetic with P0–P3/GAP all zero. Result hash is
  `EB9A3C44609ED82B23F08BAC4235A195934BFF99B8268ACF7C6B1F36C5A8EFEC`.
- The one-entry cumulative manifest is independently accepted as `prefix-complete`, hash
  `4A8C0D8A3F3CF33B016D92C55CC979F0FE4BD9B76C57426071786A409B1DDB43`.
  Exactly one shard-1 run is open; shard 0/manifest retry and later shards remain closed.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 test accepted

- Initial standalone candidate `71f0a54` passed 139 checks but independent review found five
  missing direct attacks. Repair `caba9d0` adds invalid UTF-8, membership ordering/range,
  rehashed extra-schema, and final-mask mismatch coverage while staying at 497 lines.
- Final test SHA-256 is
  `617A31CA0B3D442E1A66AAC686A579A25CB3D34E90BC5F949AD1106690511994`; fresh independent
  QA reports P0–P3/GAP all zero and 145 checks pass.
- Both standalone tools, typecheck, the complete `430 passed / 10 skipped` suite, and the
  767-module build pass. One shard-0 run is open at its frozen external path; no retry,
  later shard, Core, fixture, or product path is authorized before independent output QA.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 source accepted

- The bounded source candidate is split across `1a36e73`, `2a85d63`, `a7110aa`, and
  `1ceb1bc`; every checkpoint remains below the 500-line source limit. Final source
  SHA-256 is `16039546E0BEBF62CA6644DB4518A92CE8D7A9AF8693BC8EF3461FD033C1F5DC`.
- The implementation fixes all nine ranges and series identities, preserves the v1
  traversal and legal no-touch setup, binds canonical shard/manifest bytes, replays
  candidates, and keeps production execution/publication behind private capabilities.
- Fresh independent source QA reports P0–P3/GAP all zero. Only the standalone v2 test
  path is open next; no production shard, Core, fixture, or product path is authorized.

## 2026-08-12 — T37 Stage F3C sharded tiling v2 contract accepted

- The accepted v1 noncandidate closes seeds 1–20,000. V2 preserves the fixed mask/route,
  no-touch setup legality, and v1 search primitives while partitioning seeds 20,001–200,000
  into nine fixed 20,000-seed shards.
- Two rejected drafts exposed candidate-prefix/full-cover ambiguity, incomplete hash
  preimages, self-file hashing, and a cross-process forged-candidate gap. The final contract
  separates reference/runtime coverage, freezes exact schema/hash/manifest bytes, binds
  independent-QA expectations, and replays candidate physics before manifest acceptance.
- Independent review accepts `4e3eea7..38e05b0` with P0–P3/GAP all zero. Only the first
  bounded v2 source path is open; tests, production shards, Core, fixture, and product remain
  closed until their own checkpoints.

## 2026-08-12 — T37 Stage F3C tiling-first v1 complete noncandidate accepted

- The player removed the temporary resource gate, after which the one authorized full-domain
  production run completed naturally in 31.468 seconds. Its canonical external JSON is 2,713
  bytes with SHA-256 `F9E94210ECB61E4284F3434363833748B1D5990E58DB666A90A2836FB0A840B3`.
- The result is `complete-not-found:cover`, not a budget or memory stop: all seven profiles,
  373 strong tilings, 20,000 seeds, and 1,410,179 work probes are complete. Bound result hash
  is `C1E315E66B819593279E485DC24AC2FE4E9CC7B7543724748222A45B42FBF758`.
- Independent output QA validates canonical bytes, schema, domain identities, work arithmetic,
  hashes, and stop semantics with P0–P3/GAP all zero. The fixed v1 domain is accepted as fully
  searched with no candidate; repeating it or increasing the same budget is prohibited.

## 2026-08-11 — T37 Stage F3C tiling-first authoring tool accepted

- The two-path `tiling-first-v1` tool now derives all seven fixed-domain profiles, performs
  canonical MRV strong-cover search, checks isolated hard-drop/trie orders, and shares one
  deterministic cover/order work budget with fixed domain, trace, tiling, memo, and result
  hashes. Strict CLI/schema/RSS and canonical absent-path publication are included.
- Final repairs preserve foreign temp files after failed exclusive creation and bind output
  to a recursively frozen, privately registered search result. Standalone, typecheck, the
  full `430 passed / 10 skipped` suite, and the 767-module build pass.
- Fresh final QA accepts `61909d4` with P0–P3/GAP all zero and authorizes one full-domain,
  10,000,000-work, 900 MiB, single-process external batch only under a fresh green resource
  sample. Its last 75.8% CPU sample was amber, so authorization remains unconsumed.

## 2026-08-11 — T37 Stage F3C tiling-first v1 contract frozen

- The new two-path authoring tool must cover all seven seed-derived 20-draw count profiles,
  use canonical MRV exact-cover traversal, and test each strong tiling with an isolated
  `(remainingSet,trieNodeId)` hard-drop order DFS. Reverse-v1 continuation is excluded.
- Work budget counts cover-branch plus order-piece probes. STOP priority, 900 MiB RSS,
  domain/trace/certificate/result hashes, canonical output, no-resume semantics, and Core
  replay admission are frozen. After implementation gates and independent QA, only one
  green-resource 10,000,000-work batch may run.

## 2026-08-11 — T37 Stage F3C seeded reverse halted

- Structural review denies a third increment: roots remain at descriptors 36–49/662 in
  the I band, failed memo growth stays near-linear, and all three depth-19 residues are
  disconnected non-tetromino four-cell sets. The accepted forward 50M and reverse 64M
  traversals remain fair prefixes, not negative proofs.
- Bounded diagnostics prove a 20-piece exact cover and a stronger bag-count/no-same-touch
  cover with counts `[3,3,3,3,2,3,3]`. The first constrained certificate has no compatible
  seed/hard-drop order in `1..20000` after a complete 704-state fixed-tiling check.
  Reverse v1 stops at 2M/shard; a separately versioned exact-cover-first authoring contract
  opens without consuming its continuations.

## 2026-08-11 — T37 Stage F3C second reverse round accepted

- All 32 shards resume from 1,000,000 and add exactly 1,000,000 probes. Every output is
  `paused-budget`; cumulative coverage is 64,000,000 probes with no candidate, memory
  guard, or completion. Outputs total 149,218,738 bytes and 668,936 failed memos; manifest
  is `A56F8BC0BE16D82EF63E76E164EFCE773F3B2BD4F9BA029981565E0E7E5DC757`.
- Independent QA rebuilds every trie/domain and accepts canonical bytes, five evidence
  hashes, formal continuation restore, old-memo subset lineage, distinct file identity,
  and unchanged round-one manifest with P0–P3/GAP all zero. Round one is superseded but
  remains because its cleanup path is policy-blocked. Third-round search is review-closed.

## 2026-08-11 — T37 Stage F3C candidate cache accepted

- Repair `0b744b6` invalidates cached masks on catalog identity replacement and adds an
  independent 128-mask oracle plus counting-Proxy reuse tests. Real 10,000/100,000-probe
  resume bytes remain fixed; the latter takes 1.296 s versus the 8.313 s baseline.
- Standalone, typecheck, the complete 430-test suite, and build pass. Fresh independent QA
  reports P0–P3/GAP all zero and opens one second 1,000,000-probe increment per shard into
  a distinct external directory. Round-one continuations remain read-only until successor
  output QA passes.
- The attempted exact six-file benchmark cleanup is rejected by terminal policy before
  execution. The 15,212,052 bytes remain as separate QA artifacts; no shell bypass is
  permitted, and they do not alter the round-two authorization.

## 2026-08-11 — T37 Stage F3C candidate-cache QA rejection

- Candidate `8317373` keeps 10,000- and 100,000-probe real-resume outputs byte-identical
  and reduces the latter single measurement from 8.313 s to 1.240 s. Final standalone,
  typecheck, 430-test suite, and build pass.
- Independent QA reports `P0 0 / P1 0 / P2 0 / P3 1 / GAP 2`: catalog replacement can
  leave a stale context cache, while tests lack an independent 128-mask oracle and a
  `filter()` call counter. Only those two source/test paths reopen; second-round search
  remains closed.

## 2026-08-11 — T37 Stage F3C continuation retention correction

- The accepted 32-file first-round output is the only resumable state for its 32 shards.
  The earlier cleanup-first order is withdrawn: deleting it now would replay 32,000,000
  probes. Keep it intact until distinct successor files are generated and accepted.
- A bounded read-only review opens only an order-preserving candidate-cache performance
  slice. The last 576 tokens per shard contain outcomes `[11134,152,6950,4,192,0]`, while
  all failed memos have mean depth 8.792. These are diagnostic signals, not a negative
  certificate or authority for another search round. Fresh equivalence QA controls the
  next increment.

## 2026-08-11 — T37 Stage F3C first reverse round complete

- All 32 serial 625-seed shards receive exactly one 1,000,000-probe increment. Every file
  is `paused-budget` with no candidate, memory guard, or completion; totals are 20,000
  seeds, 32,000,000 probes, 342,213 failed states, 338,728 trie nodes, and 81,077,752 bytes.
- Independent output QA reports P0–P3/GAP all zero and reproduces ordered manifest
  `2FEE91319AF99ADFBCE42BED649BDE53076C383AD11BA2FFB64D4FE147873F25`.
  Terminal safety policy rejects both attempted cleanup forms before execution, leaving
  the exact 32-file Temp directory intact. This preserves the required continuation;
  no second round or product work opens before the bounded performance review.

## 2026-08-11 — T37 Stage F3C enumeration repair accepted

- Formal and adversarial QA independently accept `77fe380` with P0–P3/GAP all zero.
  Complete non-I/O and five-I history sets, three restricted-catalog mutations,
  candidate-state fail-closed output/cursor gates, envelope attacks, ceiling, NTFS,
  legacy bytes, exact scope, and cleanup all pass.
- Only the first fair production reverse round is now open: 32 serial shards over seeds
  1..20000, 1,000,000 new probes and 900 MiB RSS per shard, external outputs, and one
  increment per incomplete shard before any second increment. All content and UI remain
  closed pending round evidence and review.

## 2026-08-11 — T37 Stage F3C enumeration repair candidate

- Source checkpoint `77fe380` changes only the authoring tool and standalone reverse test.
  It preserves failed memoization before the first candidate, prevents successful
  candidate-enumeration frames from becoming false failed states, and fails closed on
  candidate-bearing cursor/output attempts without changing the frozen schema.
- A seven-type independent catalog oracle and separated three-T target now prove all six
  history orders; an I/O-only mutation fails on the pinned three-descriptor summary.
  Standalone, typecheck, the full `46`-file/`430`-test suite, 767-module build, exact scope,
  Temp cleanup, and zero owned process pass. Production search remains QA-closed.

## 2026-08-11 — T37 Stage F3C non-I/O enumeration defect

- A mutation-sensitive three-T fixture proves six physical forward orders, but the real
  canonical reverse state emits only three before completion. The targeted standalone
  run fails on that exact set difference; exhausted successful frames are being recorded
  as failed and prune the complementary orders.
- The prior test-only repair boundary is superseded. Only the authoring tool and its
  standalone reverse test may reopen, preserving cursor/output schemas, legacy and reverse
  bytes, probe accounting, and all pre-first-candidate production behavior. Search remains
  closed through final gates and fresh independent QA.

## 2026-08-11 — T37 Stage F3C complete-set QA rejected

- Formal QA accepts the full implementation/test chain with P0–P3/GAP all zero, but an
  independent adversarial review rejects `1686963` with `P2 1 / GAP 1`. Every exact-set
  fixture uses only I/O, so a helper regression that re-filters the canonical catalog to
  those types would still pass.
- Only `tools/search-puzzle-v3-prototype-reverse.test.mjs` may reopen. It must prove the
  traversal receives an independently complete catalog and add a non-I/O exact-set case.
  Production source and the first 32-shard reverse round remain closed pending fresh QA.

## 2026-08-11 — T37 Stage F3C complete-set test candidate

- Test-only checkpoint `1686963` replaces restricted first-candidate assertions with
  one canonical catalog/state that resumes after every candidate through natural
  completion. Exact reverse history sets now match an independent physical-drop oracle
  for separated/contacting O/O, both mixed queue orders, piece support, and floating
  upper geometry; floor/upper/spawn domain boundaries are explicit.
- Prior token, descriptor, exact-ceiling, hard-link, distinct-file, forward-byte, Core,
  and cleanup regressions remain active. Post-last-edit standalone, typecheck, complete
  suite (`46` files / `430` tests passed; `2` / `10` skipped), 767-module build, exact
  one-path scope, Temp cleanup, and zero owned process pass. Search remains QA-closed.

## 2026-08-11 — T37 Stage F3C reverse repair QA rejected

- Independent QA rejects repair `77bc7fc` with `P2 1 / GAP 5`. The replacement test
  calls `advanceReverse` only to its first candidate and hand-swaps oracle-selected
  restricted catalogs; it does not enumerate one canonical traversal through
  `complete-not-found`, so complete forward/reverse history-set equality is unproven.
- Only the standalone reverse test may reopen. It must compare a canonical-catalog,
  single-state complete reverse set with an independent forward set across same-type,
  mixed, support, upper-obstruction, and spawn-domain cases. Production search remains
  closed, and fresh QA must also execute the five deferred live reproductions.

## 2026-08-11 — T37 Stage F3C seeded-reverse repair candidate

- Source checkpoint `77bc7fc` changes only the authoring tool and standalone reverse
  test. It binds partial tokens to reconstructed frame candidates, enforces the absolute
  cumulative probe ceiling, rejects existing resume/output hard links by file identity,
  and replaces the tautological differential assertion with an independent forward
  oracle compared to real reverse traversal in mixed and both same-type orders.
- Direct recomputed-token, descriptor, hard-link, `999,999,999 + 1`, and no-output
  overflow regressions pass. Post-last-edit standalone, typecheck, focused renderer
  diagnostic (`54/54`), complete rerun (`46` files / `430` tests, `2` / `10` skipped),
  and 767-module build pass. Forward bytes, exact scope, cleanup, and protected
  exclusions pass. Production search remains closed pending independent repair QA.

## 2026-08-11 — T37 Stage F3C seeded-reverse implementation rejected

- Formal QA rejects `1f85a0a..da2c67d` with `P1 2`; adversarial QA independently
  rejects it with `P1 1 / P2 2`. The four distinct blockers are an unbound partial-token
  candidate index/descriptor, cumulative probe-ceiling overflow after resume, NTFS
  hard-link resume/output aliasing, and a forward/reverse set test that never executes
  reverse traversal.
- Production reverse search remains closed. One bounded repair may touch only the
  existing authoring tool and standalone reverse test, must add direct regressions for
  all four defects, and must pass fresh independent QA before any shard, fixture, Core,
  content, migration, or UI checkpoint opens.

## 2026-08-11 — T37 Stage F3C seeded-reverse implementation candidate

- Three bounded commits `95e23bb`, `2aac9f2`, and `da2c67d` implement the accepted
  seeded-reverse contract only in the authoring tool and its standalone Node test.
- Post-last-edit standalone contract test, typecheck, full suite
  (`46 passed / 2 skipped` files; `430 passed / 10 skipped` tests), 767-module build,
  forward byte hashes, diff/scope, Temp cleanup, and zero-owned-process checks pass.
- The candidate is nonvisual and changes no game/browser runtime, so Playwright evidence
  does not apply. Production reverse search and every fixture/Core/content/UI path remain
  closed pending independent implementation QA.

## 2026-08-11 — T37 Stage F3C seeded-reverse contract accepted

- One-line closure `09e90c5` corrects the F3A source to `a1e37f1`; F2 remains
  `74148ec` and F3B remains `308233c`.
- Independent QA accepts full contract range `89ae4ad..09e90c5` with
  `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`, including exact domain/schema/hash bytes,
  cursor/result and null/STOP matrices, scope, and protected exclusions.
- Implementation is open only for the existing authoring tool and new standalone
  reverse test. No reverse search, fixture, Core/content, migration, or UI path is open.

## 2026-08-11 — T37 Stage F3C seeded-reverse schema closure candidate

- Independent QA rejects first repair `9737663` with
  `P0 0 / P1 3 / P2 0 / P3 1 / GAP 0`. Probe/STOP priority, both empty hash vectors,
  equivalence, seven-mask state, cursor data, path scope, and exclusions pass.
- The second repair defines the queue hash over the full domain and the reverse trie over
  only the current half-open shard; pins every domain integer width and version literal;
  and enumerates all domain/shard/coverage/evidence/search/setup/frame/cursor/result
  fields and types.
- A total status/null matrix now covers trie-build RSS, resumable search stops, candidate,
  and complete-not-found. The stale F3A-only summary now reflects accepted F3A/F3B and
  pending F3C contract QA. Implementation and search remain closed.

## 2026-08-11 — T37 Stage F3C seeded-reverse contract repair candidate

- Exact-range QA rejects `155b82a` with `P0 0 / P1 1 / P2 1 / P3 0 / GAP 0` because
  probe/Merkle/cursor bytes and probe/STOP priority were not fully specified. Range,
  equivalence, same-type state, geometric dedupe, test scope, and exclusions pass.
- The repair freezes schema 3 / cursor 1, binary primitives and mask layout, canonical
  catalog/trie/domain/state/memo/probe/cursor/result hashes, canonical JSON/LF output,
  six exact probe outcomes, and filtered-descriptor accounting.
- Zero-probe unwind precedes deterministic budget-before-RSS admission; candidate and
  true stack completion win at their admitted boundary. Implementation and search stay
  closed pending independent repair QA.

## 2026-08-11 — T37 Stage F3C seeded-reverse contract candidate

- Independent read-only design review accepts freezing seeded reversed-trie hard-drop
  peeling with `P0 0 / P1 0 / P2 0 / P3 0`. This is contract authorization only; it
  does not accept a tool, candidate setup, or solvability claim.
- The contract preserves the exact seed/shard/Core setup domain and requires seven
  same-type forbidden masks, complete state/memo identity, canonical geometric dedupe,
  lossless DFS cursor resume without prefix replay, block/Merkle probe hashing, distinct
  STOP statuses, and final forward Core replay.
- Only `tools/search-puzzle-v3-prototype.mjs` and a new standalone Node test may open
  after exact-range contract QA. The sixth forward round, reverse search, Core, final
  fixture/test, published content, T27, and `progress.md` remain closed.

## 2026-08-11 — T37 Stage F3C fifth fair search round complete

- All 32 contiguous shards receive the same fifth increment and return
  `budget-exhausted` at cursor 1,562,500 with zero candidate, complete, or memory
  status. Domain, queue, range adjacency, and ordering remain unchanged.
- The invocation performs 40,000,000 replay plus 10,000,000 new probes for 50,000,000
  physical attempts. Cumulative new fair coverage is 50,000,000; replay-inclusive
  accepted placements, failed states, and trie nodes are
  `1,455,294 / 1,453,114 / 337,031`. This remains a fair prefix, not a negative result.
- The ordered manifest hashes to
  `A5A6A955372A1A914C87B01A8C3DDC581C5B54B41D8841AA275949FAA6C71EEC`.
  All exact Temp outputs are removed and no owned process remains. Because replay now
  costs four times the new coverage and would rise again, a sixth forward round pauses
  for an independent read-only seeded-reverse design review; no tool or product path
  opens yet.

## 2026-08-11 — T37 Stage F3C fourth fair search round complete

- All 32 contiguous shards receive the same fourth increment and return
  `budget-exhausted` at cursor 1,250,000 with zero candidate, complete, or memory
  status. Domain, queue, range adjacency, and ordering remain unchanged.
- The invocation performs 30,000,000 replay plus 10,000,000 new probes for 40,000,000
  physical attempts. Cumulative new fair coverage is 40,000,000; replay-inclusive
  accepted placements, failed states, and trie nodes are
  `1,164,487 / 1,162,739 / 337,031`. This remains a fair prefix, not a negative result.
- SHA-256 over sorted `filename:SHA256` lines joined with LF and no terminal LF is
  `14D1B742D64C36CC6EC247A92B7467149217C67E5AFD7137DAABE697CF21D616`.
  All exact Temp outputs are removed and no owned process remains. A fifth equal round
  may replay cursor 1,250,000 and add 312,500 probes per incomplete shard only after a
  fresh green/amber resource check.

## 2026-08-11 — T37 Stage F3C third fair search round complete

- All 32 contiguous shards over seeds `1..20000` receive the same third increment and
  return `budget-exhausted` at cursor 937,500 with zero candidate, complete, or memory
  status. Domain, queue, range adjacency, and ordering remain unchanged.
- The invocation performs 20,000,000 replay plus 10,000,000 new probes for 30,000,000
  physical attempts. Cumulative new fair coverage is 30,000,000; replay-inclusive
  accepted placements, failed states, and trie nodes are
  `873,726 / 872,398 / 337,031`. This remains a fair prefix, not a negative result.
- SHA-256 over sorted `filename:SHA256` lines joined with LF and no terminal LF is
  `D7CBB36B03EC4DA715208F8F94F35466FD3A5114D2C4E29CBF9F2B354BFC7DC3`.
  All exact Temp outputs are removed and no owned process remains. A fourth equal round
  may replay cursor 937,500 and add 312,500 probes per incomplete shard only after a
  fresh green/amber resource check.

## 2026-08-11 — T37 Stage F3C second fair search round complete

- The same 32 contiguous shards over seeds `1..20000` replay cursor 312,500 and each
  receive exactly 312,500 new probes under the accepted 900 MiB guard. All return
  `budget-exhausted` at cursor 625,000 with zero candidate, complete, or memory status.
- The invocation performs 10,000,000 replay plus 10,000,000 new probes. Cumulative new
  coverage across both fair rounds is 20,000,000; replay-inclusive accepted placements,
  failed states, and trie nodes are `582,850 / 581,851 / 337,031`. This remains a fair
  prefix, not a negative result.
- The unchanged domain and queue hashes are
  `9F88718E9DC7793483578E7A82E5C30890CC7F9E61673644AE771777A4639B7E` and
  `1F6278E6C699C1D81D6EE289BD42C1A820D0B984FFD1C973E50271E94160A27C`; the ordered
  32-file manifest hashes to
  `14197EB55C858699317467C48AAF6B1470DE07166FCC6E34E5FEFCE93BA059CC`.
  All exact Temp outputs are removed and no owned process remains. A third equal round
  may replay cursor 625,000 and add 312,500 probes per incomplete shard only after a
  fresh green/amber resource check.

## 2026-08-10 — T37 Stage F3C first fair search round complete

- All 32 contiguous shards over seeds `1..20000` receive exactly 312,500 new probes
  under the accepted 900 MiB guard. Ranges are adjacent, domain hash is identical, and
  aggregate new coverage is exactly 10,000,000 probes.
- Every shard returns `budget-exhausted` at cursor 312,500; there are zero candidates,
  complete shards, or RSS stops. Aggregate accepted placements, failed states, and trie
  nodes are `291,609 / 290,910 / 337,031`. This is a fair prefix, not a negative result.
- The ordered 32-file manifest hashes to
  `DC0C992BBF7D72605D849209036AA1F12E3A011D093CE1F8776B6782D7243CA9`; all Temp
  outputs are removed and no owned process remains. A second equal same-domain round may
  now replay cursor 312,500 and add 312,500 probes per incomplete shard.

## 2026-08-10 — T37 Stage F3C fair-shard tool accepted

- Tool `1a9c9da` upgrades the fixed-mask authoring search to schema 2 with contiguous
  seed shards, deterministic inline replay cursors, exact domain/queue/probe/memo
  digests, pre-probe budgets, and fail-closed STOP propagation. The accepted forward
  Core-equivalent search and candidate-only claim remain unchanged.
- Small-domain union, separate byte repeats, one-shot versus resumed hash equality,
  invalid-input no-output checks, and 128 MiB cursor preservation all pass with exact
  Temp cleanup and no owned Node process.
- Independent read-only QA accepts `8ff907a..4ad42ba` with
  `P0 0 / P1 0 / P2 0 / P3 0`, independently reconstructs the queue/domain bytes, and
  reproduces every runtime gate. Its RSS stop occurs at a different live seed count but
  still before probes with cursor unchanged. The frozen first fair round may now run;
  product and final fixture/test paths remain closed.

## 2026-08-10 — T37 Stage F3C fair-shard contract accepted

- The contained global-budget run is replaced by a same-domain scheduling contract:
  contiguous seed shards, deterministic replay cursors, pre-probe budget checks, and a
  distinct STOP path keep incomplete states out of the failed memo.
- Repair `1ccc04a` binds the actual xorshift32/Fisher–Yates queue mapping through exact
  sequence/domain bytes and adds ordered probe plus sorted completed-memo hashes. The
  acceptance gate compares one-shot and resumed search at the same absolute cursor,
  while each invocation independently remains byte deterministic.
- Independent read-only QA accepts `a1bcf15..1ccc04a` with
  `P0 0 / P1 0 / P2 0 / P3 0`, closing the earlier queue-identity and replay-proof
  findings and revalidating four-path scope, commit budget, partition math, and protected
  exclusions. Only the standalone tool implementation opens; substantive search and
  product/fixture paths remain closed.

## 2026-08-10 — T37 Stage F3C first candidate batch contained

- The accepted tool runs its single authorized seeds `1..20000` batch with a
  10,000,000 attempted-landing budget and 900 MiB RSS guard. It stops after 8 seconds
  with `budget-exhausted`, no setup candidate, 267,472 trie nodes, 10,000,001 attempted
  landings, 289,828 accepted placements, and 289,654 failed states; the RSS guard does
  not fire.
- The 853-byte explicit Temp output hashes to
  `1144E031CCA91E843F903E002FD79D37BA9507CBCC7856AE1A4DAEF7CF38223D`, then is removed
  exactly; no owned Node process remains and no repository path changes.
- A global depth-first budget does not exhaust every seed in the trie. This run is not a
  range-negative result and does not authorize later seeds or a blind budget increase.
  F3C now requires a frozen deterministic same-range fair-shard/resume revision before
  the standalone tool path or another substantive search reopens.

## 2026-08-10 — T37 Stage F3C prototype tool accepted

- Tool checkpoint `8e86207` adds one 356-line, non-product authoring search for the
  fixed 80-cell ten-row prototype mask. Explicit seed range, attempted-landing budget,
  RSS guard, and output path contain the search; Core-equivalent seven-bag, hard-drop,
  off-mask, hidden, setup-clear, and same-type-source rules constrain candidates.
- Two isolated small smokes stop at the intentional budget with byte-identical SHA-256
  `1869CAD02860106A349064BD3D0B7265E8F40FED7C1303B39DBDFB6082B2097A`; syntax and
  uint32-wrap rejection pass, and no temporary output/process/listener remains.
- Independent read-only QA accepts `5bd76e2..85b48c2` with
  `P0 0 / P1 0 / P2 0 / P3 0`. It independently verifies the exact five-path range,
  Core equivalence, 80-cell mask, `1 / 2 / 2 / 2 / 3` completion route, deterministic
  runtime evidence, and protected-path exclusions. One bounded substantive candidate
  batch may now run; tool output alone is never F3C admission.

## 2026-08-10 — T37 Stage F3B injected mechanics accepted

- Test checkpoint `308233c` adds exact four-anchor board/engine coverage and a
  test-only injected definition with four independent public-command completion
  witnesses. Removing only the tested anchor changes the first real I lock from rows
  `24..27` to `33..36` and removes its direct support identity; no production Core or
  published Puzzle definition changes.
- Typecheck and the final focused board/flow/evidence/presentation suite pass
  `4 files / 36 tests`. The unchanged two-piece Puzzle preview test is included;
  browser evidence is not applicable because no published or rendered state changes.
- Independent read-only QA accepts `3aa6766..6c3286c` with
  `P0 0 / P1 0 / P2 0 / P3 0`, reproduces both gates, verifies the exact injected
  board/targets, two-clear mapping, all four remove-only comparisons, unchanged
  presentation blobs, commit budgets, and protected-path exclusions. F3C may now open
  only its frozen non-published ten-row fixture/test pair.

## 2026-08-10 — T37 Stage F3A Puzzle definition capability accepted

- Source `a1e37f1` expands clean-room authoring validation to 5–20 legal zero-clear
  setup drops, 3–10 contiguous bottom target rows, and 0–4 unique anchors in visible
  rows 8–19. Malformed, duplicate, out-of-range, target-covered, fifth-anchor, and
  combined ordinary-plus-anchor full-row definitions fail closed in both validation
  modes; no live definition changes.
- The dedicated baseline test embeds and recomputes all 38 frozen revision-2 behavior
  hashes with the exact canonical JSON/LF serializer. Focused tests pass `16/16` and
  typecheck passes.
- Independent read-only QA accepts `da264f4..b30ee1f` with
  `P0 0 / P1 0 / P2 0 / P3 0`, reproduces the gates, confirms the canonical
  library/order/seed/route surface is unchanged, and verifies protected paths are not in
  the six-path range. Browser evidence is not applicable because no published/rendered
  state changed. F3B injected-definition mechanics may now open.

## 2026-08-10 — T37 Stage F3 capability contract frozen

- Independent read-only review accepts `628f66d..dc035a3` with
  `P0 0 / P1 0 / P2 0 / P3 0`. The repaired contract explicitly rejects an initial row
  completed by ordinary cells plus anchors in canonical and authoring-override modes,
  freezes an independent 38-entry literal behavior-hash gate, and names the exact F3C
  fixture/test/tool checkpoint split.
- The reviewed range contains only the four declared contract paths and excludes T27,
  `t27-r1-followup`, and `progress.md`. F3A may now open only
  `puzzles.ts`, its direct test, and `puzzleV3BehaviorBaseline.test.ts`; published
  curriculum content, migration, progression, and UI remain closed.

## 2026-08-10 — T37 Stage F2 strict Puzzle search accepted

- Expanded the complete public-control landing domain with counter-clockwise token `Q`
  and both SRS directions. Proof state identity now includes numerically canonical
  target and anchor-support masks; definition-aware replay/certification share one
  injected definition, and anchor/support states use a conservative zero lower bound.
  Behavior source is `74148ec`.
- Reproved all three ordinary certificates without changing their routes, optima,
  mastery thresholds, or technique signatures; only exact frontier/transition/prune
  statistics changed. Complete shorter-depth searches admit the current one-anchor and
  test-only two-anchor `t5r-drift-08` fixtures at four locked tetrominoes with hashes
  `e9b71c20` and `696f86a0`.
- Initial QA rejected a misleading CCW fixture whose landing was also reachable by
  clockwise `CRH`. Checkpoint `8220b43` now compares complete C/Q and clockwise-only
  domains directly: 20 versus 19 signatures, with unique Q-only witness
  `S:0,32|0,33|1,33|1,34`. Status correction `88ed3aa` and proof-metric comment repair
  `1507dab` close the remaining findings.
- Final typecheck, route `8/8`, Mastery `4/4`, exact `5/5`, complete suite
  (`417 passed / 10 skipped`), and the 767-module build pass. Two independent read-only
  reviews accept `1d7e573..1507dab` with `P0 0 / P1 0 / P2 0 / P3 0`; no T27,
  `t27-r1-followup`, or `progress.md` path enters the seven-path range. Stage F3 may now
  open definition capability/validation, not curriculum content.

## 2026-08-10 — T37 Stage F1 Puzzle v3 contract frozen

- Froze the active campaign identity at exactly 5 Intro / 25 Easy / 16 Hard levels:
  38 definitions preserve behavior, eight rebuild under the same stable IDs, and four
  redundant Hard IDs retire without ordinal remapping. Eight unchanged Easy technique
  keys each gate a declared subset of the sixteen Hard levels at strict optimum plus
  five locked tetrominoes.
- Defined one operation as one real `piece-locked` tetromino and froze route-token v2,
  schema-8 proof fields, ordinary/one-anchor/two-anchor admission fixtures, and the
  10 × 20 first-pass capability boundary. F2 must add public counter-clockwise SRS,
  anchor-support state identity, definition-aware exact replay/proof, and a zero anchor
  lower bound before any level definition changes.
- Pinned a canonical JSON/LF/SHA-256 serializer and all 38 preserve hashes from baseline
  `e675389`. Revision-3 migration uses a literal historic 50-ID decoder, leaves v5
  storage untouched, and maps v5 `bestPieceCounts` to v6 `bestLockedPieceCounts` only
  for a matching stable ID and frozen behavior hash.
- Candidate commits `740e3c9` and `b8b6874` stay within checkpoint budgets and touch
  only five declared contract paths. Independent QA reproduces all hashes and roster
  counts and confirms no protected T27 or `progress.md` path entered the range; its
  only stale-status P2 is resolved by this coordinator disposition.

## 2026-08-10 — T37 Stage E whole-piece materials technically accepted

- Replaced the former ordinary-body-plus-core presentation with four complete Mutation
  materials across Next, active/Ghost, settled board, captured clear, and activation:
  cyan ice crystal, contained lava mineral, restrained gold, and violet gravity mass.
  Ordinary seven-colour pieces gain only a quiet triangular facet baseline. Product
  checkpoints are `fa3a70e` and `581c004`; deterministic once-per-piece Core rules are
  unchanged.
- Checkpoint `ba3b0e3` gives Chinese and English players whole-material rules and exact
  Next accessible names without visible carrier/core language. Audio checkpoint
  `a184952` preserves every accepted sound while carrying separate Mutation triggers
  along the renderer's visual FIFO and cancelling current/future Mutation cues on
  restart. Test repair `1058dbd` directly proves the old queue tail is reset.
- Evidence `731bf6f` binds 20 Next/active/Ghost/settled/clear/activation frames to
  product source `a184952`. Matrix repair `8e336fe` adds all three themes, full/reduced
  motion, Chinese/English, and desktop/portrait/mobile layouts. All 26 hashes match;
  every case reports one Canvas, zero DOM cells, no overflow, and zero browser errors.
- Final typecheck, the complete suite (`44 passed / 2 skipped` files; `412 passed / 8
  skipped` tests), and the 767-module build pass. Independent audio, static, and
  original-detail visual QA close their initial P1/P2 findings and report
  `P0 0 / P1 0 / P2 0 / P3 0`. Protected T27 evidence and `progress.md` remain outside
  the committed range. Player visual/play review remains open; Puzzle proof foundation
  is next, and site identity stays deferred to the final proposal gate.

## 2026-08-10 — T37 Stage D1 route handoff technical candidate awaiting player review

- Replaced URL-route changes with the bounded **Settled Handoff** owner: one latest
  request controls atomic History/React state, forward/back/neutral direction, a stable
  named viewport, Canvas-ready Game capture, continuous fallback, resolved reduced
  motion, focus restoration, and terminal idle cleanup. Product source is `5329353`.
- The first evidence review correctly rejected competing destination reveals. Repairs
  `97e043f` and `5329353` remove the Puzzle stage/grid animations and Game
  `surface-in`; Game countdown/HUD motion remains board-owned and route handoff uses no
  scale, blur, wipe, spring, or child cascade.
- Evidence `ab58b46` binds 20 real Chromium PNGs and 23 portable SHA-256 entries to the
  final product source. Native `0/60/120/200 ms`, Game Canvas-ready, fallback, reduced,
  interruption/latest-owner, mobile, and all six Chinese/English × theme combinations
  pass with zero audit failures or browser errors. The prescribed two-pass client
  reaches countdown 2 and then `playing` without an error artifact.
- Final typecheck, the complete suite (`44 passed / 2 skipped` files; `410 passed / 8
  skipped` tests), and the 767-module build pass. Independent architecture QA also runs
  `79/79` focused tests; architecture and motion reviews both ACCEPT with
  `P0 0 / P1 0 / P2 0 / P3 0`. The candidate excludes inherited T27 evidence and
  `progress.md`. Human play at normal speed remains the acceptance gate.
- The next independent slice replaces the Microsoft-like four-pane favicon with the
  vector-first **Morph Core / 异形材质核** direction: one connected asymmetric faceted
  core, a small offset warm centre, stable three-theme identity, and verified
  `16/32/64 px` tab readability. No manifest, service worker, or PWA surface is added.

## 2026-08-10 — T37 Stage C accepted; staged transition and icon work opened

- The player reports that all preceding modifications pass. This closes the human
  listening/play gates for the strengthened Bomb join, remaining Stage-C cues, and the
  shared one-through-four-line continuous clear while preserving their accepted bytes,
  timing, Core atomicity, and earlier evidence. The still-unavailable Ice 2
  uploader-original WAV/hash remains an explicit provenance follow-up.
- The player authorizes later T37 goals to proceed in bounded stages. Stage D1 is frozen
  as a URL-route-only **Settled Handoff** rewrite: latest-request ownership, atomic
  History/React commit, directional `200 ms` near-opaque settle, Canvas-ready native
  capture, continuous fallback, no-translation reduced motion, focus/context recovery,
  and one live route/Canvas. Results/mode-intro motion remains a later slice.
- The current four-equal-quadrant data-URI favicon is rejected because its dominant
  silhouette resembles a Microsoft window mark. A separate later identity slice will
  introduce an original vector-first TetraMorph transformation mark, verify
  `16/32/64 px`, avoid commercial trade dress, and keep PWA installation out of scope.

## 2026-08-10 — T37 accepted clear language extended to one line

- Reused the human-accepted R3 continuous clear for one line: the captured material now
  resolves centre-out over `0–300 ms`, remains continuous across Core's unchanged
  `200 ms` atomic commit, and uses stationary opacity for Puzzle/reduced motion. The
  old one-line precision-cut/chip production overlay is removed. One-line Studio audio
  remains at `0 ms`; accepted 2–4-line timing/materials are unchanged.
- Contract `71f74af` and product/tests `aab8ed8` pass final typecheck, the complete suite
  (`402 passed / 8 skipped`), the 767-module build, and independent focused source QA
  (`72/72`, P0–P3 all zero). No Core, audio, T27, or `progress.md` path entered the
  source range.
- Evidence `0d443ed` adds 47 source-bound real Pixi frames, four contact sheets, a full
  Chinese gameplay page, and prescribed-client states with zero failures/browser errors.
  Independent original-detail evidence QA reports P0–P3 all zero after confirming the
  `199.9/200/250/300 ms` sequence, restrained variants, Freeze companion, and lifecycle
  cleanup. The candidate now waits only for normal-speed single-line player acceptance;
  the accepted 2–4-line effect remains closed.
- Pre-push validation from a fresh Git checkout found that one HUD CSS test assumed LF
  bytes and failed after Windows converted the same committed CSS to CRLF. Test-only
  checkpoint `27e998e` accepts either newline form. A second fresh checkout passes
  committed-lockfile `npm ci`, typecheck, the full suite (`402 passed / 8 skipped`), and
  the 767-module build; Gitleaks reports no findings across the complete outgoing range.

## 2026-08-10 — T37 continuous multi-line clear accepted; single-line extension opened

- Replaced the rejected `50 ms` / three-step 2–4-line clear with a continuous
  renderer-owned `300 ms` centre-out track. Two rows use `210/120 ms` windows and
  three/four rows use `120 ms` windows, producing at least `30 ms` overlap between
  adjacent rows while preserving the accepted Studio starts and one-line path.
- Normal cells now pass through sampled highlight, scale, and alpha states. Unfinished
  original material continues through Core's unchanged `200 ms` atomic commit for at
  most `100 ms`, beneath the collapsed board/current piece; Puzzle and reduced motion
  use stationary opacity, with Puzzle targets and all four Mutation materials retained.
- Product `40b3e76`, continuity repair `b3f2144`, and evidence `914a937` pass final
  typecheck, the full suite (`401 passed / 8 skipped`), the 767-module build, a
  53-frame zero-error real Pixi/browser audit, and independent `109/109` review with
  `P0 0 / P1 0 / P2 0 / P3 0`. The first QA pass's three continuity/cleanup findings
  are closed. The player now accepts this 2–4-line effect.
- The same verdict explicitly reopens one line. Its next bounded implementation must
  reuse the accepted `0–300 ms` centre-out material track and stationary restrained
  form while preserving the `0 ms` Studio cue, tick-12 Core commit, accepted multi-line
  behavior, Mutation/Puzzle material agreement, cue cap, and cleanup. Nothing is pushed
  until that extension has fresh evidence and review.

## 2026-08-10 — T37 classic centre-out multi-line clear awaiting play acceptance

- Replaced the rejected beat-triggered whole-row disappearance for 2–4-line clears with
  a classic game-machine presentation: every existing Studio row beat first confirms
  the complete row, then erases from the centre outward as `10 → 8 → 4 → 0` visible
  cells. Row order and accepted `0/180`, `0/90/180`, and `0/60/120/180 ms` audio timing
  remain unchanged.
- Core still performs one atomic stack collapse at tick 12 / 200 ms. A translucent
  renderer-only `8 → 4 → 0` two-tick bridge completes the final row without delaying
  input; reduced motion and Puzzle use a stationary no-tail form, and Anchor/Bedrock
  cells remain fixed.
- Contract `d9e41b4`, source/tests `d1063b8`, and evidence `354c465` pass final
  typecheck, the complete suite (`400 passed / 8 skipped`), the 767-module build, a
  25-frame zero-error browser audit, and independent focused tests `70/70`. Read-only QA
  reports `P0 0 / P1 0 / P2 0 / P3 0` after inspecting every frame and confirms that
  Core/audio plus inherited T27/progress paths are outside the candidate. Human play at
  normal speed remains the acceptance gate.

## 2026-08-10 — T37 Bomb and multi-line feedback candidate awaiting listening

- Strengthened Bomb as a contained pressure-to-impact gesture: quiet 74 Hz pressure
  leads into the main low body and deterministic low-passed air at the renderer's
  existing 220 ms impact, followed by a 235 ms low tail. The visual 620 ms sequence,
  sixteen-voice ceiling, Action A, Ice 2, and other accepted anchors are unchanged.
- Replaced simultaneous 2–4-line visual removal with complete-row releases from top to
  bottom during Core's existing 200 ms hold. Audio and visuals share one timing source:
  two rows use `0/180 ms`, three use `0/90/180 ms`, and four use
  `0/60/120/180 ms`; Core still collapses the stack atomically on tick 12.
- Browser inspection found that repeated AudioContext clock reads could skew later
  layers under load. Source `41afc78` pins every clear or Bomb event to one clock origin.
  Final typecheck, the complete suite (`400 passed / 8 skipped`), and the 767-module
  production build pass.
- Evidence `dc70f10` binds exact audio starts, ten staged-clear frames, live and
  prescribed-client pages, reduced motion, Core atomicity, one Canvas, zero DOM cells,
  cleanup, and zero browser errors to `41afc78`. QA `a096fc5` reports
  `P0 0 / P1 0 / P2 0 / P3 0` and `98/98` targeted tests. The result remains a focused
  human listening/play candidate rather than an accepted sound decision.

## 2026-08-09 — T37 Mutation speed and Supergravity settlement corrected

- Restored Mutation's complete six-line gravity ladder through 48/54/60-line tiers of
  10/8/6 ticks, so ordinary late-game gravity again reaches 0.1 seconds per cell while
  preserving Ice's separate 1.0-second override and leaving Classic unchanged.
- Replaced inherited whole-board column compaction with covered-piece-only settlement.
  Existing locked cells now remain fixed collision support; each occupied column of the
  Supergravity-covered tetromino may descend independently without tunnelling through or
  pushing the settled board. Ghost, lock, carrier geometry, and clear decisions share
  the same settlement function.
- The exact reported floating-support reproduction keeps the old cell at `(8,34)`,
  settles the covered O cells at `(8,32)`, `(8,33)`, `(9,38)`, and `(9,39)`, leaves the
  bottom `(8,39)` gap empty, and starts no false clear. Chinese and English rules now
  state that Supergravity does not move locked cells.
- Contract `6ffef46`, product source `646b865` / `ae75f1e`, evidence `c691d54`, and
  accepted status checkpoint `4722927` pass focused tests (`50/50 + 56/56`), typecheck,
  the complete suite (`381 passed / 8 skipped`), the 761-module build, one-Canvas and
  zero-browser-error evidence, and final independent QA with P0–P3 all zero. Inherited
  T27 evidence and `progress.md` remain untouched; T37 returns to R4 human listening.

## 2026-08-07 — T32 mastery certificate fingerprints refreshed

- Anchor-supported Puzzle cells became future-relevant canonical state, which changed
  the initial-state fingerprint of the three strict mastery prerequisites without
  changing their boards, queues, legal search graph, routes, optimum, progression, or
  thresholds.
- Contract checkpoint `d31a84b` reopened the exact-proof boundary; source/test checkpoint
  `3d69132` refreshed only the three frozen `initialStateHash` values.
- The opt-in exhaustive suite passed `3/3` with every non-hash proof field unchanged;
  the focused T31/T32 set passed `212/212`, and final typecheck, complete suite
  (`380 passed / 8 skipped`), and production build passed.
- This is certificate metadata maintenance with no visual or interactive delta. Existing
  accepted T31/T32 browser evidence was audited and therefore was not regenerated.

## 2026-08-07 — T36 kinetic-harmonic audio candidate awaiting listening

- Human listening rejected T35, so T36 replaced every audible cue with deterministic
  buffered procedural instruments: felt, impact, ribbon, glass, shimmer, and pulse.
  All 27 cue IDs now use the new vocabulary while retaining the five buses,
  sixteen-voice ceiling, priority, master controls, and exact lifecycle cleanup.
- Removed the default continuous ambient bed, retained the Ambient bus for compatible
  future ownership, kept timed Mutation states loop-free, and gave Supergravity no
  continuous or landing sound. Countdown is exactly three related pulses with a longer
  resolving final beat and no cover-exit sound.
- The bounded companion visual change removes the decorative glow behind the
  Mutation-status heading without altering its content or layout. Product/visual source
  ends at `39216d1`; WAV evidence is `4205612`, and browser evidence is `4433aaf`.
- Six source-bound mono 48 kHz WAV suites report finite peak/RMS values and zero clipped
  samples. Final typecheck, the complete suite (`380 passed / 8 skipped`), production
  build, one Canvas, zero DOM board cells, running AudioContext, live mute/volume,
  correct board geometry, and zero browser errors pass; port 4189 was released.
- Independent read-only QA accepted candidate `4433aaf` with no blocking finding.
  T36 remains **CANDIDATE / LISTENING REQUIRED** because tests, measurements,
  screenshots, and QA cannot approve timbre, balance, fatigue, or device loudness.

## 2026-08-07 — T35 material-gesture audio candidate awaiting listening

- Human listening rejected T34 despite its automated acceptance record, so T35 replaced
  the audible palette end to end while retaining its safe five-bus, priority, volume,
  sixteen-voice, and lifecycle infrastructure. The new language uses felted controls,
  modal contact, filtered air, damped mass, spatial clear blooms, concise Mutation
  identities, natural Survival pressure, restrained UI feedback, and non-pitched room
  tone rather than exposed notes, chord stacks, or sustained state loops.
- Product audio source ends at `a2b424d`. Focused audio tests pass `18 / 18`; final
  typecheck, complete suite (`378 passed / 8 skipped`), production build, and live
  browser evidence pass. Candidate browser record `ff17f83` verifies one Canvas, zero
  DOM board cells, a running AudioContext with working mute/volume, completed countdown
  and input, zero page/console errors, and released temporary resources.
- Five directly playable 48 kHz WAV suites cover controls/contact, 1–4 clears,
  Mutation identities, Survival/UI/countdown, and a representative interaction mix.
  All report zero clipped samples. Renderer `f09620e` embeds its full source SHA in the
  portable manifest; bound output is recorded at `30501c3`.
- Independent read-only QA reports no blocking finding and no P0/P1/P2 issue. Its only
  P3 provenance note is resolved by the embedded SHA. T35 remains **CANDIDATE /
  LISTENING REQUIRED** until the user explicitly accepts the sound; automation is not
  treated as proof of timbre, fatigue, identity, masking, or device loudness.

## 2026-08-06 — T34 responsive gravity instrument audio accepted

- Rebuilt TetraMorph's procedural SFX as one calm responsive gravity instrument across
  explicit Gameplay, Reward, Mutation, Ambient, and UI buses. Layered oscillator body,
  harmonic support, deterministic filtered texture, and quiet spatial tails now share
  a bounded sixteen-transient-voice lifecycle beneath the existing compressor.
- Re-authored movement, rotation, drop/lock, 1–4 line rewards, Mutation activations,
  Survival hazards, and UI transitions with a clear response hierarchy. Timed Mutation
  states remain silent, no music or sample assets were added, and Deep Tide, Mineral
  Mist, and Sunstone receive only extremely quiet procedural room tones.
- Product source `a99a934` passes focused audio/runtime tests `48 / 48`, final typecheck,
  the complete suite (`391 passed / 8 skipped`), and production build. Evidence
  `67325a9` records live enable/mute/volume controls, all three theme selections, one
  Canvas, zero DOM board cells, and zero browser errors.
- Independent read-only QA accepted `4593acf..67325a9` with no P0/P1/P2 finding. The
  evidence browser/server was released; subjective timbre and device loudness remain a
  human listening boundary. Inherited T27 evidence and `progress.md` remain untouched.

## 2026-08-06 — T33 five-piece Supergravity coverage accepted

- Replaced Mutation Supergravity's elapsed-time ownership with a deterministic budget
  covering the next five successfully spawned tetrominoes. Each claimed piece keeps an
  immutable landing latch through projection and lock, so the fifth piece remains
  Supergravity-active after the visible future quota reaches zero; the sixth is normal.
- Re-triggering refreshes the future quota to five without altering the airborne piece.
  Status and Chinese/English rule copy now communicate pieces rather than seconds.
- Product source `60c3fdd`, rule-copy repair `909f904`, and current-source evidence
  `b887994` pass typecheck, the full suite (`388 passed / 8 skipped`), build, and the
  bounded browser audit (`remaining: 4`, active latch true, one Canvas, zero failures).
- Independent read-only QA reports PASS with no remaining P0-P3 finding. The evidence
  server was stopped and port 5190 released; inherited T27 evidence and `progress.md`
  remain untouched and unstaged.

## 2026-08-06 — T31-R1/R3 final current-tree acceptance

- Re-captured T31 against current `main`, replacing stale evidence provenance with
  source `50b272e` and evidence commit `a76e5e5`.
- Verified visible frameless Mutation status, independent Next, lower-row-first spatial
  entry with immediate complete landing guide, Supergravity expiry latch/preview/lock
  agreement, local Ice snowflakes and Supergravity gravity factors, and Reshape removal.
- Focused tests passed `145 / 145`; current full suite remained `387 passed / 8 skipped`;
  typecheck/build PASS; browser errors/failures 0; port 4211 teardown PASS; independent
  QA P0-P3 all 0.

## 2026-08-06 — T32 accepted Puzzle curriculum and anchor-safe clearing

- Accepted the rebuilt 10/20/20 Puzzle curriculum and its migration, solver,
  progression, and browser evidence chain.
- Fixed anchor-supported line clearing by recording exact placement identity, keeping
  multi-column placements intact across lower clears, preserving normal gravity for
  adjacent same-color placements, and removing cleared support cells before collision
  resolution.
- Final source `9092402`; evidence `75cc2f9`; typecheck/build PASS; full suite
  387 passed and 8 skipped; browser audit PASS with four captures and zero errors;
  final independent QA PASS.

## 2026-08-04 — T30 in-well arrival and route transitions accepted

- Replaced instant active-piece appearance with a renderer-only 204 ms assembly at
  already-safe visible coordinates. Cells materialize top-to-bottom and left-to-right;
  the ghost joins after the piece is legible, while movement, rotation, pause, restart,
  Puzzle undo, terminal state, destroy, and reduced motion retain explicit lifecycle
  behavior without changing Core timing or replay state.
- Routed Home, Puzzle library, gameplay, push/replace, and browser history through one
  bounded page handoff. Supporting browsers use the native View Transition API;
  unsupported browsers receive a short CSS entry fallback, and reduced motion removes
  translation and long duration. Page-local Puzzle selection does not animate or add
  history.
- Product source `19a17e6` passes focused tests, typecheck, the complete suite
  (`372 passed / 3 skipped`), and the production build. Evidence `2da8a37` captures
  early/middle/complete arrival frames and real route transitions with one Canvas, zero
  DOM board cells, zero browser errors, and zero audit failures.
- Independent read-only QA accepts exact range `dc2aaad..2da8a37` with P0 0 / P1 0 /
  P2 0 / P3 0. The bounded browser/server batch was released; inherited T27 evidence
  remains unstaged and excluded.

## 2026-08-04 — T29 complete SFX remaster accepted

- Rebuilt the complete procedural SFX hierarchy after player review found the prior
  mix globally too soft. Frequent movement and soft-drop cues remain concise and
  rate-limited; rotation, landing, Survival hazards, countdown/system events, Mutation
  items, and terminal outcomes now retain distinct contours without relying on a
  blanket master-volume increase.
- Made ordinary clears the strongest repeatable positive feedback family: one through
  four lines use related 2/3/4/5-voice profiles with monotonically increasing harmonic
  weight. Same-frame Mutation and terminal ownership prevents doubled or masked
  resolutions, while dense mixed activations remain below the sixteen-voice ceiling.
- Added direct regression coverage for all event schedules, invalid input, rate limits,
  same-frame priority, voice refusal/release/reuse, disable/re-enable, suspend, restart,
  idempotent destroy, and silence without AudioContext. No music, sample asset,
  dependency, gameplay, renderer, or UI change was introduced.
- Product source `ca5da48` passes focused audio tests `29/29`, typecheck, the complete
  suite (`365 passed / 3 skipped`), and the 759-module production build. Evidence
  `abce548` reports one Canvas, zero DOM board cells, zero browser errors, 2/3/4/5 clear
  voices, a 12-voice dense Mutation batch, correct live routing, and all 31 observed
  AudioContexts closed exactly once.
- Independent read-only QA accepts exact range `dfb9fbb7..abce548` with P0 0 / P1 0 /
  P2 0 / P3 0. The project-owned evidence batch was released, and inherited T27
  evidence remains unstaged and excluded.

## 2026-08-04 — T28 complete gameplay-feedback polish accepted

- Reworked the complete procedural SFX mix so movement, rotation, soft/hard drop,
  landing, countdown, system, Survival, and Mutation actions remain distinct while an
  ordinary clear becomes the unmistakable positive-feedback owner of its gameplay
  batch. The 1/2/3/4 clear family gains increasing 2/3/4/5-voice harmonic weight without
  noise, blast repetition, a master-volume jump, or breaking the 16-voice lifecycle.
- Added four deterministic board-local ordinary-clear profiles: Precision Cut, Dual
  Resonance, Cascade Fracture, and TetraMorph. They exclude anchors and permanent
  bedrock, bound fragment/tail ownership, preserve the fixed Core clear boundary, and
  fail closed for invalid counts. Reduced motion and Puzzle use simultaneous stationary
  substitutes with exact 100/117/133/133 ms cutoffs.
- Preserved resolution priority across ordinary landing, Mutation activation, Bomb,
  Puzzle completion, and lifecycle boundaries. The initial audio checkpoint remains a
  deliberate rejected rollback node; subsequent correction is isolated from Core,
  scoring, Puzzle data, themes, persistence, and dependencies.
- Product source `2c4e4ae` passes typecheck, the complete suite (`359 passed / 3
  skipped`), and the 759-module production build. Evidence `9784b1b` covers the live
  Classic run, full/reduced 1–4 profiles, and Survival/Mutation/Bomb/Puzzle conflicts
  with one Canvas, zero DOM cells, zero browser errors, and zero audit failures.
- Independent read-only QA accepted candidate `17d4f82..9784b1b` with P0 0 / P1 0 /
  P2 0 / P3 0 after a direct cutoff regression closed its sole preliminary P2. The
  project-owned browser/server batch was released; inherited T27 evidence remains
  unstaged and excluded.

## 2026-08-04 — T27-R1 centred themed stage and final Puzzle result accepted

- Completed the T27 personalised pace and feedback chain, then rebuilt gameplay as a
  centred three-column stage whose board is the only enclosing box. Next and Mutation
  status are frameless upper-left instruments, the larger four-value statistic rail is
  theme-legible on the right, and Home, Puzzle library, gameplay, Settings, interruption,
  and result surfaces share three complete persisted themes with Deep Tide as default.
- Added History-backed inner-page routes, theme-aware Home/Puzzle selection states,
  full-board countdown/pause/restart covers, exact Enter/R/Escape interruption
  semantics, a configurable deferred Classic gravity interval, sevenfold Survival
  rockfall, clearer timed Mutation feedback, a 0.2-second Mutation gravity floor, and
  direct regression coverage for their deterministic boundaries.
- Applied the last player correction by removing the decorative prism, orbiting marks,
  and particles above the Puzzle result's best-step value. The compact celebration now
  leads directly from `恭喜你破解谜题` to the step count and keeps both actions intact.
  A final loaded-style audit also removed the obsolete constellation, prism, fragment,
  responsive, and reduced-motion selectors from the shared stylesheet.
- Source-bound evidence at `06595e9` binds to source `db021f6` and reports board-centre
  delta 0, one Canvas, frameless Next, complete theme switching, accessible interruption
  controls, zero Puzzle-result emblem nodes, no horizontal overflow, and zero browser
  errors. Final gates passed: typecheck; `338 passed / 3 skipped`; 759-module build.
- Independent read-only QA accepted the complete range `ffb2ec9..401bfa5` with
  P0 0 / P1 0 / P2 0 / P3 0, then separately accepted the final delta
  `088afa2..06595e9` with the same zero-finding result. Dependencies were subsequently
  rebuilt from the committed lockfile without metadata drift; project-owned
  evidence/worker processes were released. Eight inherited `docs/evidence/t27/`
  working-tree deltas remain unstaged and deliberately excluded from coordinator closure.

## 2026-08-03 — T26 RC post-acceptance gate reliability recheck

- Re-ran the active requirement matrix against current Git, source, release copy, and
  source-bound browser evidence instead of relying on the prior accepted label. No
  product, mode, persistence, typography, responsive-layout, or showcase regression was
  found.
- The default Vitest worker count starved the Pixi renderer suite and expired its
  10-second setup hook. Checkpoint `c8ceb70` bounds the official command to two workers;
  the isolated renderer suite passes `45/45`, then the official full suite passes
  `318 passed / 3 skipped` without weakening a timeout or skipping coverage.
- Current typecheck and the 756-module production build pass. The package lock remains
  synchronized without a change, and a scoped OSV Scanner 2.4.0 run reports no issue.
  Product code remains byte-identical to the Phase-E/F evidence source.
- Independent read-only QA accepted exact range `bcbb229..5aceb53` with P0 0 / P1 0 /
  P2 0 / P3 0. It confirmed the worker cap limits concurrency without filtering tests,
  relaxing timeouts, or changing product behavior, so the RC is reaccepted.

## 2026-08-03 — T26 RC Phase E engineering closure verified

- Replaced broad Fontsource CSS delivery with the exact 13 WOFF2 faces used by the
  accepted semantic type system. Emitted font payload falls from 11,208,240 to
  4,752,492 bytes (`57.6%`) while the four approved roles remain unchanged; proven
  unused legacy font files and obsolete notices were removed.
- Added direct idempotent teardown tests for `GameRuntime` and its owned AudioContext.
  Source-bound evidence proves restart retains one active runtime and return Home
  restores zero Canvas/renderer RAF, four baseline listeners, one closed AudioContext,
  no QA bridge, and no DOM board cells or browser errors.
- Scoped `npm ls` and OSV Scanner inspection report a clean dependency tree and no known
  issue. The measured 546.62 kB main warning remains visible because threshold
  suppression or static chunk reshuffling would not reduce first-run execution weight.
- Final source `6af5403` passes typecheck, complete suite (`318 passed / 3 skipped`),
  756-module build, and evidence `323d01d` contains the inspected restart/Pause/Home
  frames. The evidence process was released and port 4191 has no listener. Phase F
  showcase packaging is now active.

## 2026-08-03 — T26 RC Phase D current mode feedback verified

- Made Survival's existing one-piece-ahead rockfall warning a deterministic
  48-playing-tick / 800 ms minimum lead. Fast locks wait only for the unconsumed lead,
  ordinary play adds no delay, pause freezes the counter, restart clears it, and one
  65 ms non-looping chirp marks the warning.
- Recorded reproducible public-command evidence for a real Classic clear, the exact
  Survival warning/rockfall boundary, every Mutation family at Next/carrier/activation,
  and the unchanged three-band Puzzle curriculum. The Bomb impact capture synchronizes
  to the renderer's real impact phase and records 72 fragments without injecting state.
- Revalidated the direct player-requested English typography, Geist Mono numeric role,
  compact three-tab Settings surface, clickable Back/Settings actions during Pause,
  and visible Next wells. Evidence `c83b156` binds to source `fcabe49` and reports zero
  clipping, overlap, wrong/legacy active font roles, horizontal overflow, browser
  errors, extra Canvas/DOM cells, or teardown residue.
- Final typecheck, complete suite (`316 passed / 3 skipped`), and 768-module build pass.
  The 546.62 kB main chunk remains an explicit Phase-E audit item. The owned browser
  process closed and port 4190 has no listener; Phases E-F remain open.

## 2026-08-03 — T26 RC Phase C accessibility and responsive surfaces verified

- Added one persisted player motion preference. With no saved choice TetraMorph follows
  `prefers-reduced-motion`; an explicit `on` or `off` selection drives both CSS and Pixi
  presentation without changing countdown, gravity, scoring, or replay timing.
- Added concise touch guidance after the gameplay-first and shortcuts-second keyboard
  groups, while retaining the compact three-tab Settings composition.
- Completed the current-source bilingual HUD/result/leaderboard matrix and fixed the
  underlying responsive Canvas defect: after portrait or short-landscape Settings,
  Pixi now synchronizes to the restored host before drawing the board and Next preview.
  Pause and Leave keep the complete live Next piece visible, avoid its rail, and leave
  the persistent Back and Settings pointer targets operative.
- Final source `06bd8b9` passes typecheck, the complete suite (`312 passed / 3 skipped`),
  and the 768-module build. The 546.05 kB application chunk warning remains declared for
  Phase E. Evidence `a062799` reports zero browser errors, clipping, overlap, wrong font
  roles, horizontal overflow, extra Canvas/DOM cells, or cleanup residue. Its preview
  PID was released and port 4189 is free. Phases D-F remain open.

## 2026-08-03 — T26 RC typography, Settings, and Pause correction verified

- Replaced the rejected inherited English/data typography with four explicit local
  roles: Playwrite NZ Basic for the wordmark only, Space Grotesk for ordinary English
  UI, Noto Sans SC for Chinese UI, and Geist Mono for scores, times, ranks, dates,
  percentages, keycaps, and numeric units.
- Rebuilt Settings as one compact three-tab console. Settings balances language and
  sound with full-width run actions; Controls keeps Gameplay and Shortcuts in two
  readable columns; Rules pairs concise current-mode rules with its record surface.
- Kept the persistent Back and Settings actions above the Pause interaction layer.
  Pointer hit tests and real transitions both pass while the single Canvas and visible
  Next preview remain mounted behind the compact pause sheet.
- Frozen source `310d83a` passes final typecheck, the complete suite (`309 passed / 3
  skipped`), and the 768-module build. Evidence `32b4457` covers nine bilingual and
  responsive states with zero clipping, text overlap, wrong font role, horizontal
  overflow, DOM board cells, or browser errors. The evidence server is released and
  port `4186` is free. This closes the correction slice, not the complete RC programme.

## 2026-08-03 — T26 RC Phase A project identity and compatibility verified

- Published TetraMorph as the package and README identity, with public Features,
  Technical Highlights, Controls, Development, and Screenshots sections.
- Moved current rule-intro, leaderboard, and Puzzle-progress writes to `tetramorph:*`.
  Existing `tetris:*`, `qingliu:*`, and `stack-order:*` values remain read-only,
  directly tested migration inputs and are never deleted during adoption.
- Renamed the maintained runtime/layout automation globals to
  `__TETRAMORPH_QA__` and `__TETRAMORPH_LAYOUT_QA__` across source, tests, and Python
  evidence scripts. A non-document active-name scan finds no retired project identity.
- Phase-A targeted tests, final typecheck, the complete suite (`308 passed / 3
  skipped`), and the 760-module production build pass. This nonvisual slice started no
  server or browser and is retained as four bounded rollback checkpoints.

## 2026-08-03 — T25 invariant Home mode typography implemented

- Bound the permanent English Home names `Classic`, `Survival`, `Mutation`, and
  `Puzzle` directly to the existing Playwrite NZ Basic English UI role. Chinese and
  English interface states now render the same handwritten labels while localized
  actions and accessible names continue to follow the selected language.
- Typecheck, the complete suite (`305 passed / 3 skipped`), and the 760-module build
  pass. A bilingual Chromium check after font readiness reports identical family and
  label geometry in both states with zero console errors. One unrelated renderer
  setup timeout on the first full run passed in isolation and on the full-suite retry.

## 2026-08-02 — T24 complete English typography and compact Settings accepted

- Unified all English interface prose under locally bundled Playwrite NZ Basic and
  moved scores, times, ranks, dates, countdowns, keycaps, and numeric units to IBM
  Plex Mono. Removed legacy Barlow/Fira package and notice state; a final real-browser
  audit also found and corrected the remaining English Puzzle category tabs.
- Rebuilt Settings as one compact responsive console: rules span the top,
  Controls/Keyboard form the balanced middle pair, and records span the bottom.
  English and Chinese populated/empty record states fit desktop, `720x960` portrait,
  and `1024x500` short landscape without text clipping or horizontal overflow.
- Pause is now an honest non-modal status window. Pointer actions remain available and
  the keyboard loop is `Continue -> Back -> Settings`; Shift+Tab reverses it and Escape
  opens Leave. Ordinary successor sheets remain modal and keep their internal traps.
- Candidate `eeb7c00` passes final typecheck, the complete suite (`305 passed / 3
  skipped`), and the 760-module build. Reproducible evidence binds to source `1dabee8`
  and records one Canvas, zero DOM cells, zero browser errors, canonical cleanup, and
  the complete viewport/state matrix. Independent read-only QA of
  `230eb09..eeb7c00` reports P0-P3 all zero.

## 2026-08-02 — T23 authored pressure and Reshape accepted

- Increased ordinary Survival gravity from 40 to 38 ticks per cell and added one
  readable deterministic risk: every fourth natural pressure rise advances two rows.
  Initial countdown rows do not enter the cycle, cleared bedrock does not reset it,
  and the HUD previews the pending Aftershock.
- Added Reshape as the fifth seeded Mutation carrier. Clearing it rewrites the first
  post-activation Next entry to `I` for a complete preview turn, with a distinct
  emerald alignment cue and no persistent status or looping sound.
- Replaced rain-like Supergravity and dominant Multiplier fields with broad
  constant-alpha compression contours, a shallow contact wedge, and a compact fixed
  corner constellation. The Settings console again owns the sole language selector;
  Home mode names remain permanently English.
- Product `4c43619` passes final typecheck, the complete suite (`305 passed / 3
  skipped`), and the 762-module build. Evidence `e8418d5` records `3 rises / 6 rows →
  4 rises / 8 rows`, Reshape/Next, activation-free persistent fields, one Canvas,
  zero DOM cells, zero console errors, responsive fit, and cleanup. Independent
  read-only QA of `0107e52..e8418d5` reports P0-P3 all zero. A scoped redacted
  gitleaks scan of the 12-commit T23 range reports no finding; the owned Vite PID
  was stopped and port `4178` has no listener.

## 2026-08-02 — T22 concise language control and unified English type accepted

- Removed the redundant visible `语言 / Language` prefix from the single Home
  selector while preserving the localized outer and button-group accessible names,
  persistence, focus, and keyboard navigation.
- Made Playwrite NZ Basic the first family for English prose and interface copy. The
  TetraMorph wordmark remains the sole visually bold expression through its maximum
  shipped weight and existing outline; Chinese and tabular numeric roles are unchanged.
- Product `0a0f2bc` passes direct tests `49/49`, final typecheck, the full suite with
  `300 passed / 3 skipped`, and the 762-module production build. English Home evidence
  `631393a` shows no visible language label or overflow. Independent read-only QA of
  `e1f3eb3..631393a` reports P0-P3 all zero; a scoped redacted gitleaks scan reports no
  finding, and the owned browser server is closed.

## 2026-08-02 — T21 visible rockfall and preserved Next accepted

- Replaced Survival's elapsed-time rockfall schedule with a deterministic locked-piece
  cadence: 8 pieces initially, one fewer after each four events, and a floor of 4.
  Each event accompanies the following ordinary spawn, selects outside its occupied
  columns, and begins its complete one- or two-rock body at the visible top row.
- Corrected the gameplay-sheet stacking boundary so pause, restart, and leave preserve
  both the Canvas-owned Next well and its queued tetromino. The intentional blank Next
  during the standalone countdown remains unchanged.
- Moved the sole bilingual switch to Home, replaced the Survival HUD with `距离落石` /
  `X块`, and rewrote all four Chinese and English rule sheets around objective,
  pressure, unique mechanic, and end condition.
- Product source `7d5e944` passes final typecheck, the full suite with `300 passed / 3
  skipped`, and the production build. Evidence `ca3d571` records the three sheet/Next
  states, first visible rockfall frame, home language control, one Canvas, and zero
  console errors. Independent read-only QA of `4505fb9..ca3d571` reports P0-P3 all
  zero. A scoped redacted gitleaks scan of the 14-commit T21 range reports no finding.
  The evidence server is closed and port 4178 is free.

## 2026-08-01 — T20 Survival material harmony correction accepted

- Replaced the rejected photographic grayscale height field with one deterministic,
  renderer-cached, game-native cold mineral wall. Broad Halton-distributed planes,
  neighbour blending, a seven-tone slate ramp, and a shallow flat contact lip keep the
  geology continuous while matching the simplified enamel-piece material language.
- Strengthened the falling-stone pre-warning without changing Survival mechanics. One
  source-column arrow remains readable throughout the warning; normal motion adds a
  short warm whole-well and column flash, while reduced motion renders one static
  high-contrast endpoint.
- Frozen source `eadeac6` passes final typecheck, `32 passed / 1 skipped` test files
  (`297 passed / 3 skipped` tests), and the `762`-module build. Evidence `b600ace`
  reports one Canvas, zero DOM cells, no viewport overflow or browser errors, different
  normal warning hashes, identical reduced-motion hashes, and matching hashes for all
  four committed PNGs.
- Initial independent QA `d1ad2e9` accepted product and evidence but blocked stale
  writer provenance. Documentation checkpoint `534e78e` closed that sole gap without
  changing source or evidence; retry QA `1b0c64c` reports P0–P3 and evidence gaps all
  zero. A scoped redacted gitleaks scan of the complete T20 range reports no finding.
  The capture browser and owned Vite server are closed and port `5178` is free.

## 2026-08-01 — Phase 12 material truth and authored learning accepted

- Accepted frozen product source `d84b043` after replacing contradictory leave
  semantics, carded Settings, rejected English/data typography, decorative Survival
  geology, and live Puzzle solver statistics with one coherent, bilingual system.
  The final responsive retry preserves the independently accepted procedural cavern
  wall and closes the Puzzle-title and `844×390` English Settings clipping gaps.
- Survival now proves one/two square stones at exactly four times ordinary gravity,
  temporary in-flight support without premature lock, and atomic stone-above push.
  Puzzle is reordered into Intro/Easy/Hard authored lessons with stable IDs, strict
  optimum certificates, technique-linked mastery thresholds, and no live answer feed.
  Mutation evidence covers every activation, persistent field, consumed-carrier
  cleanup, and airborne Supergravity landing latch.
- Strict Puzzle certificate verification passes `3/3`; final typecheck, the
  `32 passed / 1 skipped` file suite (`297 passed / 3 skipped` tests), and the
  `762`-module build pass. Final evidence `18f8886..9e22a8b` binds both manifests to
  `d84b043`, contains sixteen static and four dynamic screen groups, verifies twenty
  dynamic PNG hashes, and reports zero browser errors.
- Independent read-only QA `9ec1149..6fce9e6` reports P0–P3 and evidence gaps all
  zero. The accepted wall chain remains `2e14ec3 / dcb1d79 / 5619bce / 92a124f`.
  Scoped gitleaks reports no finding; the earlier lockfile OSV scan reports none across
  158 packages. All owned browser/Vite resources are closed and port `5178` is free.

## 2026-08-01 — Phase 12 procedural bedrock wall correction accepted

- Replaced the rejected flat slab, pebble relief, and repeated ridge candidates with
  one deterministic procedural cavern height field. Multi-scale eroded masses,
  restrained fine grain, and normal-derived upper-left lighting now read as a
  continuous natural rock wall while preserving an exact flat gameplay contact top.
- The accepted renderer owns one cached bedrock texture for its lifetime, releases it
  during teardown, and retains a dedicated gradient fallback when browser canvas
  texture creation is unavailable. Falling-stone geometry and material behavior are
  unchanged by this correction.
- Source candidate `2e14ec3` passes the focused Renderer `43/43` and Theme `7/7`
  tests, final typecheck, the full `32 passed / 1 skipped` file suite with
  `294 passed / 3 skipped` tests, and the `762`-module production build. The only
  build note is the existing bundle-size warning.
- Evidence `dcb1d79` archives the final Survival frame and state. Independent
  read-only QA checkpoint `5619bce` reports no P0–P3 finding and confirms the wall
  has no cell grid, masonry, pebble clusters, repeated zigzags, camouflage, or framed
  slab read.
- A scoped redacted gitleaks scan of `a4cafba^..dcb1d79` reports no finding. The
  owned browser/server batch is closed and port `5178` is released. This entry
  accepts the bedrock-wall correction only; it does not close the remaining Phase 12
  product program.

## 2026-08-01 — Phase 11 luminous materials and legible intent accepted

- Replaced Survival's rejected decal language with dedicated geology geometry. The
  permanent floor is one continuous irregular basalt shelf with connected planes and
  fractures; falling one- and two-stone events are chipped, faceted boulder masses
  rather than decorated ordinary cells.
- Brightened all seven ordinary piece families while retaining dark edge contrast.
  Reworked Ice into one smooth upper gradient, Supergravity into restrained pressure
  and truthful independently settled ghost cells, and Bomb into a localized irregular
  heat/ember field without a `3×10` target box.
- Compacted the live information rail and sectional Settings surface, restored complete
  Home-card edges and transient pointer hover, defaulted leave to Back to home, and
  locally packaged Space Grotesk plus Geist Mono with bilingual responsive fit.
- Added deterministic Puzzle diagnosis: direct clears, safe landings, buried holes,
  minimum burden, one priority line, and two queue-role hints without mutating Core or
  exposing a scripted solution.
- Frozen product `12fb0ae` passes typecheck, `31` files / `288` tests, and the
  `758`-module build. Evidence `d1656a1` contains 24 browser frames and `26/26` valid
  manifest entries with one gameplay Canvas, zero DOM board cells, and zero
  console/page errors. Independent read-only QA reports no P0–P3 or evidence gap.
- A redacted gitleaks `8.30.1` scan of the complete Phase 11 range reports zero
  findings. Coordinator acceptance `1cf7d54` was pushed non-force with local,
  tracking, and remote `main` equal. The final browser batch is closed, port `5178`
  is released, and this terminal record closes Phase 11.

## 2026-07-31 — Phase 10 readable-state and cave-pressure refinement accepted

- Standardized live terminology, restart/leave lifecycle, Rules-first Settings,
  complete Mutation item previews, deduplicated same-type activation cues, Ice at
  `1.0 秒/格`, Supergravity settlement, and mode-first result ledgers. Classic ranks
  by lines, Survival by time, and Mutation by score; each result keeps only its
  meaningful secondary metric.
- Made Survival falling stones spawn as deterministic one/two-cell same-column
  events, avoid false spawn block-out, carry supported ordinary pieces, and read as
  brighter moving members of the same cold-cave geology as the permanent shelf.
  The three-count entry now raises the complete visible shelf continuously by one
  row per beat while hiding active, ghost, carrier, and Next content until play.
- Made every real Puzzle clear persist atomically across all fifty open gallery
  entries. First clear, new best, and repeat clear now use one compact celebration
  surface; slower replays retain the earlier best and the library completion/check
  state survives immediate return and reload.
- Replaced player-facing Back-to-modes copy with `返回首页 / Back to home`. The sole
  TetraMorph wordmark keeps Playwrite NZ Basic; locally packaged WenYuan-derived UI
  text, Smiley Sans display headings, Sora English UI, and IBM Plex Mono data roles
  include their notices and make no runtime font request.
- Frozen product `7f45c55` passes typecheck, `29` files / `273` tests, and the
  `758`-module build. Evidence `87d7586` contains `26` captures and `28/28` valid
  hashes with one gameplay Canvas, zero DOM cells, overflow, console errors, and page
  errors. Independent read-only QA accepts `ad0e31b..87d7586` with no P0/P1/P2 gap.
- A redacted gitleaks `8.30.1` scan covers the complete Phase 10 range and reports no
  leak. Coordinator acceptance `6b4bfd7` was pushed non-force and matched local,
  tracking, and remote `main`. The owned Chrome batch is closed and ports `4178`,
  `5178`, and `5179` are released; this final closeout record is documentation-only.

## 2026-07-31 — Phase 9 cavern pressure and compact navigation accepted

- Accepted deterministic same-column one-or-two Survival rock events at exactly
  two times normal-piece speed, cold-slate bedrock/falling-rock materials, staged
  one/two/three-row countdown rise, and short stationary landing/clear feedback
  with no horizontal clear line.
- Replaced the fifty-level Puzzle wall with a two-page `5×5` gallery. Every target
  viewport keeps square controls and zero overflow; the tall frame is capped at
  `740 px` and vertically centered, first-row hover preserves its full border, and
  the meaningless selected-node corner ornament is removed.
- Preserved the transient home hover contract and complete keyboard paths. Puzzle
  range tabs support Left/Right/Home/End; pointer leave produces no persistent
  mode highlight.
- Unified non-Puzzle result ledgers around meaningful mode metrics and a top-five
  table. Ranked runs are identified only by the highlighted current row; the
  duplicate “本局第 N 名 / This run · #N” text is removed. The `844×390`
  unranked ledger shows all five rows and both actions without internal scrolling.
- Final source `ba6bbb6` passes typecheck, `29` files / `261` tests, and a
  `756`-module production build. Evidence `25cfebf` contains 26 source-bound
  artifacts with `26/26` valid manifest hashes, one Canvas, zero DOM board cells,
  zero overflow, and zero console/page errors. Two independent read-only reviews
  accept with no P0/P1/P2 finding.
- Coordinator checkpoint `5b5dcb1` passed a scoped redacted gitleaks 8.30.1
  scan across 33 Phase-9 commits, was pushed non-force, and matched local,
  tracking, and remote `main`. The owned Vite listener and managed Chrome batch
  were released; this final closeout record is documentation-only.

## 2026-07-30 — Phase 8 integrated release-readiness evidence accepted

- Kept frozen product `4e4cca1` unchanged while adding a fail-closed integration
  harness and source-bound evidence for Classic, Survival, Mutation, and Puzzle.
  The rejected selector redesign remains outside `main` at
  `codex/t15-selector-wip-20260730@dce331b`.
- Published 13 Phase 8 target frames plus two official web-game client frames
  covering desktop, 390x844 portrait, 844x390 landscape, Chinese, English,
  reduced motion, keyboard, touch, modal focus paths and clean unmount.
  All 23 package hashes and all 18 manifest hashes recompute exactly.
- Revalidated Phase 5 Mutation evidence at 38/38 browser and 4/4 gate hashes,
  and five schema-7 Puzzle artifacts containing 50 levels, 100 distinct
  public-Core routes and ten levels in each 3/4/5/6/7-row tier.
- Final typecheck, 26/26 test files with 235/235 tests, and the 753-module
  production build pass. Every gameplay capture has one Canvas, zero DOM board
  cells, zero browser/page errors, and returns listener/rAF/audio/Canvas state
  to baseline after unmount.
- Rules and visual QA accept with only the existing 390px three-status text
  ellipsis P3; status icons, materials, order, timers and progress remain
  legible. Evidence-integrity QA accepts with P0–P3/GAP all zero.
- The ordinary line-clear rollback remains the stationary nine-tick centre-out
  sweep and is not changed by this documentation/evidence-only phase.
- Coordinator acceptance `c77790b` passed a scoped redacted gitleaks 8.30.1
  scan over all ten Phase 8 commits with no leaks and was pushed to `main`
  non-force. The final docs-only recovery record is scanned and pushed
  separately before exact local/tracking/remote equality is reported.

## 2026-07-30 — Ordinary line-clear rollback accepted on a clean delivery line

- Restored the pre-`1a163ff` ordinary line-clear presentation at clean product
  `760437d`: locked cells remain stationary while the prior nine-tick
  centre-out sweep identifies the real cleared rows. Reduced motion has no
  moving sweep.
- Removed the rejected contraction, dissolve, debris, and afterglow family
  without changing Core clear timing/scoring, Puzzle, Survival, Mutation, or
  later Classic landing/combo/speed/top-out feedback.
- Current schema-7 QA fixtures are aligned by `9730d99` and title-only
  correction `70cff6e`. Renderer/presentation passes 39 tests, route/QA passes
  5 tests, typecheck passes, the clean full suite passes 26 files / 235 tests,
  and the production build passes with 753 modules.
- Independent rules QA accepts `e2b990e` with P0–P3 and GAP all zero. It
  confirms selector product paths are unchanged from accepted recovery
  `62ba8e9`, and the rejected selector WIP remains recoverable at
  `codex/t15-selector-wip-20260730@dce331b`.
- Existing normal/reduced Pixi captures remain source-exact: the clean
  Renderer/presentation files are byte-identical to the previously inspected
  rollback source and retain one Canvas while mounted, zero after destroy,
  and zero console/page errors.
- Acceptance/recovery `47ee3e5` was pushed non-force. Local `HEAD`,
  `origin/main`, and remote `main` matched exactly; a scoped redacted gitleaks
  scan covered all six clean-line commits and found no leaks.

## 2026-07-30 — Puzzle progressive unlock accepted

- Replaced the transitional all-open workshop with the Phase-7 frontier:
  fresh progress opens 01–03; two completions open 04–05; three completions
  across 01–05 open 06–10; then each already-open five-level band advances at
  three completions.
- Migrated out-of-order completions remain individually replayable without
  leapfrogging a closed prerequisite band. Locked levels cannot create a
  completion or current best; malformed in-memory progress falls back to the
  fresh frontier.
- Product `3d21df8` plus fail-closed correction `80da444` pass the corrected
  2-file / 46-test matrix and typecheck. No migration domain, v5 key/revision,
  definition/artifact, App, selector/CSS, localization, renderer, other mode
  or dependency changed.
- The first independent audit rejected one malformed-memory P1 and two missing
  regressions. The same reviewer accepts the exact correction with P0–P3/GAP
  all zero after confirming all three cases and the unchanged legal frontier.

## 2026-07-30 — Puzzle levels 41–50 accepted

- Added the final ten deterministic seven-row boards, `横沟` through `岔口`,
  with concise bilingual names and complete setup/gameplay packages. Nine
  setups use 14 drops and `深槽` uses 15; all ten prioritize readable
  multi-route synthesis and add no final-tier anchor.
- The tracked schema-7 artifact binds the registered order to twenty distinct
  public-Core routes at fixed 36-lock, 720-primary and 560-alternate search
  bounds. Its SHA-256 is
  `3EC1720BCD9101CD7392CAB1303F89F5857840476C000E030E3169E29E646AB3`.
- Source candidate `7cd4a1d` passes the six focused files with 64/64 tests,
  typecheck and diff checks. No full suite, build or browser pass was repeated
  at this staged data checkpoint; those broad gates remain reserved for the
  final 50-level Phase-7 integration.
- Independent route/artifact and curriculum/boundary auditors both accept with
  P0–P3 and GAP all zero. They independently confirm twenty distinct command
  streams, exact Core replay binding, unchanged levels/artifacts 01–40, coherent
  seven-row curriculum order and no change to unlock/v5 source, selector
  implementation, other modes or dependencies.

## 2026-07-30 — Puzzle levels 31–40 accepted

- Added ten unique six-row endgame boards, `曲井` through `折桥`, with complete
  bilingual names, deterministic setup histories and fixed gameplay seeds.
  Seven ordinary lessons progress from 11 to 21 locks; three immutable edge
  anchor lessons remain distributed at levels 32, 36 and 39.
- The tracked schema-7 artifact binds all ten registered definitions to twenty
  distinct public-Core routes at fixed 30-lock, 600-primary and 480-alternate
  search bounds. Its SHA-256 is
  `BBA6FB898DD49F59AB3B26F21011C4A73647B67120F9A6BE0ED8E0CF76EFCB3D`.
- Source candidate `23970c6` passes the six focused files with 64/64 tests,
  typecheck and diff checks. No full suite, build or browser pass was repeated
  at this staged data checkpoint; those broad gates remain reserved for the
  final 50-level Phase-7 integration.
- Independent route/artifact and curriculum/boundary auditors both accept with
  P0–P3 and GAP all zero. They also confirm that levels 01–30 and their tracked
  artifacts are frozen, the selector implementation is unchanged, and other
  modes and dependencies remain outside the candidate.

## 2026-07-30 — T15 Phase 6 Classic accepted and pushed

- Replaced the shared ordinary-clear sweep with one board-local three-stage family:
  narrow row confirmation, recognisable cell contraction/dissolve, and restrained
  deterministic afterglow. One through four rows share timing and geometry with
  bounded intensity; reduced motion keeps a stationary local confirmation.
- Classic now adds short, coexisting Renderer-only cues for true-support landing,
  consecutive clears, each ten-line speed boundary, and top-out. They remain clipped
  inside the well, contain no text or camera movement, and clear on lifecycle reset.
- First rules QA correctly rejected airborne overhang landing echoes. Corrected product
  `9085976` freezes only floor or old-board support cells and adds a one-support
  horizontal-I regression. Final source-bound gates pass typecheck, 26 files /
  232 tests, and a 753-module production build through gate index `bee956a`.
- Browser index `ca80416` binds 15 captures and 19 hashes to the corrected product:
  public runtime/Core 1/2/3-row clears, honestly isolated four-row contraction,
  one-row confirmation/contraction/afterglow, safe Next, Classic event cues,
  reduced-motion endpoints, three responsive viewports, zero errors, one Canvas,
  zero DOM board cells, `17→28→17` listeners, and final zero Canvas/audio/rAF.
- Repeated rules QA accepts with P0–P3/GAP zero. Visual QA inspected 15/15 originals,
  rejected one review-packet stage mislabel, then accepted with P0–P3/GAP zero after
  documentation-only correction `e247dd9`. Evidence QA accepts with 3/3 gate,
  19/19 browser, and 15/15 capture hashes plus P0–P3/GAP zero.
- The coordinator accepts Phase 6. Product/config is unchanged after `9085976`;
  ports 4178/5178/5179 and project browser/Serena/repl resources are clear.
  Acceptance/recovery `d0b7406` was pushed non-force; local HEAD, `origin/main`, and
  the remote branch reference match exactly. Phase 6 is closed and the separate
  Phase-7 contract may now open.

## 2026-07-29 — T15 Phase 5 Mutation accepted and pushed

- Mutation keeps all seven tetromino bodies independent from four attachable item
  identities. The attachment stream is deterministic but isolated from the ordinary
  seven-bag; Next predicts the eventual body-plus-item without consuming either
  stream, and direct regression coverage spans all 28 combinations.
- Ice refreshes a ten-second 1-second-per-cell gravity override while preserving
  manual controls; Collapse refreshes ten seconds of independent column settlement;
  Multiplier refreshes ten seconds and advances 2×→4×; Bomb is a one-shot bottom
  three-row impact. Timed states coexist, same-transition activations remain FIFO,
  non-Ice Mutation gravity stops at 0.1 seconds per cell, and the optimized Collapse
  path reuses one indexed mapping.
- The one-Canvas renderer gives each attachment a body-preserving core, rim, texture,
  symbol and local motion language across active, locked and Next states. Ice,
  Collapse, Bomb and Multiplier have distinct ordinary/reduced endpoints; effects
  coexist without overwriting, Collapse follows only real moved columns, and the old
  full-width/top strip is absent.
- Frozen product `ee2aac5` retains the source-bound gate record at `6d9fc6a`:
  typecheck PASS, 26 files / 225 tests PASS, and a 753-module production build.
  Browser-raw `9fa98a2` and browser-index `013120a` add 34 unique hardware-WebGL2
  frames, exact hashes, renderer p95 0.3 ms, rAF mean/p95/max
  8.332/8.4/8.5 ms, FIFO/Collapse proof and the exact
  `17→28→17→28→17` listener lifecycle with final rAF/audio/Canvas/QA cleanup.
- Independent rules QA `c5b7be8` and evidence QA `eaf78aa` accept with P0–P3/GAP
  all zero. Visual QA `7373948` accepts with P0–P2/GAP zero and preserves one
  non-blocking P3: narrow three-status frames ellipsize long scores and the third
  status label, while the unique symbol/material, progress and seconds keep mandatory
  identity and duration readable.
- Product/config/gate/harness diffs are empty; no helper, partial, external control
  log or listener on 4178/5178/5179 remains. Acceptance `321ebc6` was pushed
  non-force to `origin/main` and immediately matched local HEAD. Phase 5 is closed;
  Phase 6 and Puzzle 50 remain unopened while execution pauses for the player's next
  explicit instruction.

## 2026-07-28 — T15 Phase 4 Survival pressure accepted and pushed

- Survival now begins with three rows of the approved brown bedrock and presents two
  independent, deterministic threats: a 13→6-second rise clock and a 20→10-second
  one-or-two-stone clock. Every stone plan is announced two playing seconds early,
  uses the exact stored columns at spawn, waits on those columns if blocked, falls
  through an RNG stream isolated from the seven-bag, and may obstruct or complete a
  normally scored line.
- The one-Canvas renderer retains the brown raised bedrock and adds distinct cracked
  slate stones, a column-local warning, interpolated travel, and bounded spawn/landing
  cues with a reduced-motion endpoint. The four-card rail shows Survival time, lines,
  bedrock rows/rise, and stonefall without adding a fifth card.
- Mode-discriminated v8 records persist and display only elapsed time, cleared lines,
  date, and necessary schema metadata for Survival; v7 score/pieces/chain fields are
  deliberately discarded.
- Final source/test candidate `2af2adf` passes typecheck, 26 files / 203 tests, and
  the 753-module build. Corrected evidence `993dfc7` covers warning/spawn/fall/land,
  Chinese/English, portrait, reduced motion, countdown Settings freeze, pause,
  same-Canvas restart, two mount/unmount cycles, and listener/RAF/audio cleanup;
  14/14 manifest hashes and 9/9 JSON image hashes match.
- Independent rules, visual, and UI/evidence auditors all accept with no P0–P2.
  Rules QA has no P3. Visual QA records only a readable Chinese label wrap and a
  static Settings screenshot that hides the digit while the interaction JSON proves
  `3→3` over 1.2 seconds; neither changes product correctness or acceptance.
- Scope remains bounded: no Mutation, Classic, Puzzle selector/data, music/audio
  design, dependency, packaging, second Canvas, or DOM-board change is included.
  Verified Vite PID 11560 was stopped; ports 4178/5178/5179, the temporary browser
  tab, and project/headless browser processes were cleared. Acceptance `fd7ef8d`
  was pushed non-force to `origin/main`; Phase 5 opens from that recovery point.

## 2026-07-28 — T15 Phase 3 unified live HUD accepted and pushed

- Rebuilt the four live modes around one final board-first topology: stable desktop,
  portrait, short-landscape and wide-compact geometry; always-visible statistics and
  Next; optional Mutation status without blank structural rows; and Puzzle's two
  complete `1` / `2` previews in one deep well.
- Restored real board input by placing one transparent, board-bounded interaction
  surface above the same Canvas. Tap, horizontal/downward swipe and cancellation,
  keyboard guards, focus restoration, Settings/Pause/Restart gating, and the visible
  `3→2→1` countdown all retain one deterministic runtime. Spawn containment is
  presentation-only and does not change Core coordinates, collision or sequences.
- Final candidate `741d8a6` passes typecheck, 26 files / 198 tests, and the 753-module
  production build. Its 18-scene production matrix covers four modes × four required
  viewports plus English Mutation and reduced-motion countdown with one Canvas, zero
  DOM cells, no overflow, no active dialog, and zero console/page error.
- English `Freeze / Collapse / Double` remain complete at 12 px in `844×390`;
  Puzzle forecast names include both sequence and actual piece type. Independent
  input, rules/code, and visual QA all accept the final candidate with no P0–P3.
- Acceptance/recovery record `1383fca` is pushed to `origin/main`; project listeners
  on 4178/5178 and headless Chrome were released. Phase 4 Survival is open from that
  rollback boundary.
- The accepted range does not modify Core rules, Puzzle definitions/selector,
  Survival pressure, Mutation items/VFX, ordinary line-clear effects, Settings,
  audio, dependencies, or packaging.

## 2026-07-28 — T15 phase target contracts reconciled

- Kept the complete Phase 1–8 target set together under `docs/phases/`, with one index
  defining the contract → source → candidate → evidence → independent QA → correction
  → acceptance → push state machine and explicit rollback boundaries.
- Advanced Phase 3 from its stale “waiting for Phase 2” wording to the active HUD
  contract at pushed rollback base `6892f80`. The contract records measured responsive
  geometry defects, clipped spawn presentation, real touch interception, exact source
  checkpoints, exclusions, and the final viewport/input acceptance matrix.
- Added the later Mutation rule supplement without editing product source: the
  player-facing Chinese name is `冰冻`; its ten-second effect uses fixed 1-second-per-cell
  automatic gravity rather than stopping the piece. Manual controls remain available
  and expiry restores the current Mutation cadence.
- Strengthened the Phase-5 attachment target so active, locked, and immediate-Next
  carriers communicate both “item present” and the exact item through non-colour
  silhouette, edge, texture, mark, and local-motion cues. No test, build, browser
  evidence, product acceptance, or push is claimed by this documentation checkpoint.
- Added two later visual boundaries: Collapse must remove the ten-column/top horizontal
  strip and bind gravity feedback to affected columns; Phase 6 owns a shared ordinary
  line-clear sequence that visibly confirms, contracts, dissolves, and settles the
  cleared rows without a full-screen flash or input delay.

## 2026-07-28 — T15 Phase 2 compact Settings accepted

- Rebuilt the active Settings surface as one compact connected console in the fixed
  Controls → Keyboard → Rules → Records order. It retains bilingual language/SFX/
  volume controls, explicit arrow/Enter geometry, exact per-mode rules, top-five
  dated records, and natural-height responsive content without structural ghost
  columns or undersized controls.
- Settings, Restart, and Exit now freeze the current 3→2→1 entry digit, ready Core,
  and input until the complete sheet chain closes; the same countdown then resumes
  and the runtime starts exactly once. English terminal results receive the active
  language, Survival records expose only time/lines/date, and Puzzle exposes only the
  current-level best or not-completed state.
- Corrected candidate `26e4db3` passed typecheck, 25 files / 190 tests, and the
  752-module production build. The production matrix covers four modes, two
  languages, empty/full/Puzzle record states, desktop, 390 px portrait, short
  landscape, and reduced motion with one Canvas, zero DOM cells, reversible dimming,
  reachable short-screen content, and zero browser errors.
- The first audits correctly rejected a portrait width defect and insufficient
  source binding. The refreshed manifest binds the exact candidate, distribution,
  gate logs, official client state, and 14 browser frames; evidence QA independently
  re-hashed 24/24 entries. Rules, visual, and evidence auditors all accept with no
  P0–P2.
- Unreachable historical `.settings-sheet` selectors and the earlier oversized
  cohesive layout checkpoint remain recorded as non-blocking P3 maintenance/process
  debt. Puzzle definitions and selector composition were not changed.
- The verified repository preview PID 21744 was stopped, port 5179 confirmed free,
  and the linear Phase-2 range through acceptance `092c91d` pushed non-force to
  `origin/main` as the remote recovery point.

## 2026-07-28 — T15 Phase 1.5 modal compositor accepted

- Live-game sheets now reliably composite above the same visible, dimmed Pixi canvas;
  first-entry rules retain their correct pre-session zero-canvas state. Settings,
  Pause, Restart, Exit, and Puzzle-result surfaces remain opaque without hiding or
  recreating the live board.
- The replacement-sheet focus contract now covers both state origins. Playing
  Settings → Restart → Cancel returns to the original Canvas; paused
  Pause → Settings → Restart → Cancel returns focus to the one remounted Pause sheet,
  and closing that sheet then restores the same Canvas.
- Candidate `5ab9e7d` passes 26 direct App tests, typecheck, 25 files / 185 tests, two
  752-module builds, 20 exact-SHA production-browser cases, and 18 pixel-difference
  cases. The manifest closes 5 source, 122 clean-build, and 77 evidence hashes.
- Independent code/rules, target/visual, and evidence-integrity auditors all accept
  the candidate with no product P0/P1. Their comparison caught three distinct focus
  gaps across earlier narrow checkpoints and distinguished one final sampler
  false-positive from product state before coordinator acceptance.
- The exact candidate preview and detached clean worktree were released, port `53973`
  was confirmed free, and the linear Phase-1.5 range through acceptance `6b1b76f` was
  pushed non-force to `origin/main` as the remote recovery point.

## 2026-07-28 — T15 Phase 1 design foundation accepted

- Established a typed/CSS/Pixi design vocabulary for the requested shell palette,
  accessible supporting text, four mode accents, typography roles, spacing, radii,
  component metrics, and motion timings without changing layout, Core rules, board
  materials, or the 7 × 4 Mutation attachment cross-product.
- Bundled exact local Playwrite 400, Space Grotesk Variable, JetBrains Mono Variable,
  and Noto Sans SC Variable faces. Independent visual QA rejected the first font
  candidate after detecting that two imported Variable faces were requested through
  wrong aliases; correction `99e5a0f` binds their real family names and refreshed
  browser proof shows all four intended faces loaded.
- The corrected source passed typecheck, 25 files / 182 tests, and the 752-module
  production build. A disposable detached worktree also completed a real `npm ci`.
  Clean production-preview evidence reports one canvas, zero DOM board cells, no
  horizontal overflow, zero browser errors, and exact source/screenshot hashes.
- Code/rules QA accepts `99e5a0f` plus coordination record `fb0545a`; target/visual QA
  accepts `99e5a0f`; neither has an open P0–P2. Component-level token consumption is
  intentionally assigned to Settings and HUD rather than hidden inside this additive
  foundation. The inherited T13.16 `src/styles.css` delta and untracked `phase 1.md`
  remain excluded. Coordinator acceptance `fcd612e` was pushed to `origin/main` as
  the Phase-1 recovery point.

## 2026-07-27 — T14 candidate-bound Mutation revalidation accepted

- The **异变 / Mutation** attachment contract is revalidated as a genuine independent
  cross-product: every ordinary I/O/T/S/Z/J/L body may carry each Freeze, Collapse,
  Bomb, or Multiplier attachment, while Next preserves the same normal-body-plus-core
  grammar without consuming future RNG. The direct Core sweep covers all 28 pairs;
  representative live carrier frames remain Bomb/O, Freeze/T, Collapse/O, and
  Multiplier/J.
- A detached clean candidate worktree at `1fac220` reran typecheck, the full 24-file /
  177-test suite, and the 749-module production build. Its candidate-bound browser
  manifest records a clean Git state, package-lock hash, source SHA, and nine PNG
  hashes for all four states, four carriers, and 390 px reduced motion. It reports one
  canvas, zero DOM board cells, no viewport overflow, zero browser errors, and a
  collapse benchmark of 0.551 ms mean / 1.000 ms p95 / 2.900 ms max across 180 frames.
- Independent read-only QA accepted the corrected `1fac220..03c92db` documentation
  closure with no P0/P1. The committed `package-lock.json` still cannot satisfy
  `npm ci` because of an inherited `@emnapi` mismatch; this remains an explicit
  dependency-lock P2, not a hidden T14 pass or a change to the player's dirty files.

## 2026-07-27 — T14 Mutation Card readability and compact-state acceptance

- **异变 / Mutation** now presents its live Freeze, Collapse, and Multiplier timers
  through one contained deep-space status card: the decorative `///` marker is gone,
  normal state text is legible at a deliberate title/item/timer hierarchy, and active
  material colour is confined to its own card row. This leaves the existing board,
  event queue, WebAudio, score, duration, item odds, and Core state untouched.
- The compact 390–599 px game no longer wastes its pre-reserved 124 px Mutation
  information band. It reuses that exact band for a three-column status instrument;
  the historically hidden metrics and Next remain hidden, so the board does not gain
  a scrolling or structurally empty rail. Reduced motion keeps the same endpoint but
  removes the card’s entrance animation.
- The independent QA acceptance of `6b8a37c..f20f228` found no P0/P1. The clean
  candidate passed typecheck, 24 files / 177 tests, and the 749-module build; desktop,
  390 px, 599 px, and reduced-motion browser checks all report one canvas, zero DOM
  board cells, no viewport overflow, and zero console/page errors. The pre-existing
  `npm ci` lockfile mismatch remains a recorded P2 and was not modified.

## 2026-07-27 — T14 Mutation crystal-tech polish accepted

- **异变 / Mutation** special effects are now visibly attached to ordinary tetromino
  bodies instead of replacing them: any I/O/T/S/Z/J/L shape can independently carry
  Freeze, Collapse, Bomb, or Multiplier, and the immediate Next preview uses the same
  base-piece-plus-attachment grammar without consuming game randomness.
- The one-canvas Pixi renderer now reuses a bounded Frost `NoiseFilter` and Collapse
  `DisplacementFilter`, adds crystal breathing, gravity pull, rotating Bomb fragments,
  and a score-aware Multiplier lift. Bomb impact/fragments are clipped to the board,
  so the right-side state rail and Next well remain readable during the strongest
  effect. Core item timing, scoring, carrier odds, queues, and all other modes remain
  unchanged apart from the already-authorized Mutation 0.1-second-per-cell floor.
- Independent read-only QA accepted `bd49be6..813f31b` with no P0/P1 finding. The
  clean source candidate passed typecheck, 24 files / 177 tests, and the 749-module
  build; real public-command browser evidence confirms an actual Bomb activation,
  one canvas, zero DOM cells, no overflow, and zero page/console errors. A pre-existing
  `npm ci` lockfile mismatch remains a recorded P2: no lockfile was changed in this
  acceptance, and the candidate used a no-lock dependency install solely for validation.

## 2026-07-25 — T13.15 Puzzle ceremony and brown bedrock accepted

- Puzzle success now resolves through a compact original ceremony instead of the generic
  result sheet. It classifies the saved best before persistence: **恭喜你破解谜题** for
  a first clear, **新的个人纪录** for a strictly lower count, and **谜题再次破解** for a
  later non-record clear. Each sheet keeps only its outcome identity, saved best, and
  the existing **重来** / **返回关卡库** actions; the former `首次完成 · X 步 · Y 消行`
  line and its empty description space are gone.
- Restored permanent Survival bedrock to the approved independent brown raised-block
  material. Clearable falling stones retain their separate slate material; no Core,
  collision, replay, scoring, queue, or persistence behavior changed.
- Source checkpoint `87aeeb5` passed typecheck, 22 files / 166 tests, and the
  746-module production build. A fresh candidate-bound public-command audit renders
  desktop first/record/replay and 390 × 844 reduced-motion ceremonies with one canvas,
  zero DOM board cells, no overflow, no console/page errors, no generic run-stat text,
  and no empty description paragraph. It also preserves the three-row brown Survival
  opening. Independent QA first held the invalid library screenshot, then accepted the
  corrected evidence in `4b0938d`; the temporary candidate listener was released.

## 2026-07-25 — T13.14 direct clarity, Mutation, Survival debris, and readable Puzzle Next accepted

- Restored the visible 3 → 2 → 1 board-entry overlay and rebuilt Settings as a compact
  connected control/keyboard console with content-sized rules and record bands. The
  live Pixi board remains visibly dimmed behind Settings, pause, restart, and exit;
  Survival rankings retain duration and cleared lines only.
- Puzzle now shows original blocks and **操作数**, while its two fixed upcoming pieces
  remain together in one ordinary dark Next well. The final correction replaces the
  unreadable hand-drawn marker with loaded JetBrains Mono `1` / `2` digits at the left
  of each physical row—no split cards, badges, label strips, or doubled borders.
  Classic and 异变 use the `下落速度/格` metric; the current procedural music and its UI
  are removed while original adjustable sound effects remain.
- 异变 now uses distinct ice, gravity, ember-bomb, and star-mineral carriers with
  bounded frost, pressure, explosion, and score-light feedback. Recollecting a timed
  item resets its deterministic state to exactly ten seconds. Survival begins with
  three chipped bedrock rows and runs a separate seeded 20 → 10-second clearable
  falling-stone stream at an exact 1.5× gravity accumulator.
- The accepted corrective range is `e9db541..0bb2ba9`, with final product source
  `866ef0a`. Coordinator gates passed typecheck, 22 files / 165 tests, and the
  746-module production build. Fresh browser audits cover desktop, 1056×480, 390×844,
  Settings/no-music, reduced motion, all four Mutation states, and Survival stonefall
  with one canvas, zero DOM board cells, no overflow, and zero reported page errors.
  Independent QA `b60511e` accepted with no P0–P2 finding. The inherited user-owned
  `package-lock.json` was not changed or staged.

## 2026-07-24 — T13.13 multi-pass selector, Mutation, and Next repair accepted

- Puzzle level options now keep every incomplete numeral centered, while a completed
  option replaces its numeral with one centered accessible SVG tick. There is no
  literal `√`, corner badge, or secondary completion ornament; the selected name and
  inline current-best text remain stable beside the real, clean preview.
- Settings opened from pause resumes directly through **继续游戏 / Continue**; records
  use a far-right date without a middle dot. The shared right rail removes its visual
  divider, separates Mutation status from metrics/Next, and renders the single Pixi
  Next well above the opaque rail cards so its forecast remains visible.
- Mutation now snapshots a cleared carrier before line removal, so full clears and
  nested Bomb chains trigger exactly once. Repeated Freeze/Collapse and Multiplier
  add ten seconds; Multiplier deterministically progresses from 2× to 4×. Four local
  material/effect/audio treatments replace the prior noisy marks and generic cues.
- Candidate `fcd6fce..3e2bcd9` passed typecheck, 22 files / 159 tests, and the
  746-module production build. Multi-round browser evidence covers desktop, portrait,
  landscape, and reduced motion with one canvas/zero DOM cells, a visible live Next
  preview, a carrier, no overflow, and zero console/page errors. Independent QA first
  held final evidence provenance, then closed the P1 with fresh artifacts and found no
  P0–P2 issue. The inherited `package-lock.json` remains excluded.

## 2026-07-24 — T13.12 selector, settings, and Mutation expression accepted

- Puzzle now presents a fixed-height natural best-result line, a compact completed
  `√`, and a single dark selected-board preview without the former white SVG artifact.
  Settings becomes a responsive two-column control, keyboard, rules, and record sheet;
  `S` and `Esc` remain available during the entry countdown without enabling gameplay;
  and the bottom individual touch-key strip is removed for direct board gestures.
- Mutation's four carriers are full faceted ice, gravity, burning bomb, and score
  materials with per-cell emblems. Its rail shares Classic's score/lines/combo/fall
  grammar and adds a grey-or-active Freeze/Collapse/Double ledger; each activation has
  a bounded local visual cue and item-owned sound, with Bomb remaining a direct result.
- The accepted product range is `9b6188f..ec36924`: typecheck, 22 files / 146 tests,
  and the 746-module build pass. Independent QA `d7fc929` accepts after a recovered
  real local-Playwright audit of desktop/390px layouts, countdown controls, one canvas,
  no DOM cells/touch rail, a real special carrier, no overflow, and zero console/page
  errors. The pre-existing user-owned `package-lock.json` is excluded.

## 2026-07-24 — T13.11 brighter mode glyphs and keyboard guide accepted

- Brightened the homepage's teal, blue, amber, and violet mode-glyph accents while
  retaining their distinct shapes, mineral-white workbench, structural dividers, and
  mode-specific action treatments.
- Reordered the Settings keyboard reference into **玩法操作 / Gameplay** first—arrows,
  Space, and Puzzle-only Z—followed by **快捷键 / Shortcuts** for Settings, pause,
  restart, Escape, option navigation, and Enter. The live game right rail remains free
  of duplicated keyboard instructions.
- The `25fa232..fc9cc3c` candidate passed TypeScript, 146 complete tests, a
  746-module production build, Chinese/English/Puzzle/mobile browser checks, and
  independent QA `4457667`. The pre-existing user-owned `package-lock.json` is not part
  of this delivery.

## 2026-07-24 — T13.9 异变 item mode and carrier presentation accepted

- Replaced the retired fourth-mode Collapse run with **异变**: a fresh seeded
  top-out run that increases gravity every six cleared-line equivalents and introduces
  deterministic item carriers after the opening two pieces. Clearing any carrier cell
  activates Freeze, Collapse, Bomb, or Multiplier; the shared rail exposes the active
  result/timer. Survival now begins at three bedrock rows while keeping its 13→6-second
  pressure curve. Legacy fourth-mode records reset, while valid Classic/Survival
  date-stamped top-five records remain.
- Carrier bodies now use four full, high-separation materials rather than ordinary
  tetromino hues: ice blue Freeze, violet Collapse, coral Bomb, and warm-gold
  Multiplier. Each keeps the original core/halo treatment, has a bounded arrival pulse,
  and triggers an item-coloured board flash. Reduced-motion users receive the same
  special state as a static 240 ms flash rather than an animation.
- The initial independent review found that a 1 ms reduced-motion flash expired before
  it could paint. The targeted repair adds a direct 16 ms-frame draw regression and a
  fresh independent recheck accepts candidate `ca8c7f6` with no P0–P2 findings.
- Final gates pass: typecheck; 22 test files / 146 tests; production build with 744
  modules; and a fresh 1440×900, reduced-motion 390×844, and 844×390 browser audit
  showing one canvas, zero DOM cells, no overflow, and zero console/page errors. The
  coordinator-owned 5176 audit listener was released; unrelated 5173 remains untouched.

## 2026-07-24 — T13 isolated reproducibility QA record

- Read-only reproduction of product candidate `6411b5e` in a clean detached worktree
  passed `npm.cmd ci --no-audit --no-fund`, `npm.cmd run typecheck`, the default
  `npm.cmd run test` (22 files / 138 tests), and `npm.cmd run build` (743 modules).
  A separate streamed invocation observed its first normal test output at 294 ms with
  no stderr, so the previous silent default-Vitest startup symptom did not reproduce.
- Static Core review verified schema-6 Puzzle route evidence for all 20 levels: two
  public-dispatch route families per level, early divergence, legal terminal replay,
  and immutable sparse anchors. It also rechecked the fixed-queue Puzzle boundary,
  fresh random Classic/Survival bags, 7-row / 13→6 Survival pressure, and endless
  top-ten Collapse sorting.
- Fresh browser evidence at desktop, portrait, landscape, and reduced-motion states
  confirms the four modes, Settings sheet, Survival bedrock, untimed Collapse rail,
  Puzzle undo/two-Next queue, one canvas during play, zero DOM board cells, no
  overflow, and zero console/page errors. Visual inspection found no stray rail line,
  clipped active piece, obsolete Puzzle row caption, or visible completion checkmark.
  Ignored local audit output is retained under `.local/audits/t13-readonly-browser/`.
- The isolated Vite tree on port 5174 and its exact temporary detached worktree were
  released after audit. An unrelated pre-existing VS Code listener on port 5173 was
  intentionally retained. Technical disposition is **PASS**; an external independent
  QA acceptance remains pending because this was a coordinator-run isolated audit.

## 2026-07-24 — T13.6 Puzzle selector completion treatment candidate

- Removed the selected `X 行残局` caption and all visible Puzzle completion checkmarks.
  Completion now appears only through the selected structural level name's calm green
  color; this works for every completed level. The compact fixed-anchor fact and
  personal best remain, so the selection surface stays informative without duplicate
  status chrome.
- `npm.cmd run typecheck`, the 22-file / 138-test full suite, and the production build
  pass. Fresh browser evidence seeds a real completion record, verifies the computed
  title color for more than one completed level, confirms no obsolete caption/glyph,
  and finds zero overflow or console/page errors. The generic web-game client also
  passes; ignored captures remain under `.local/audits/t13-6-selector/` and
  `output/web-game/t13-6-selector-client/`.
- The coordinator-started Vite tree was released and port 5173 was confirmed free.
  Independent read-only QA remains pending, so this is a coordinator-verified recovery
  candidate rather than an acceptance disposition.

## 2026-07-24 — T13.5 coordinator verification candidate

- Reconciled the live goal with every later correction: the page-facing identity is
  plain-text `Tetris`; Classic, Survival, Collapse, and Puzzle have distinct stated
  objectives and ranking rules; and the browser remains wrapper-ready without adding
  a desktop package.
- Delivered the bounded product range through `6c65150`: endless lines-first
  Collapse/top-ten persistence; Survival's seven-bedrock 13→6-second pressure;
  deterministic, readable fixed-queue Puzzle anchors/routes with no exposed hint
  system; compact per-level best-clear counts; selected confirmation actions; and one
  `S`-reachable Settings sheet for effects, procedural music, volume, pause/continue,
  and restart confirmation. Puzzle success now says `重来`; non-Puzzle results retain
  `再来一局`.
- Final local gates pass: `npm.cmd run typecheck`; `npm.cmd run test` (22 files /
  138 tests, 38.99 seconds); and `npm.cmd run build` (743 transformed modules,
  291 ms). Real browser evidence at 1440×900, 390×844, and 844×390 has no console or
  page errors and no overflow; the game has one canvas and no DOM cell grid. The
  settings and Puzzle frames were visually inspected; temporary evidence remains
  ignored beneath `.local/audits/t13-final-browser/`.
- The coordinator-started Vite tree was released after review and port 5173 was
  confirmed free. Independent read-only QA remains pending, so this is a verified
  recovery candidate rather than an acceptance disposition.

## 2026-07-24 — T13 production-test discovery recovery candidate

- Fixed the default Vitest quality gate so it discovers only current `src/` test files.
  Ignored local recovery helpers and historical workstream tests remain preserved but
  no longer execute as product tests or import retired route artifacts.
- The unqualified `npm.cmd run test` now passes 23 files / 138 tests. `npm.cmd run
  typecheck` and `npm.cmd run build` (746 transformed modules) also pass. The change is
  confined to `vite.config.ts`; Puzzle rules, levels, queues, anchors, selector, and
  visual surfaces are unchanged.
- Fresh real-time browser evidence at 1440×900, 390×844, and 844×390 confirms the
  existing Collapse and Puzzle interaction contract: two live hard drops, all 20
  Puzzle levels open, one canvas, zero DOM board cells, no viewport overflow, reduced
  motion, and no browser errors. Candidate: `dc9acca`.
- This resolves the concrete test-runner blocker. Independent read-only Core and
  visual/browser QA is still pending before any acceptance claim.

## 2026-07-24 — T13 current walkthrough recovery record

- Reclassified the ignored local walkthrough map without deleting any recovery
  material: obsolete T12 docs, images, selector audits, candidate scratch data, and
  retired scripts now live under
  `.local/audits/t12.6-walkthrough-legacy-20260724/`. `Solutions/` contains only the
  current `Solution-1.md` through `Solution-20.md` outputs and their SVG snapshots.
- Added the durable `tools/generate-puzzle-walkthroughs.mjs` generator. It reads the
  schema-6 artifact from disk, replays each current primary public route through the
  real Core, rejects any non-terminal/target/anchor/lock-count mismatch, and emits one
  feasible-route walkthrough per level. It does not change Puzzle definitions, queues,
  anchors, rules, selector, or gameplay UI.
- Fresh regeneration produced 20 Markdown files with 265 linked SVG snapshots. All
  links resolve, and the documented campaign remains five levels each across 5-, 6-,
  7-, and 8-row original-target bands. The routes are evidence of feasible solutions,
  not a claim of a unique or optimal answer.
- Final tools-only verification passed `node --check`, `npm.cmd run typecheck`, and
  `npm.cmd run build` (746 transformed modules), alongside the 20-route regeneration.
  The unchanged product source had already passed the explicit single-worker 45-file /
  270-test matrix and a live browser audit at 1440×900, 390×844, and 844×390. That
  audit rechecked Collapse hard drops, one canvas, no DOM cells, all-open Puzzle
  access, responsive layout, reduced motion, and zero browser errors. A post-tools
  full Vitest attempt emitted no startup output and was stopped; it is not counted as
  a pass.
- Candidate chain: `3fa71e0..41fbfec`. This is a user-authorized recovery record and
  publication checkpoint, not an independent-QA acceptance.

## 2026-07-23 — T13 Collapse mode candidate (user-authorized recovery push)

- Replaced the rejected Sprint time trial with **坍缩**, a 75-second score attack that
  compactly settles each column after every lock and again after every clear. Newly
  formed rows resolve as a scoring cascade; clear score grows with collapse depth.
  This makes a placement alter the board's structure before and after its first line,
  rather than duplicating Classic's continuous stack-and-clear loop.
- Added a clear Collapse HUD/result surface for score, current chain, best chain, and
  remaining time. Completed rounds rank by score, best chain, lines, then fewer
  pieces. The v5 leaderboard deliberately discards incompatible v4 Sprint rows;
  Classic and Survival rows migrate with a zero chain.
- Kept Puzzle source, selector, levels, queues, anchors, undo, hints, and visuals
  unchanged. The adjacent `8c51e8c` test-only replay-fixture correction updates its
  retained schema-6 route without changing Puzzle gameplay.
- Verification passed: `npm.cmd run typecheck`; the explicit single-worker 45-file /
  270-test matrix; `npm.cmd run build` (746 transformed modules); and a real-time
  browser audit at 1440×900, 390×844, and 844×390. It verifies live hard drops and
  visible locked Collapse cells, one canvas, zero DOM board cells, no overflow,
  no console/page errors, unchanged 20-level Puzzle access, and reduced motion.
- Candidate commits: `8c51e8c..eaf88d0`. This is a user-authorized recovery record,
  not an independent-QA acceptance.

## 2026-07-22 — T12.7 multi-route Puzzle guidance candidate (pending independent QA)

- Kept the deterministic twenty-level Puzzle campaign, fixed per-level queues,
  three-through-seven-row target progression, anchor contract, and existing tier unlock
  rule; Classic and Survival randomness, gameplay physics, line resolution, renderer,
  audio, and dependencies are unchanged.
- Replayed every level through the Core and recorded two genuine route families in the
  schema-v5 route artifact. Each alternate diverges at an actual locked placement at
  lock one or two, not merely in redundant inputs, and stays within zero to two locks of
  the canonical route. The existing queue/pattern order already provides readable
  choice, so no artificial seed or layout churn was introduced.
- Added a Puzzle-only strategy guide that unlocks after two placed pieces or twenty
  active seconds and persists per level through restart. It gives one structural cue,
  two named strategy families, and one placement intention at a time; it never reveals
  raw command streams or mutates the live queue, board, completion, or input state.
  Opening it pauses play and closing it restores the exact in-progress state; `B` is
  called out as the recovery path.
- Repaired the guide for short landscape viewports with an intentionally compact,
  scrollable sheet, while preserving the full reduced-motion fallback. Ignored local
  `Solutions/` walkthroughs were regenerated from canonical routes (20 Markdown files,
  126 linked PNG snapshots) and remain outside Git.
- Final coordinator gates passed: `npm.cmd run typecheck`; `npm.cmd run test` (47
  passed / 1 skipped files; 294 passed / 2 skipped tests); `npm.cmd run build` (744
  modules); and a live Playwright audit at 1440 × 900, 390 × 844, and 844 × 390. The
  audit used real locks to unlock the desktop guide, switched strategy/step, verified
  pause/resume without state mutation, one canvas, zero DOM board cells, no viewport
  overflow, zero console/page errors, and disabled guide transitions under reduced
  motion.
- Candidate source range: `c47b90c..c17fdcd`. This is a coordinator-verified recovery
  candidate only, not an acceptance: independent read-only Core and visual/browser QA
  is still pending.

## 2026-07-13 — New two-game branch sequence

- Created and pushed `codex/tetris` and `codex/temple-run` from the neutral `main` baseline.
- Began only the Tetris branch as required; the Temple Run branch remains untouched.
- Added branch boundaries, the Signal Foundry design contract, and the T1 implementation/acceptance scope.

## 2026-07-13 — Signal Foundry T1 implementation complete

- Built a deterministic 10 × 20 visible falling-block Marathon engine with hidden spawn rows, seven-bag generation, SRS kicks, hold, ghost, lock delay, scoring, levels, pause, restart, and top-out.
- Kept the simulation core serializable and independent from React, PixiJS, browser timing, storage, and audio.
- Added a fixed-step runtime, DAS/ARR keyboard input, responsive touch controls, procedural WebAudio, local settings/high-score persistence, reduced-motion support, and high-contrast rendering.
- Delivered the original Signal Foundry presentation across desktop, portrait, and landscape layouts without copied commercial art, branding, music, fonts, or screen composition.
- Added deterministic rule, replay, input, runtime, and QA-scenario tests.
- Browser QA passed 10 evidence contexts with one canvas, zero gameplay DOM cells, zero recorded console errors, deterministic four-line-clear midpoint evidence, real command-driven game over, and hashed screenshots.
- Mobile QA now drives the rendered controls with real Chromium touch events and verifies tap input, DAS long-hold, pointer-release cancellation, pause/resume, and reduced-motion behavior in portrait and landscape.
- Window blur and document visibility loss both suspend active play without accidentally resuming an already-paused session.
- Recorded a Pixi scene-preparation benchmark of 0.30 ms p95; headless rAF throttling remains explicitly diagnostic rather than acceptance evidence.
- Kept `codex/temple-run` unchanged; endless-runner work remains sequenced after the Tetris milestone is committed and pushed.

## 2026-07-14 — Tetris interaction and visual rebuild

- Renamed the player-facing game to `Tetris` and rewrote the remaining interface in concise, natural Chinese.
- Replaced the three-column settings/dashboard composition with one narrow data rail and one dominant graphite Pixi board on a measured paper field.
- Limited previews to one Hold and one Next, placed vertically, and removed the settings panel, seed display, ornamental footer copy, pattern/high-contrast option, manual reduced-motion option, and generic line-clear particles.
- Kept system `prefers-reduced-motion` behavior automatic while retaining only one small audio preference and one clearly labelled pause control.
- Added a large board-local `已暂停` state with an explicit continue action.
- Changed held soft drop to immediate input, a three-tick initial delay, then one row attempt per fixed tick; release cancels repetition immediately.
- Replaced event-reset position tweens with bounded continuous Pixi presentation following, reduced entry delay to three ticks, and coalesced routine React state updates to remove visible step stalls.
- Added deterministic Race mode: every five locked pieces advances a fixed gravity tier, capped at two ticks per cell; mode and piece count participate in state hash and replay.
- Added a fail-closed local leaderboard for score, lines, locked pieces, mode, and completion time with deterministic ordering and an eight-record bound.
- Final gates passed: typecheck, 8 files / 41 tests, production build, and 10 structured browser evidence entries.
- Browser evidence passed at desktop, 390 × 844 DPR3 portrait, and 844 × 390 DPR3 landscape with one canvas, zero gameplay DOM cells, zero console errors, fast keyboard/touch soft drop with release-stop, Race selection, game-over persistence, and a 0.20 ms Pixi preparation p95.
- No Temple Run source was changed in this slice.
- Coordinator accepted implementation candidate `b2075ba` after independent QA commit
  `c13961d`; QA independently reproduced clean install, typecheck, 8 files / 41 tests,
  build, responsive live browser interaction, screenshot hashes, and release-stop input.

## 2026-07-14 — Tetris T2/D4 three-mode milestone accepted

- Rebuilt the interface as the original Offset Drop visual system: warm ungridded paper,
  a deep-ink 1:2 board, a single cinnabar drop-band, restrained print offsets, and a
  compact game-first composition across desktop, portrait, and landscape.
- Removed Hold/暂存 from the core, replay/hash surface, inputs, renderer, controls, and
  player-facing UI. Playing now exposes exactly one 下一个方块 preview.
- Froze three visibly and mechanically distinct modes: open-ended 马拉松模式 with
  top-out, fixed-tick 20-line 竞速模式, and three deterministic 解谜模式 layouts with
  canonical queues, piece budgets, targets, completion, and loss conditions.
- Kept full Chinese mode names, `↑ 旋转`, fast held soft drop, direct hard drop, five
  touch zones, a narrow board-contained pause strip, and a mode switch that stays
  outside the board without stale Next-piece residue.
- Added mode-owned, fail-closed local leaderboards and deterministic rule/replay proofs,
  including Marathon top-out, Race completion, all three puzzle completions, puzzle
  budget failure, input behavior, and rotation replay hash `e6936c36`.
- Formal browser evidence contains 16 final-candidate captures at 1440 × 900 DPR1,
  390 × 844 DPR3, and 844 × 390 DPR3. It verifies one canvas, zero gameplay DOM cells,
  no overflow, zero console/page errors, responsive geometry, pause/mode states, real
  keyboard/touch commands, and terminal rule outcomes.
- Independent QA reproduced clean install, typecheck, the complete 9-file / 47-test
  suite, and build, then accepted the final evidence-manifest child `9d704d9` after all
  18 canonical Git-blob SHA-256 entries matched under both CRLF settings.
- Integrated QA-003 acceptance from `9d4537b`; superseded QA-002 commit `eabbcb6` was
  deliberately excluded. No Temple production or evidence path was included.

## 2026-07-14 — Tetris T3 design and Puzzle contract accepted

- Recorded the user's rejection of the T2 dark Offset Drop presentation as the start
  of a new T3 production chain; T2 remains historical evidence rather than the active
  visual or Puzzle contract.
- Accepted the original D5 `浅岩台 / Mineral Shelf` direction: a light paper and light
  mineral 1:2 board, a small complete `Tetris` wordmark, one Next, five 44px+ controls,
  a board-contained pause strip, and flat external mode/level selection without cards,
  modals, giant titles, diagonal bands, Hold/暂存, or meaningless telemetry.
- Corrected and re-captured all 12 D5 formal states. Independent D5 QA verified visible
  title safe insets, essential copy at least 12px including 844 × 390, Race copy at
  exactly 20 lines, six reachable representative level rows, no overflow/overlap, and
  zero recorded console errors. Accepted source/QA identities are `4e13fcc` and
  `e31a0b6`.
- Accepted the clean-room T3R six-level campaign contract. Every level starts from a
  non-empty authored 20 × 10 stack, uses one finite fixed sequence and exact piece
  budget, and succeeds only when the complete canonical board—including the hidden
  buffer—is empty after ordinary line resolution.
- Added fail-closed ordering for top-out, canonical-board-empty success, exhausted
  budget/queue, and invalid spawn; canonical queue index, completion, completed level,
  and unlock result are reserved for production state/hash/replay.
- T3R reference evidence now proves six deterministic solutions, including 5-lock
  late-campaign levels, effective rotations and at least three distinct landing
  columns; negative proofs cover hidden/visible residuals, initial full rows, invalid
  spawn, queue exhaustion, stale digests, unused queue, and terminal tail commands.
  Independent T3R QA accepted `a096d96` with QA `0cf78e3` after one targeted 18-test
  verifier run in a clean dependency environment.
- Replaced root `docs/DESIGN.md` and `docs/CURRENT_TASK.md` with an atomic T3 production plan:
  C1 implements and independently verifies the core campaign first; V1 then binds the
  accepted D5 frontend and real campaign progression before the coordinator publishes
  a completed T3 milestone. No T3 production source is claimed complete by this entry.
- The pre-existing untracked `docs/screenshots/temple/` directory remains excluded and
  untouched; Temple Run continues only in its separate worktree and branch.

## 2026-07-14 — Tetris T3 six-level Puzzle core accepted

- Replaced the three temporary `offset-*` puzzles with the six accepted clean-room T3
  campaign definitions and their fixed queues, budgets, names, and difficulty data.
- Added canonical queue index, full authored queue, board-empty goal, completion code,
  completed-level ID, and next-unlocked-level ID to deterministic state and hashing.
- Enforced the frozen terminal order: hidden occupancy/top-out, canonical-board-empty
  success, exhausted budget/queue, then exact authored spawn. Final-piece success wins
  over budget failure; terminal states are inert and restart reconstructs the exact
  authored level.
- Migrated the design verifier to production initialization and public dispatch without
  legacy aliases, state injection, or treating historical adapter hashes as production
  authority.
- Candidate `8323203` passed the targeted verifier, focused campaign tests, typecheck,
  the complete 11-file / 73-test suite, and production build. Independent QA reproduced
  a clean install and the full suite, then accepted it in log-only commit `b79e142`.
- This is a core milestone only. The D5 Mineral Shelf interface, real level selection,
  fail-closed unlock persistence, responsive browser evidence, and removal of the
  deprecated presentation bridge remain the active T3-V1 work.
- No Temple path or the pre-existing untracked `docs/screenshots/temple/` directory was
  staged or modified.

## 2026-07-14 — Tetris T3 Mineral Shelf campaign accepted

- Bound the accepted six-level canonical Puzzle campaign to the light, board-first
  Mineral Shelf interface: each level starts from its authored non-empty board and
  finite fixed queue, succeeds only by emptying the full canonical board, and unlocks
  only the next level through versioned fail-closed local progress.
- Replaced the deprecated dark T2 Offset Drop surface with the accepted light mineral
  1:2 tray, complete `Tetris` wordmark, one graphical Next preview, compact
  mode-owned statistics, a board-contained pause strip, and one continuous five-action
  keyboard/touch rail. Hold/暂存 and line-target Puzzle progress are absent.
- Preserved deterministic Marathon and 20-line Race behavior, while Puzzle uses real
  canonical completion codes for board-empty success, top-out, invalid spawn, and
  budget exhaustion rather than UI-derived results.
- Final evidence covers the real runtime at desktop, portrait, landscape, and long
  Puzzle values, including keyboard/touch actions, mode and level selection,
  completion/unlock, malformed persistence fallback, one canvas, zero gameplay DOM
  cells, no overflow/overlap, and zero console/page errors.
- Candidate `6fb1728` passed clean install, typecheck, the full 12-file / 78-test
  suite, build, browser review, and a final coordinator live review. Independent QA
  accepted the canonical raw-Git-blob evidence manifest in log-only commit `fdd1ffb`;
  all 32 evidence entries match under both CRLF configurations.

## 2026-07-17 — Bounded commit policy adopted

- Added an authoritative small-checkpoint policy so core, frontend, generated evidence,
  QA verdicts, and coordinator records are no longer accumulated into one large commit.
- Set a default source checkpoint budget of 10 product/test paths, 500 hand-authored
  changed lines, and one subsystem or user-visible claim, with explicit pre-authorization
  required for any atomic exception.
- Recorded the inherited `docs/CURRENT_TASK.md` and `docs/DESIGN.md` edits as separately owned docs
  work; neither may be silently bundled with the next gameplay or frontend commit.

## 2026-07-17 — T5 authored endgames and cohesive mineral interface accepted

- Completed the clean-room T5 product as plain-text `Tetris` with player-facing
  `经典`, endless accelerating Race, and fifteen all-enabled Puzzle残局. Each残局 is a
  legal zero-clear mid-game snapshot with source-piece colors, normal gravity,
  continuous seeded seven-bag input, and two verified public-command solutions.
- Replaced isolated tile cards with cohesive Pixi tetromino components across active,
  locked, Next, and whole-piece Ghost rendering. Internal shared edges are suppressed;
  depth comes only from the frozen restrained mineral bevel and exact coordinated
  garnet/sea-pine/ochre/storm/moss/rock-violet/lake mapping.
- Adopted Space Grotesk plus Noto Sans SC through Google Fonts with a complete system
  fallback. Restored visible Next and keyboard context at every required viewport,
  capped the clear sweep at nine ticks, and replaced positional statistic borders with
  semantic roles so desktop and compact dividers remain continuous.
- Final product source is `effb353c0a4d1bef26fa524ed38d3d3653f45eb8`;
  post-source candidate tip is `ba5d387f6c32224a4869ccc4e84564d7bcd64b50`.
  The last-source gates passed typecheck, 40 files / 258 tests (39 files and 256 tests
  passed; 1 file and 2 tests skipped), the 739-module production build, the prescribed
  action client, and loaded/blocked-font five-viewport browser matrices.
- Independent static/functional and visual/browser QA accepted the source. Formal
  evidence `c0832e43dc1cdd31c074066919c229d4a9fe5518` records 23 screenshots across
  all five exact viewports, first/eighth/fifteenth Puzzle binding, three real gravity
  locks, ordinary Race top-out, and first-level completion at 35 pieces / 22 lines.
- Independent evidence QA inspected 23/23 captures at original detail and reproduced
  25/25 SHA-256 entries from raw Git blobs. `browser-evidence.json` and
  `SHA256SUMS.txt` both contain zero CRLF; one-canvas/zero-DOM-cell geometry, 2:1
  boards, 44 px controls, lifecycle teardown, and zero unexpected browser errors pass.
- `index.html`, dependencies, historical T3/T4 evidence, and all separate game
  repositories remain unchanged by the accepted final repair.

## 2026-07-18 — Brighter divided facets, faster lock, and entry countdown

- Preserved the accepted T5 layout and rebuilt the Pixi cell material so connected
  tetrominoes keep one outer silhouette, a larger inter-piece channel, narrower
  internal seams, individually readable facets, and restrained dimensional depth.
- Applied the exact light `雾昼矿物` palette without changing layout, copy, responsive
  geometry, dividers, controls, or the plain-text `Tetris` identity.
- Reduced the shared grounded lock delay from 30 to 18 fixed ticks while retaining the
  existing movement/rotation reset rules and 15-reset cap.
- Added an input-gated `3 / 2 / 1` countdown on initial Classic, Race, and selected
  Puzzle entry. Gravity, audio, keyboard, touch, and DEV-QA reset/selection/action
  routes cannot advance or mutate the canonical ready state before the countdown ends.
- Final product source is `48176fe3d23cbc450fe39b38310c8a6b6eb71945`;
  candidate log tip is `d292b15dd012ade4c635b15595d276505ac72c58`.
  Final gates passed typecheck, 260 passed / 2 skipped tests across 40 files, the
  739-module build, the prescribed action client, and the five-viewport browser matrix.
- Independent Core and frontend/browser cross-QA accepted the exact repaired source
  with no open finding. Evidence `7d374188b8672cef32b5d90023db4f677421d178`
  contains 24 source-bound screenshots and 26/26 matching SHA-256 entries with zero
  unexpected browser errors.
- `index.html`, dependencies, Puzzle definitions/references, and separate game
  repositories were not changed.

## 2026-07-18 — Three independent mode rules and rising-floor Survival

- Split the three player-facing modes by objective. Classic is fixed-speed chain-score
  play, `生存` replaces visible `竞速` with permanent rising-floor pressure, and Puzzle
  remains the fifteen-level authored canonical-board-empty library.
- Removed Classic/Survival level acceleration. Both use fixed 48-tick gravity; Classic
  adds a visible consecutive-clear combo bonus and resets it on a non-clearing lock.
- Added a type-safe canonical `BEDROCK_CELL`. Every five Survival lines clears and
  scores first, then pushes the remaining board upward and appends one unbreakable
  mineral row. Bedrock blocks placement, never clears, has its own renderer material,
  participates in deterministic Survival state/hash, and resets on restart.
- Preserved all thirty accepted Puzzle solution event digests and final hashes through
  an invisible score/event compatibility layer; Puzzle gravity, UI, continuous queue,
  starting boards, goals, and reference artifacts remain unchanged.
- Updated the concise UI to `经典 / 生存 / 解谜`; Classic statistics are score, lines,
  and `连消`, while Survival statistics are score, lines, and bedrock height. Removed
  visible `竞速`, `等级`, and `速度档` plus the obsolete DEV level snapshot.
- Final product source is `5a3c35af325e4fa43841190e8acfb4867c8f1ebc`;
  source-log tip is `2308d80a104177025d0bfcb3d52cab69ac054ac0`.
  Final gates passed typecheck, 40 files / 263 tests (39 files and 261 tests passed;
  1 file and 2 tests skipped), the 739-module production build, and one formal
  browser-evidence pass.
- Independent Core and combined frontend/browser QA accepted with no finding. Formal
  evidence `a26d989` contains 24 source-bound captures, a 695-command public Survival
  replay at 24 lines / 4 bedrock rows, one canvas, zero DOM cells, 44 px controls, and
  zero unexpected browser errors.
- Independent evidence QA inspected all 24 PNGs at original detail and reproduced all
  26 raw-Git-blob SHA-256 entries with zero CRLF or integrity failure.
- `index.html`, dependencies, Puzzle definitions/references, ordinary tetromino
  geometry/palette, and every separate game repository remain unchanged.

## 2026-07-18 — Survival bedrock warm-mineral recolor accepted

- Replaced only the permanent bedrock's blue-grey material with the low-saturation
  warm rock-brown set `#9C8B73 / #76664F / #40372D / #CDBEAA`. This creates a clear
  geological layer beneath the seven brighter playable materials while preserving
  the existing divided facets, seams, and directional relief.
- Source `4b27a98` leaves all ordinary piece colors, renderer geometry, gameplay,
  layout, copy, dependencies, and `index.html` unchanged. Direct contrast regression
  holds both face endpoints above 3:1 against the board well.
- Final gates passed typecheck, 261 passed / 2 skipped tests across 40 files, the
  739-module build, the prescribed action client, and one 24-capture browser matrix.
- Independent static and visual/evidence QA both accepted with no P0–P3 finding.
  Evidence `367a443` contains zero browser errors, four visible full bedrock rows at
  24 lines, and 26/26 matching raw-Git-blob checksums.

## 2026-07-18 — Timed Survival pressure and restrained motion accepted

- Classic and Survival now share a line-driven gravity curve: speed advances every
  ten cleared lines from 48 ticks per cell down to the three-tick cap. Puzzle remains
  fixed at its accepted 48-tick cadence and all thirty signed routes stay unchanged.
- Survival now raises one permanent bedrock row after a 40-second playing-time timer.
  Every five cleared lines removes one bottom bedrock row when present, resets pressure,
  and shortens the next interval by two seconds down to a ten-second minimum.
- The UI removes the two unexplained decorative horizontal bars and states the three
  mode rules directly. Classic shows fall cadence; Survival shows bedrock height and
  next-rise countdown, including pending state.
- Added only bounded mode-entry/focus feedback and a brief renderer stack shift on
  bedrock rise/removal. Reduced motion explicitly disables the new animations,
  transitions, and transforms without altering canonical timing.
- Core source is `ff90d61`; final product source is
  `356440cf0f785b2558745c6eddd307b1654525e6`. Final gates passed typecheck,
  267 passed / 2 skipped tests across 40 files, and the 739-module production build.
- Formal evidence `9ef2708` contains 25 captures and zero unexpected browser errors.
  The public-command replay proves one full bedrock row at 2763 ticks, then five lines,
  zero bedrock, zero pressure, and a visible 38-second next interval. All 27 hashes
  match. Independent static and visual QA accepted with no P0–P3 finding.
- `index.html`, dependencies, Puzzle data/references, ordinary piece materials, and
  every separate game repository remain unchanged.

## 2026-07-18 — Standalone repository migration

- Published only the latest `codex/tetris-recovery` history as the sole `main`
  branch of `https://github.com/Udkam/reproduction-tetris`, from exact source
  `1e2ac983f66466b96c2530f589fdc393350e8c04`.
- The older `codex/tetris` history was deliberately not migrated to the new remote.
- Repointed `origin` and the active repository contracts to the standalone
  repository and its `main` branch. The historical `Udkam/Game-1` remote was not
  rewritten or deleted.
- Updated the active README repository boundary; historical logs, evidence, and
  local QA archives retain their original paths and branch names.

## 2026-07-18 — Mode field, Puzzle library, Survival, and records refinement

- Replaced the rigid mode table with a stepped Tetris landing field and a stable
  four-cell Puzzle icon that no longer tilts upward on hover.
- Rebuilt the fifteen-level Puzzle library around canonical colored thumbnails, a
  larger selected-board preview, a prominent `返回模式` action, and compact
  portrait 3 × 5 selection. Removed `目标：清空棋盘` from home and library.
- Corrected compact preview sizing so full canonical boards render instead of clipped
  corner fragments.
- Changed Survival pressure to 20 seconds initially, minus one second every five
  cleared lines, with a ten-second minimum; the existing bedrock reward/reset and
  shared progressive gravity remain intact.
- Restored the local result leaderboard within the current action-sheet design.
  Classic ranks by score; Survival ranks by cleared lines.
- Turned `index.html` into a real reduced-motion-aware Tetris Loading screen that
  hands off after the React surface paints.
- Final gates passed 268 tests with 2 skipped across 40 files, the 741-module
  production build, the prescribed action client, and desktop/portrait/landscape
  browser checks with zero console errors or viewport overflow. Real top-out runs
  persisted and rendered both mode-owned ranking metrics.

## 2026-07-19 — Documentation archive and execution-state reconciliation

- Archived the root project contracts and progress record under `docs/`, then updated
  active governance references to the new locations while preserving the historical
  workstream logs included in the archive.
- Reconciled `docs/CURRENT_TASK.md` with the accepted T8 product tip `32ed0c7`:
  no product implementation task remains open, and publication is the only pending
  coordinator action.
- Narrowed the repository ignore rule from `*.log` to `debug.log`; durable workstream
  and changelog records are no longer excluded by a broad log-file pattern.
- This is documentation and ignore-policy maintenance only. No product source, test,
  build, browser evidence, dependencies, or generated artifact changed or was run.

## 2026-07-19 — T9 Survival descent and Puzzle archive candidate

- Added a five-layer Survival opening, `max(8, 15 - floor(lines / 3))` pressure, one
  removable bedrock row per three-line boundary, and a matching three-line gravity
  ladder. Restart returns to the five-row opening; Classic and Puzzle retain their
  previous cadence contracts.
- Made the original plain-text `Tetris` identity unmistakable on the home screen and
  rebuilt the fifteen-level Puzzle selector as a compact archive with colored board
  tiles and a high-contrast selected preview.
- Candidate range `502f978..7910e91` passed typecheck, 269 passed / 2 skipped tests,
  and the 741-module production build. The web-game browser client produced no errors;
  visible inspection confirms the home, archive, and live five-layer Survival opening.
- Status: **pending independent Core and visual/browser QA; not pushed**.

## 2026-07-19 — T9 Puzzle archive cleanup candidate

- Removed the decorative selection dot and all per-level miniature boards from the
  archive; the selected canonical board is now the only Puzzle preview.
- Contract `575a81c` and UI source `15e6412` passed typecheck, 269 passed / 2 skipped
  tests, a 741-module production build, and a zero-error browser inspection.
- The extended candidate range is `502f978..15e6412`; independent QA remains pending
  and nothing was pushed.

## 2026-07-19 — T12.5 gentle Puzzle campaign and undo accepted

- Replaced the unaccepted budget/anchor-heavy T12.4 Puzzle outcome with twenty fixed
  shallow teaching boards. Levels progress from obvious direct gaps through one normal
  rotation to clear vertical I channels; clearing all original targets is the sole win
  condition. There is no timed input, public piece allowance, anchor requirement, or
  budget terminal.
- Added deterministic Puzzle-only undo on `B` and the sixth touch control. It restores
  the pre-lock board, original-target ownership, active piece, queue/randomizer,
  timers, score, lines, and placed count, including hard-drop scoring; Classic and
  Survival remain unaffected. Renderer rollback clears stale landing/clear effects.
- Rebuilt level selection as the seven-tier `解谜航图`, with complete visible unlock
  rules, three initial levels, two-completion tier gates, readable inert sealed entries,
  no per-entry thumbnail/corner-dot decoration, and exactly one selected preview.
- Source candidate `d2469e3` passed typecheck, 44 passing / 1 skipped test files
  (286 passing / 2 skipped tests), and the 741-module production build. Browser
  evidence `ae49069` verifies 1280×720, 390×844, and 844×390 layouts, zero console
  errors/overflow, two Puzzle Next previews, one canvas/zero DOM cells, and keyboard
  plus touch undo restoring score 36→0 and placed count 1→0.
- Independent Core and visual/browser QA accepted `69eec5f..d2469e3` without P0–P2
  findings in `aa23394`. The existing `.gitignore` continues to keep local
  `Solutions/` walkthroughs out of publication.

## 2026-07-21 — T12.6 layered Puzzle curriculum and Current Observatory recovery candidate

- Replaced the twenty shallow teaching boards with replay-verified three- through
  seven-row original-target bands that rise through the campaign. Selected boards add
  sparse immutable single anchors outside their original-target rows; anchors remain
  optional spatial constraints, never move on line clears, and do not count toward
  victory. Puzzle still has unlimited ordinary play, fixed deterministic sequences,
  and no timed block or usable-piece limit.
- Reordered the campaign by recorded replay difficulty and kept the clear tier rule:
  `01–03` are immediately open; completing any two of a prior three-level tier opens
  the next; completing any two of `16–18` opens `19–20`. The ignored local
  `Solutions/Solution-1.md` through `Solutions/Solution-20.md` set now provides a
  verified public-command walkthrough with a starting board and post-lock PNG image
  for every step.
- Replaced the dense Puzzle selector with a text-light Current Observatory: a single
  dominant dark selected-board well, seven numbered switchback sectors, only the
  selected tier's three compact stops, one selected name/status/anchor note/action,
  and one concise unlock line. The design has purposeful entry/sweep motion with a
  tested reduced-motion fallback, local bundled typography, no miniature route boards,
  no cards, no decorative dots, and no repeated technical labels or row counters.
- Refreshed the deterministic public-command QA route for current `t5r-drift-08`,
  restoring the whole-suite completion replay after the board redesign.
- Candidate range `3709fa3..0149f60` passed final typecheck, 45 passed / 1 skipped
  test files (287 passed / 2 skipped tests), and the 741-module production build.
  Browser checks at 1440×900, 390×844, and 844×390 report no overflow or console
  errors, one selected preview and no route previews; reduced motion removes all
  observatory animations; starting a selected level produces exactly one canvas.
- Status: **user-authorized recovery candidate; pending independent read-only Core and
  visual/browser QA, and not an acceptance claim.**

## 2026-07-24 — T13.10 TetraMorph interface and Puzzle refinement accepted

- Kept the single local **TetraMorph** wordmark while establishing an offline bilingual
  typography hierarchy: bold Playwrite New Zealand Basic for the wordmark, Space Grotesk
  for interface/body headings, and JetBrains Mono for data and keycaps. The live UI,
  aria labels, dialogs, rules, dates, records, selector, touch copy, and canvas label
  now switch persistently between Chinese and English without changing Core semantics.
- Settings now resumes on an empty-backdrop click; the in-run Puzzle surface presents
  only practical objective counters, not a selected level name or `1/20` ordinal.
  Puzzle `Z`/touch undo has no confirmation: it restores the pre-spawn checkpoint and
  refalls the same just-locked piece. The selector uses concise natural level names,
  clear current-best copy, and a light-mineral selected-preview system.
- Independent QA accepted the complete `a1d8b16..b005a14` candidate in `fa95cae` with
  no P0–P2 findings. It held and then rechecked a 390×844 objective ellipsis; the final
  responsive repair preserves the full target at both portrait and landscape reduced
  motion. Typecheck, the one-worker 22-file / 146-test suite, the 746-module build,
  and desktop/portrait/landscape browser audits pass with one gameplay canvas, zero DOM
  board cells, no overflow, and zero console/page errors.

## 2026-08-03 — T26 v1.0.0-rc.1 portable release correction candidate

- Reopened Phase F after final read-only QA rejected `62163b1` with 0 P0, 2 P1, and 1
  P2: evidence was machine-specific, status documents conflicted, and package metadata
  was stale.
- Aligned package and lock metadata to `1.0.0-rc.1`, pinned Playwright `1.61.1`, removed
  personal absolute paths from executable evidence scripts, and documented clean-clone
  Chromium setup. Gameplay and presentation source remained frozen.
- Refreshed Phase-E lifecycle and Phase-F six-frame evidence on source `85a3431` in
  Chromium `149.0.7827.55`; ports `4191/4192` were released and both audits are clean.
- Typecheck, `318 passed / 3 skipped`, the 756-module build, committed-lock `npm ci`,
  direct dependency inspection, OSV, and redacted candidate-range gitleaks pass. This
  is a corrected candidate, not final acceptance; the second independent QA is still
  required.

## 2026-08-03 — T26 TetraMorph 1.0.0-rc.1 accepted

- Final QA's only remaining P1 was contradictory current-status text at the top of
  `docs/CURRENT_TASK.md` and the T26 coordinator log; product, package, portable evidence,
  and refreshed audits were accepted.
- Docs-only checkpoint `d700ca3` aligned both authoritative headers, blocker, and next
  action with the verified Phase-F audit.
- Independent read-only QA accepted `d700ca3` with P0 0 / P1 0 / P2 0 / P3 0. The RC
  programme is complete; no gameplay or evidence artifact changed after the accepted
  source-bound proof.

## 2026-08-04 — T27-R1 final follow-ups accepted

- Removed the entry countdown from Puzzle only. Opening a level, replaying a completed
  level, restarting from Settings, or confirming the board restart now resets the fixed
  authored queue and starts the first piece immediately; Classic, Survival, and Mutation
  retain their accepted entry staging.
- Added three broad Classic difficulty grades derived from the configured gravity-range
  midpoint, persisted the selected bounds and grade in the v9 leaderboard schema, migrated
  valid v8 Classic rows to Standard, and retained an independent top five per grade with
  compact Settings and result filters.
- Final product source `ca2bc48` passed typecheck, the complete suite
  (`348 passed / 3 skipped`), and the 759-module production build. Browser evidence commit
  `b0aa433` in `docs/evidence/t27-final/` reports zero errors, one Canvas, zero DOM board
  cells, a populated active Puzzle piece with no countdown node, and the retained Classic
  countdown plus all three grade filters.
- Independent read-only QA accepted `6189622..b0aa433` with P0 0 / P1 0 / P2 0 / P3 0.
  Existing local deltas under `docs/evidence/t27/` and
  `docs/evidence/t27-r1-followup/` remain outside this accepted candidate.

## 2026-08-05 — T31 Mutation feedback and row-wise arrival accepted

- Restored the frameless Mutation status as a stronger readable ledger and moved Next
  to a dedicated unmasked Pixi preview plane, keeping it visible during active play and
  board-local interruption states.
- Preserved Supergravity as a per-piece landing latch after the global timer expires:
  the airborne piece's independent-column ghost, final locked cells, lock event, and
  feedback coordinates agree; the latch clears only after that piece locks.
- Reworked two-row board-mouth arrival so the lower occupied row enters first while the
  complete final landing guide is already visible; the upper row crosses one configured
  gravity interval later without changing deterministic Core spawn geometry.
- Ice and Supergravity activations now use respectively four local snowflakes and five
  local gravity-factor particles, with reduced-motion-safe static endpoints.
- Accepted product/test source `7c4a9a1` and evidence `735effe` pass typecheck, the
  complete suite (`369 passed / 3 skipped`), production build, one-Canvas/zero-error
  browser audit, and independent QA with P0 0 / P1 0 / P2 0 / P3 0.

## 2026-08-05 — T31-R2 player re-review regressions accepted

- Strengthened the frameless Mutation-state hierarchy without reintroducing cards or
  visible seconds, restored the current-arena Next bridge, and preserved a complete
  independent-column ghost and lock for an airborne Supergravity-latched piece after
  the global timer expires.
- Product/test source `432fde4` passes focused 101-test coverage, final typecheck, the
  complete suite (`373 passed / 3 skipped`), production build, and diff check.
- Evidence `a00845c` plus `f859d68` proves visible Next pieces in active Classic and
  Mutation at 1440x900 and 1125x1196, one Canvas, zero DOM board cells, zero browser
  errors, and timer-expired Supergravity preview/lock agreement.
- Independent read-only QA accepts exact range `c291afb..532e636` with P0 0 / P1 0 /
  P2 0 / P3 0. The bounded browser/server batch is released, and T32 board authoring is
  admitted under its committed curriculum and exact-proof contract.

## 2026-08-12 — T37 Intro-04 contract R2 accepted

- Replaced the contradicted eight-drop Intro-04 authoring boundary with exactly seven legal
  zero-clear setup drops, 28 targets, twelve gaps, a lock-1 local clear through the exact
  two-cell floor opening, and a four-through-six-lock proof range. The sole corridor,
  survivor mapping, terminal three-row vertical-I clear, schema-8 certificate, and all 53
  pairwise exclusions remain mandatory.
- Independent read-only review accepts exact docs range `16570db..a09b64f` with
  P0 0 / P1 0 / P2 0 / P3 0 / GAP 0. Only repository-external candidate discovery is open;
  no Intro-04 product or authoring source has been admitted.

## 2026-08-14 — T37 settled in-page overlays accepted

- Added an explicit latest-owned presence lifecycle for first-entry rules, Settings,
  same-page confirmations/results, and board-local pause/restart curtains. Full motion
  uses restrained 120/180/150 ms settles and 120 ms releases; reduced motion is
  transform-free and at most 32 ms.
- Closed rapid reopen, cross-sheet ownership, StrictMode cleanup, focus restoration, and
  route-handoff races without changing gameplay Core, Runtime timing, audio, scoring, or
  Endgame content. A final two-file responsive repair keeps the Settings sheet inside a
  390 x 844 padded viewport.
- Final source `27d3194` passes typecheck, the complete suite (`532 passed / 15 skipped`
  in `55 passed / 2 skipped` files), and production build. Evidence `696d32d` contains
  fourteen real Chromium frames, zero audit/browser errors, legal terminal-result replay,
  one gameplay Canvas, zero DOM board cells, and full/reduced responsive coverage.
- Independent QA recomputes all 17 evidence hashes and accepts the source/evidence chain
  with `P0 0 / P1 0 / P2 0 / P3 0 / GAP 0`. Normal-speed whole-piece material review is
  the next slice; Bomb sound remains an explicit human-listening gate.

## 2026-08-14 — T37 Bomb R3 stylized audition ready for player listening

- Recorded the player's rejection of every realistic/loud R2 normal and chain sound while
  preserving the accepted full-motion Bomb visual and D1 page transition. R3 uses only
  original deterministic synthesis: three short dry block-break motifs and three paired
  low-gain chain-collapse extensions; no recorded explosion media or product audio path
  is involved.
- Final evidence `af97328` binds generator/recipe/page/verifier/browser hashes, preserves
  all six initial WAV hashes, and passes `99/99` automatic checks. File and live browser
  matrices pass with `12/12/24` playback counts, exact accepted hard-drop/Studio graph,
  measured post-compressor references, no overflow, 44 px controls, zero browser errors,
  and complete audio/timer disposal.
- Independent UI QA is all-zero. Independent audio QA's initial nonblocking P2 is closed
  by exact zero-pan node routing and OfflineAudioContext measurement; final technical
  disposition is `P0 0 / P1 0 / P2 0 / P3 0`. The remaining `GAP 1` is deliberately the
  player's sound-quality verdict, so this is a listening candidate—not product acceptance
  or integration.

## 2026-08-15 — T37 Bomb R3 rejected and R4A normal-cue contract accepted

- Recorded the player's rejection of all six R3 normal/chain candidates while preserving
  their immutable technical evidence and the accepted Bomb visual plus D1 transition.
  Product audio was not changed, and no R3 bytes, low sweeps, noise bands, or fixed chain
  recipe may be repackaged as R4 work.
- Split recovery into a normal-only R4A human gate, a later docs-first R4B chain gate, and
  only then a possible product-integration slice. R4A owns three neutral procedural choices
  `X/Y/Z`, the current production Renderer at its `220 ms` impact, the complete future
  candidate graph, exact accepted references, bounded loudness/spectrum, and reject-all
  default behavior.
- Independent review accepts exact contract range `8c2b81d..15801d6`: boundary QA is
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`; audio feasibility is `0/0/0/0/1`, with only human sound
  quality intentionally open. Evidence implementation is authorized solely under
  `docs/evidence/t37/bomb-soft-block-audition-r4a/**`; R4B and product source remain closed.

## 2026-08-15 — T37 Bomb R4A rejected and R5A familiar-language contract accepted

- Recorded the player's rejection of R4A X/Y/Z without inventing a more detailed reason.
  R4A range `56a2381..b11b7b5` remains immutable rejected history and never changed product
  audio. Post-verdict QA disclosed its undefined activity measure (`107.896 ms` decoded
  versus `149 ms` scheduled for Y), missing non-idle pagehide/HMR proof, terminal state
  inconsistency, and implicit provenance naming instead of repairing rejected evidence.
- R5A replaces independent Bomb timbre design with three familiar-language normal cues:
  neutral-pan Action hard-drop/lock/move; hard-drop plus a bounded candidate-only Studio-
  derived excerpt; and one exact compact `countdown-knock` layer. Pinned Chromium generates
  post-compressor/pre-output PCM16 stems, and listening/metrics/future accepted integration
  all use those same bytes through only the global gate/output. R2/R3/R4A Bomb structures,
  realistic explosions, chain audio, and product edits remain prohibited.
- Exact recipes, trims, PCM16/Hann/FFT/RMS/activity semantics, lifecycle state cleanup,
  commit/path provenance, and responsive player-review requirements are frozen. Independent
  metric proof places all three stems inside the common peak/RMS/energy/activity/spectrum
  window, including B's final `117 ms` Studio-derived excerpt and `134.6875 ms` last sample.
- Final boundary QA accepts exact range `b11b7b5..8f29bb8` with
  `P0/P1/P2/P3/GAP = 0/0/0/0/0`. This separate checkpoint authorizes one writer only in
  `docs/evidence/t37/bomb-familiar-language-audition-r5a/**`; R5B and product integration
  still require an explicit player-selected normal cue.
