# Bounded Commit Policy

Status: authoritative for every task and worker in
`E:\Proj\Active\MyWeb\TetraMorph`, branch `codex/tetramorph` of `Udkam/MyWeb`.
The `legacy` remote preserves the former standalone repository; do not push its
other local work branches or inherited dirty material during repository migration.

This policy prevents a workstream from accumulating an entire rules change, frontend
pass, evidence matrix, and QA history into one opaque commit. It complements
`AGENTS.md`; where a task needs an exception, `docs/CURRENT_TASK.md` must authorize that exact
exception before editing begins.

## 1. One commit, one reviewable claim

Each commit must have one sentence that can be independently reviewed and reverted.
Examples:

- `feat(puzzle): add canonical level progression`
- `fix(input): release soft drop on pointer cancellation`
- `docs(t6): freeze the puzzle completion contract`
- `evidence(t6): record the accepted source candidate`

Avoid subjects such as `complete stage`, `final pass`, `update files`, or `misc fixes`.
Do not claim `accepted`, `complete`, or `release` before independent QA and coordinator
acceptance.

## 2. Default checkpoint budget

A normal source checkpoint changes at most:

- 10 product/test paths;
- 500 hand-authored added or modified lines; and
- one subsystem boundary or one user-visible behavior.

Generated screenshots and machine evidence do not count toward the line budget because
they must be placed in a separate evidence commit. Direct tests for the claim belong
with the source commit.

If a change is truly atomic and must exceed a limit, stop before editing beyond the
limit. `docs/CURRENT_TASK.md` must then name the exception, exact paths, reason it cannot be
split, owners, and required whole-range verification. File-count pressure is never a
reason to commit unrelated concerns together.

## 3. Required checkpoint chain

Use only the checkpoints a slice needs, in this order:

1. **Contract checkpoint** — rules, design, ownership, and acceptance changes only.
2. **Source checkpoint(s)** — one core, runtime, renderer, UI, persistence, or input
   claim plus its direct tests.
3. **Evidence checkpoint** — generated browser artifacts and evidence documents; it
   must record the source checkpoint SHA and may not change product code.
4. **QA checkpoint** — independent QA log/verdict only; it may not repair the candidate.
5. **Coordinator checkpoint** — accepted status, changelog, and integration metadata.

QA reviews the complete contiguous range `base..candidate`, so a multi-commit candidate
is expected. Every source checkpoint must typecheck and pass its targeted tests. Run the
expensive full suite/build/final capture once after the last source edit, as required by
the active task; do not rerun it after evidence-only or log-only commits.

## 4. Mandatory commit triggers

Commit a checkpoint before any of the following:

- starting work in another subsystem;
- changing from core/rules to runtime/render/UI;
- beginning the final browser evidence batch;
- exceeding the default path or line budget;
- handing work to another task or independent QA.

If interrupted, commit only when the current claim is green and internally consistent.
Otherwise stop expanding the dirty set and record `WIP_UNCOMMITTED`, the exact dirty
paths, last green command, and next action in the owner log. Do not hide broken work in a
large checkpoint commit.

## 5. Staging and pre-commit proof

Every commit uses explicit path staging:

```text
git add -- <exact-path-1> <exact-path-2> ...
git diff --cached --name-only
git diff --cached --check
git status --short
```

The cached path list must exactly match the checkpoint declaration. The following are
forbidden:

- `git add .`
- `git add -A`
- wildcard staging
- staging inherited or user-owned dirty paths
- committing `node_modules`, `dist`, coverage, browser profiles, temporary captures, or
  unrelated workstream logs

## 6. Ownership, QA, and push

- A writer may create its bounded local checkpoint commits but must not push them.
- The writer reports base SHA, ordered commit SHAs, exact paths per commit, tests, and
  remaining dirty paths.
- Independent QA reviews the exact range and creates only its own verdict/log commit.
- Only the coordinator pushes an accepted chain. No force-push, history rewrite, or
  squash may erase the reviewable checkpoints.

## 7. Tetris adoption state

At policy adoption on 2026-07-17, branch `codex/tetris-recovery` is based at `e552b3c`.
The observed inherited dirty paths are `docs/CURRENT_TASK.md` and `docs/DESIGN.md`.

Before the next source edit, their owner must either place each path in an explicit docs
checkpoint with a single contract claim or leave it untouched and report it as inherited
dirty state. Neither may be bundled into a source or evidence commit merely to make the
worktree appear clean.
