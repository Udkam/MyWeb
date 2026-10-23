# Cutlass Wake · Encounter playtest verification

This is a review candidate, not the completed three-chapter adventure. The user accepted the salt-copper direction but has not accepted the actual art or combat. The Goal stays active. No portal entry is authorized at this stage.

## Current automated checks

- `npm ci`, `npm run check`, `npm test`, `npm run build`: passed in sequence after the body/weapon contact integration. The build emits Vite's size advisory for the Phaser-containing 1.29MB minified JS chunk (359KB gzip); it is not a failed check. Development hook names are absent from the production JS.
- 61 tests: 47 model rules, 3 fixed-clock cases, 9 contact/manifest cases and 2 defeated-hero presentation cases. They cover blocking pressure and legal parry starts, actual blade/palm contact, bound E intent, hit-confirm cancel versus whiff recovery, readable enemy retreat, dodge body height, terrain/body/projectile ordering, restart and frozen-battle death landing.
- Render cadence replay at 30/60/120/144 Hz produces identical model outcomes for the same timestamped input. This is not a measured device frame-rate claim.
- 19 browser control/layout checks passed with no page errors. Keyboard and actual CDP multitouch, touch cancellation, rotation pause, explicit resume, settings, language, effects and640/960 layout were exercised.500×300 retains16:9; desktop and simulated phone have no scrollbars. The final two normal-RAF regressions reproduce pointer toolbar focus loss: language/mute clicks now return focus to gameplay, D moves and Space jumps without activating the button again. Keyboard Tab activation retains its focus semantics.
- Asset contact data is generated from manifest SHA256 `10a43fef7f0a1950e5f4fceb1635b6c51a7f620047eb0ded98684ece818b2360`. Runtime sprites and physical weapons use the same phase sampler. Static import and geometric tests do not prove that the animation looks convincing.

Before staging, JSON generation was made explicitly UTF-8/LF so Windows checkout hashes and Vercel's Linux Git checkout bytes agree. Earlier local recordings used the semantically identical CRLF manifest with SHA`9aa70ebedb3b4289937251d7d42e3710c24b79e7269e5f3e41fc94b11084d4b9`; no sprite, timing or contact coordinate changed. Tests passed again and the production JS content hash remained unchanged.

Evidence: ignored `.qa/playtest/toolbar-fixed-controls/controls.json`, `.qa/playtest/final-rig`, `.local/art/actor-v2`; source audits and the animation matrix are tracked.

## Routes and real-time evidence

Two model routes use only ordinary input from the unchanged starting state. Remote-first completes in 9.05 simulated seconds with 4HP; cannon-first in 11.35 seconds with 2HP. Their source policies and export tool are in `scripts/playtest-route-policy.ts` and `scripts/export_playtest_routes.ts`. Neither uses a minimum-duration gate or HP inflation. These expert input paths do not establish the desired 45–90-second first-player experience.

The first real-RAF playback of the exported fixed cannon timeline did not reach the result screen. It remains recorded as a failed attempt in `.qa/playtest/realtime-cannon-first`; a passing model route is not being substituted for browser acceptance.

Two adaptive browser routes subsequently reached the actual complete screen. The driver only reads current game diagnostics and sends ordinary keyboard/CDP touch events; it never advances time or mutates game state. These recordings preceded the final toolbar focus/text-only fix; combat and assets remained unchanged.

| Browser route | Actual playing wall time | Model time / HP | Observed events |
| --- | --- | --- | --- |
| Desktop cannon-first |11.510763s|11.483333s /2HP|parry, shove, cannon, reloadInterrupt, complete|
|844×390 DPR3 touch, remote-first|9.708162s|9.666667s /5HP|reloadInterrupt, parry, complete|

Both runs have zero page/console/request errors, remain visible and focused, and have no scroll. The phone run includes5 jumps with the movement finger retained and6 simultaneous multi-finger presses. Evidence is `.qa/playtest/adaptive-cannon-first-desktop-20261024-a` and `adaptive-remote-first-touch-20261024-b`, summarized by `adaptive-summary.json`. Original WebM and full MP4 are retained without cuts. The earlier phone-a route tried jumping over a taller same-level enemy and failed; only the input strategy changed to use dodge before retrying. It remains marked failed.

Normal-RAF death/restart passed in `.qa/playtest/death-restart-jump-normal-raf`: after ordinary movement/jump and held defense, death was observed at 12.358 wall seconds; the visible primary button restarted at approximately13.16 seconds, followed by two seconds of movement and a jump. The continuous video lasts17.80 seconds including loading, while the action timeline is15.841 seconds. The earlier attempt that stayed behind the crate never died and remains marked failed. No model writes or advanceTime calls were used.

The same paused browser pose was captured at640 and960 with decorative effects disabled, for desktop and phone emulation (`.qa/playtest/display-comparison-frozen`). Original UI captures are retained. Separate art-only comparison captures temporarily hide UI via test CSS; those images must not be presented as normal gameplay UI.

The real-time recorder starts at the visible title, uses ordinary keyboard or touchscreen events, and records wall clock, UI, browser failures and video. It never advances the simulation or changes game state. A video includes loading/title/result time and must not be described as the player's completion time. Playwright video does not capture system audio.

## Audio, persistence and unverified scope

Seven distinct CC0 samples have source/output SHA and decode measurements. Actual browser playback events have been smoke-tested; this does not constitute human listening or mixed audio acceptance. There is no music or complete audio mix yet.

Language, mute, effects and display preferences persist locally. Adventure progress saves, chapters, six enemy roles, two Boss phase structures, narrative ending and the final portal import are outside this gated slice and have not been accepted or tested.

Phone evidence is Chromium touch/viewport emulation, not a physical phone. The requested independent five-person test, first-player duration, subjective input feel and visual approval have not occurred. Production byte verification, HTTP success and a clean build cannot close those gates.

## Release record

Independent Vercel project, production branch and project-level branch filtering are configured as documented in [DEPLOYMENT.md](DEPLOYMENT.md). Exact release SHA, served-byte comparison and production browser results are pending the first deployment.

## Maintenance

Use the lockfile and run `npm ci`, `npm run check`, `npm test`, `npm run build`. Regenerate actor metadata only through `scripts/import_actor_v2.py`, inspect the actual boards, then rerun contact tests and real-time routes. `scripts/build_asset_manifest.py` refreshes every runtime SHA and counts unique frame IDs rather than aliases.

Keep original generated sources in the existing ignored `.local/assets` backup. A fresh Git clone can build the game from committed runtime assets, but cannot regenerate an absent original source; never silently substitute a different generation. Preserve acceptance videos and their JSON in `.qa`, not public Git. After deployment, `scripts/verify_release.py` compares `dist` bytes with the real URL; verify its supplied source SHA separately in the Vercel deployment UI.
