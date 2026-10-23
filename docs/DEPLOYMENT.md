# Cutlass Wake deployment

## Project identity

- Platform: independent Vercel project `4c3/cutlass-wake`.
- Project ID: `prj_l9dE1MXLF5FuSUybTm1hMRM4pkmj` (public identifier, not a credential).
- Configured free project domain: `cutlass-wake.vercel.app`, not yet deployed or accepted. The original random project domain redirects to it with 307.
- Git repository: `Udkam/MyWeb`.
- Production branch: `codex/cutlass-wake`.
- Build root: empty Root Directory field, meaning this branch's repository root.
- Node: 24.x; Vite preset; `npm ci`; `npm run build`; output `dist`.
- Project-level Ignored Build Step, set before connecting Git:

```sh
test "$VERCEL_GIT_COMMIT_REF" != "codex/cutlass-wake"
```

Exit 0 skips other branches; exit 1 builds the intended game branch. This must remain a project-level setting: another MyWeb branch may not contain this game's `vercel.json`. The checked-in file repeats install/build/output settings, while branch tracking and filtering are verified in the Vercel dashboard.

The empty project was initially named `project-bxq7c` by Vercel and then renamed. It is newly created for Cutlass Wake. Existing projects were not reused or modified. Settings and branch were read back on 2026-10-24. A playable deployment and exact deployed source SHA are still pending; project creation is not release acceptance.

## Release gate

The next deployment is a labelled encounter playtest for personal review. It does not authorize chapter expansion or a portal listing. Build, HTTP availability, and automated controls cannot establish visual quality or combat feel. Keep the Goal active until the full authorized scope and user review gates are met.

Before pushing a release, run checks from the lockfile, inspect actual game behavior, exact-stage the phase files, and push normally to the game branch. Verify the deployment's Git SHA, asset hashes, rendered desktop/mobile landscape behavior and control flow. Record evidence in `docs/VERIFICATION.md` when performed. The final full game's successful production verification precedes a separate `personal-web/main` update.

Vercel configuration reference: [Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), [Production branch](https://vercel.com/kb/guide/can-i-use-a-non-default-branch-for-production), [Project configuration](https://vercel.com/docs/project-configuration/vercel-json).
