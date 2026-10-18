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
- Vercel migration target: Git repository `Udkam/MyWeb`, production branch
  `codex/tetramorph`. Platform reconnection and production verification are handled
  separately; the existing website stays available throughout source migration.
- User accepted the ice-blue, 18-degree tilted isometric cube icon. Geometry
  source `993b9942`; typecheck/build, 789 tests, 12 browser scenes and independent QA pass.
- Documentation is organized; historical content is retained, not deleted. Old local
  output, Playwright logs and inactive Serena files are under `.local/archive/`.
- No custom-domain purchase or DNS change is authorized by the current request.

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
