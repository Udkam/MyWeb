# Cutlass Wake deployment

## Project identity

- Platform: independent Vercel project `4c3/cutlass-wake`.
- Project ID: `prj_l9dE1MXLF5FuSUybTm1hMRM4pkmj` (public identifier, not a credential).
- Live free project domain: https://cutlass-wake.vercel.app/ (encounter review candidate, not the completed adventure). The original random project domain redirects to it with 307.
- Git repository: `Udkam/MyWeb`.
- Production branch: `codex/cutlass-wake`.
- Build root: empty Root Directory field, meaning this branch's repository root.
- Node: 24.x; Vite preset; `npm ci`; `npm run build`; output `dist`.
- Project-level Ignored Build Step, set before connecting Git:

```sh
test "$VERCEL_GIT_COMMIT_REF" != "codex/cutlass-wake"
```

Exit 0 skips other branches; exit 1 builds the intended game branch. This must remain a project-level setting: another MyWeb branch may not contain this game's `vercel.json`. The checked-in file repeats install/build/output settings, while branch tracking and filtering are verified in the Vercel dashboard.

The empty project was initially named `project-bxq7c` by Vercel and then renamed. It is newly created for Cutlass Wake. Existing projects were not reused or modified. Settings and branch were read back on 2026-10-24.

## First verified playtest deployment — 2026-10-24

- Runtime source commit: `ca3de6126611da29b776c589ee3d6da7603f6dcb`.
- Deployment: `dpl_48CV3HXRLQHHqjYwfjcWm4peu5UA`; [Vercel record](https://vercel.com/4c3/cutlass-wake/48CV3HXRLQHHqjYwfjcWm4peu5UA).
- Immutable deployment address: https://cutlass-wake-9ee6a7hfv-4c3.vercel.app/.
- Vercel UI explicitly showed Ready, Production / Current, the exact GitHub commit and a 13-second build. Screenshot: ignored `.qa/playtest/vercel-production-ready-ca3de61.png`.
- All 47 `dist` files returned byte-identical SHA-256 from the stable domain. Report: ignored `.qa/playtest/production-ca3de61-bytes.json`. The source SHA was checked independently in Vercel, not inferred from HTTP.
- Production browser checks: 9/9 phone-emulation UI/control checks and an uninterrupted ordinary-input death/restart/run/jump recording; no page or console errors. See [verification](VERIFICATION.md) for actual scope and limitations.

Subsequent Markdown-only release-documentation commits may create Vercel deployments with different Git SHAs while preserving this runtime payload; verify the current deployment source and served payload before reporting them. Keep the initial immutable deployment and acceptance evidence as the reproducible runtime baseline.

## Release gate

The deployed encounter playtest is for personal review. It does not authorize chapter expansion or a portal listing. Build, HTTP availability, and automated controls cannot establish visual quality or combat feel. Keep the Goal active until the full authorized scope and user review gates are met.

Before pushing a release, run checks from the lockfile, inspect actual game behavior, exact-stage the phase files, and push normally to the game branch. Verify the deployment's Git SHA, asset hashes, rendered desktop/mobile landscape behavior and control flow. Record evidence in `docs/VERIFICATION.md` when performed. The final full game's successful production verification precedes a separate `personal-web/main` update.

Vercel configuration reference: [Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), [Production branch](https://vercel.com/kb/guide/can-i-use-a-non-default-branch-for-production), [Project configuration](https://vercel.com/docs/project-configuration/vercel-json).
