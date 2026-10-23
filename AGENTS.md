# Cutlass Wake

Read `docs/DESIGN.md`, `docs/CURRENT_TASK.md` and the current run state before modifying the game. This is the independent `Udkam/MyWeb` product branch `codex/cutlass-wake`; never merge its code into directory-only main or edit old projects.

UTF-8 for all text. Preserve unrelated files and use exact staging. Raw source packages, generated working images, screenshots and recordings live in ignored `.local`/`.qa`, never in Git. Commit only lawful redistributable runtime assets with source/license/modification records.

The active gate is art: two actual asset boards, then a single-screen real action sample with desktop and landscape phone evidence. User visual review is required before chapter expansion. No full chapters or completion claims while that review is pending.

Use pinned Phaser 3.90 APIs, fixed 60Hz combat time, actor frames and hit windows from the same state clock. Main controls: A/D or arrows, Space, J attack, K guard/parry, Shift dodge, E interact, Esc pause, F fullscreen. Touch must preserve those rules.

Validate with `npm ci`, `npm run check`, `npm test`, `npm run build`, then actual browser input and image inspection. Build success does not establish art/game acceptance. Keep diagnostic hooks restricted to development. Record relevant limitations rather than inventing runtime or mobile-device evidence.

Production is a future independent Vercel project: branch `codex/cutlass-wake`, repository root, npm ci, npm run build, dist, project-level branch filtering. Publish and test the actual target SHA before adding a real URL to the separate personal-web portal. Before any foreseer.site browser navigation intercept `/api/visits*`.
