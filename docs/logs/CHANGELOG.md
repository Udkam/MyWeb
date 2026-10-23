# Changelog

## 2026-10-24 · Salt-copper encounter playtest

- Replace the action-study runtime with layered ship art and a unified 70/105px character set: 38 hero, 20 sword and 12 musket body poses, plus fixed weapon rigs and original-hand occlusion. Keep actual source dimensions, hashes, aliases and remaining animation limitations explicit.
- Share frame phase, measured blade/palm geometry and the fixed downward musket barrel with combat. Add persistent guard pressure, legal parry starts, target-bound contextual E, two cuts, hit-confirm cancels and readable enemy spacing/guarded retreat. Reproduce and fix the close-body infinite sword-whiff case without invisible reach or invulnerability.
- Keep 640/960 at the same on-screen composition; preserve 16:9 in small windows. Add result-only death falling and expiring visual effects without resuming combat. Add a separately licensed cannon firing sample.
- Preserve independent MyWeb checkout and branch boundaries. Configure the new Vercel project with the game production branch and a project-level filter before connecting Git. No other project was reused and no personal-web entry was added.
- Validation and explicit limits are recorded in `docs/VERIFICATION.md`. A passing build/model, generated art or configured URL is not human art/playtest approval; no chapters were expanded.

## 2026-10-24 · Design research and local workspace organization

- Add `docs/DESIGN-REFINEMENT-2026-10-24.md`: primary-source research, maritime art direction, proposed combat decision rules, enemy/Boss relationships and a playable-sample acceptance plan. Proposals are not runtime implementation or visual acceptance.
- Move prior candidate/production documents into `docs/design-history`. Keep local container evidence and the original container index in ignored `.local/myweb-maintenance`; MyWeb top level now contains product workspaces plus the previously blocked `_pending-delete` exception.
- Move paused Wild Circuit to the sibling `wild-circuit` workspace with its original Git and working files preserved. Update affected document paths; active Cutlass runtime/assets are untouched by this research and organization work.
- Save one generated discussion concept and its full prompt in ignored `.local/art-direction-2026-10-24`; the image is not gameplay evidence or an animation-ready asset.
- Final filesystem read-back shows only TetraMorph, cinder-below, spritelab and cutlass-wake at MyWeb top level. The user confirmed manually deleting the retired residuals and Wild Circuit after the preservation move; this agent did not execute their removal.
- Validate UTF-8, document links, preserved move contents and Git identities. No game tests/build/deployment were run for these document and directory changes; prior prototype concerns remain static findings to reproduce against the current implementation.

## 2026-10-24 · Stage A resources and art comparison

- Start Cutlass Wake as an independent product branch from the MyWeb directory baseline.
- Record production requirements, approval gate, exact Git boundaries and source inspection workflow.
- Download and actually inspect Treasure Hunters, SeaHook Basic and hippo Pirate; preserve official licenses, source hashes, real body dimensions, Aseprite timings and coverage gaps.
- Compose two equivalent harbor asset boards, with native-size character strips. The small official pack is retained as comparison; original 57px/56px/57px human actors and matching harbor/props are imported as the action-study candidate.
- Segment complete figures, review pivots and preserve over-grid blade pixels. Record unresolved weapon consistency, palette, reload and missing continuous animations.
- Add six distinct CC0 sound candidates and file-level attribution/modification records. No purchase, art approval, chapter expansion or release yet.
