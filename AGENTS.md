# TetraMorph Working Agreement

## Coordinator and workstream boundary

- The primary Codex task is the coordinator. It owns scope, sequencing, integration,
  `docs/logs/CHANGELOG.md`, final browser review, and push. A writer may create only the
  bounded local checkpoint commits authorized by `docs/COMMIT_POLICY.md`.
- This branch is the standalone falling-block game at `E:\Proj\Active\MyWeb\TetraMorph`.
- Source is `https://github.com/Udkam/MyWeb/tree/codex/tetramorph`; `origin` targets
  `Udkam/MyWeb`, and `legacy` preserves `https://github.com/Udkam/TetraMorph.git`.
- Temple Run and Patrick's Parabox are separate repositories. Never copy their source,
  evidence, screenshots, generated assets, workstream registers, or Git metadata here.
- The active development branch is `codex/tetramorph`. It preserves the complete
  accepted `main` history through `96057f1b` without rewriting shared history.
- Other websites use separate branches in `Udkam/MyWeb`; do not merge their product
  trees, push all local branches, or stage inherited user-owned work.
- Each implementation slice has one writer. Independent QA is read-only until the
  implementation owner produces a candidate SHA or explicitly requests an audit.
- A design or QA task may not self-authorize production edits. Only the coordinator's
  current bounded instruction opens an implementation slice.

## Durable feedback

- Each writer records its task ID, base SHA, exact changed paths, commands actually run,
  evidence, blocker, and one next action in its Tetris workstream log.
- The coordinator acknowledges a candidate only after reading both the task report and
  the corresponding log. Missing UI callbacks are never treated as delivery evidence.
- `BLOCKED` means stop. Do not retry a consumed browser batch or broaden the path scope
  without a new bounded coordinator instruction.

## Required execution order for every slice

1. Read `AGENTS.md`, `docs/DESIGN.md`, `docs/CURRENT_TASK.md`, and the latest changelog entry.
2. Update `docs/DESIGN.md` and `docs/CURRENT_TASK.md` before code when behavior, visual direction,
   ownership, or acceptance criteria changed. Never label unverified work complete.
3. Implement only the named branch slice and exact product boundary.
4. Use targeted tests while editing. Do not repeat full suites for reassurance.
5. After the last source change, run one final typecheck, one full test suite, one build,
   and one browser-evidence pass when the slice is visual or interactive.
6. Produce a candidate SHA and exact path/evidence summary for independent QA.
7. The coordinator resolves QA findings, updates `docs/logs/CHANGELOG.md`, commits any
   final documentation delta, pushes the branch, and reports acceptance.

If two workers would edit the same path, the later worker must stop and report the
collision instead of merging or overwriting the other worker's dirty state.

## Bounded commit discipline

- `docs/COMMIT_POLICY.md` is authoritative for commit size, checkpoint order, staging,
  candidate ranges, and push ownership.
- A candidate is normally a short linear range of reviewable commits, not one giant
  commit made after core, frontend, screenshots, evidence, and logs have accumulated.
- Commit the first green, reviewable claim before editing the next subsystem or concern.
- Never combine product source, generated browser evidence, and independent QA
  disposition in one commit.
- Never use `git add .`, `git add -A`, wildcard staging, or a commit command that captures
  paths outside the declared checkpoint. Stage exact paths and inspect the cached path
  list before every commit.
- At adoption, the existing uncommitted `docs/CURRENT_TASK.md` and `docs/DESIGN.md` are inherited
  documentation paths. They must be assigned to bounded docs checkpoints or left
  untouched; they cannot be silently bundled with the next gameplay/frontend commit.

## Product boundary

- This repository contains clean-room studies of game mechanics.
- Do not copy commercial logos, music, fonts, sprites, level layouts, text, or trade dress.
- The page-facing title is the plain-text word `TetraMorph` by the player's later
  direct instruction. Historical `Tetris` / `Tetra` references may remain only as
  provenance in archived contracts and tests.
  Do not imitate a commercial logo, multicolor wordmark, proprietary font, interface,
  level layout, or trade dress; the surrounding visual system remains original.
- Core simulation is deterministic and renderer-independent. PixiJS, React, DOM, audio, storage, and browser timing must not enter `src/game/core`.
- React owns page composition and lifecycle. PixiJS owns the board, pieces, particles, and frame rendering. Do not create a DOM cell grid.

## Quality gates

Every implementation slice must preserve:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- exactly one gameplay canvas
- zero browser console errors
- keyboard and touch-safe controls
- `prefers-reduced-motion` support
- deterministic seeded replay tests
- no listener, ticker, audio, or canvas leaks after restart/unmount

Do not accept a nonblank screenshot as visual proof. Browser evidence must verify the
board geometry, visible state, controls, responsive layout, and canonical values claimed
by the report. Evidence files must come from the final candidate, not fabricated state.

## Encoding and file editing

- Use UTF-8 for all source and documentation.
- Prefer `apply_patch` for edits.
- Python scripts that read or write text must specify `encoding="utf-8"`.
- Do not rewrite Chinese-facing files through an implicit Windows PowerShell encoding.

## Git and destructive actions

- Keep changes on the current game branch.
- Do not force-push or rewrite shared history.
- Ordinary verified edits, installs, tests, builds, commits, and pushes do not require confirmation.
- Ask before recursive or wildcard deletion, `git clean`, `git reset --hard`, or deleting sensitive files. Small explicit temporary build artifacts may be removed after their exact path is verified.
