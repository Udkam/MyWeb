# Current status — TetraMorph

Updated 2026-10-18. This is the sole current task entrypoint; archived instructions
and old BLOCKED/ACTIVE labels do not authorize restarting work.

## Current delivery

- Website: https://tetramorph.vercel.app/ . Keep the existing Vercel project and domain.
- Source: https://github.com/Udkam/MyWeb/tree/codex/tetramorph . Local branch is
  `codex/tetramorph`; `origin` is `Udkam/MyWeb`, while `legacy` retains `Udkam/TetraMorph`.
- Canonical local source: `E:\Proj\Active\MyWeb\TetraMorph`. The complete accepted
  1,908-commit history through `96057f1b` is preserved. Other websites occupy separate
  branches; their product trees are not merged into this game.
- Vercel project `tetramorph` is connected to `Udkam/MyWeb`, with production branch
  `codex/tetramorph`. Migration commit `ac7afcea` is Ready/current; the public homepage,
  `/play` and `/endgames` return 200, with Classic and Endgame verified in the UI.
- Vercel uses the existing Node 24/Vite/root/`dist` configuration. Its custom Ignored
  Build Step is `test "$VERCEL_GIT_COMMIT_REF" != "codex/tetramorph"`; exit 0 skips
  other branches and exit 1 builds this branch.
- The former `Udkam/TetraMorph` repository is archived read-only and retained as
  `legacy`; no history or inherited local material was deleted.
- User accepted the ice-blue, 18-degree tilted isometric cube icon. Geometry
  source `993b9942`; typecheck/build, 789 tests, 12 browser scenes and independent QA pass.
- Documentation is organized; historical content is retained, not deleted. Old local
  output, Playwright logs and inactive Serena files are under `.local/archive/`.
- No custom-domain purchase or DNS change is authorized by the current request.

## Authorized security maintenance — 2026-10-18

- Coordinator-authorized slice `myweb-security-alerts-20261018`, base
  `08c077ba13f0cd8a1728d52e0ca87012ed635fb7`; one writer, no gameplay changes.
- Exact implementation scope: only `package-lock.json` may move the existing
  `source-map-js` transitive lock from 1.2.1 to the advisory-fixed 1.2.2. Preserve
  the existing high-severity audit gate and all direct dependency ranges.
- GitHub secret-scanning alert 1 remains open with validity unknown. The reported
  historical HTML blob differs from HEAD; the current file has zero standard or
  encoded `sk.` prefixes. Do not alter it speculatively or read/export the old value.
  No credential revocation, rotation, alert resolution or history rewriting is authorized.
- Contract paths: this file and `docs/DESIGN.md`. Final verification facts belong in
  `docs/logs/CHANGELOG.md`. The 13 inherited modified/untracked files must retain
  their pre-slice SHA-256 hashes and remain unstaged.
- Required gates: focused source-map rejection/control, clean-lock installation,
  `npm audit --audit-level=high --registry=https://registry.npmjs.org`, typecheck,
  full test suite, production build and existing 12-scene release smoke. Inspect
  independent read-only review, current branch CI and Vercel status before reporting.
- Separate contract, dependency and final verification checkpoints; the coordinator
  explicitly authorizes this worker to push only this accepted linear chain.
- Source candidate `8034ff9c` locks source-map-js to 1.2.2. Clean `npm ci`, audit
  (zero vulnerabilities), typecheck, 789 tests (17 pre-existing optional skips),
  production build and all 12 release-smoke scenes pass with zero browser errors.
  A normal map resolves correctly; six malformed/oversized/nested offset classes
  are rejected. Independent read-only candidate review found no actionable issue.
- The current archived HTML is unchanged: zero standard/encoded secret-token
  candidates, current blob `c7f492a6` differs from alert commit blob `826d4505`.
  The historical alert remains open, validity unknown; no revocation is implied.
- All 13 inherited file hashes are unchanged and remain unstaged. Remote CI and
  deployment are verified separately in the task report, not inferred from local gates.

## Preserved boundaries

- T37 exact proof searches remain explicitly deferred. Keep only verified certificates.
- User selected the icon and directed release; do not infer renewed audio acceptance.
- Inherited T27 evidence, T27 follow-up directory and root `progress.md` are uncommitted
  user-owned material. Do not stage, move or delete them as part of housekeeping.
- Preserve `docs/workstreams/**/fixtures`, existing evidence paths and their consumers.
- Follow [commit policy](COMMIT_POLICY.md) and [design contract](DESIGN.md).

## Navigation

- [Documentation index](README.md)
- [Current release / deployment](release/README.md)
- [Publication record](agent-runs/t39-publication/STATE.md)
- [Independent QA](agent-runs/t39-publication/QA.md)
- [Previous accumulated task record](archive/2026-09-22/CURRENT_TASK.md)

Repository migration changes documentation and Git metadata only. Preserve the
inherited T27/progress files byte-for-byte and keep them unstaged. Release gates for
future gameplay changes remain unchanged; source movement does not authorize new
features, broad cleanup, or deletion of the previous GitHub repository.
