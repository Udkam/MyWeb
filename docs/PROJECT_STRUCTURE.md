# Project file map

Start with [the documentation index](README.md). Current contracts are short;
superseded accumulated records live under `docs/archive/2026-09-22/`.

The canonical local root is `E:\Proj\Active\MyWeb\TetraMorph`; its independent
code tree lives on `Udkam/MyWeb` branch `codex/tetramorph`. Other websites have
separate branches and must not be copied into this tree.

This repository separates product code, durable records, reusable tooling, and local
generated material. New files should follow this map instead of accumulating at the
repository root.

| Location | Purpose | Versioned |
| --- | --- | --- |
| `src/` | React composition, UI state, and the deterministic game implementation. | Yes |
| `src/game/core/` | Renderer-independent rules, seeded state, Puzzle definitions, and direct tests. | Yes |
| `src/game/{audio,input,render,runtime}/` | Browser-facing subsystems around the Core. | Yes |
| `src/ui/` | Small presentation components shared by application screens. | Yes |
| `docs/` | Active contracts, design direction, changelog, formal QA, screenshots, and workstream records. | Yes |
| `scripts/` | Reusable evidence-capture and QA automation. | Yes |
| `tools/` | Standalone authoring and solver utilities. | Yes |
| `Solutions/` | Local Puzzle walkthrough Markdown and per-lock images; regenerated from current routes. | No |
| `.local/browser/` | New local browser-client capture output. | No |
| `.local/` | Local QA workspaces, archived audits, scratch harnesses, and logs. | No |
| `dist/`, `coverage/`, `.vite/`, `.playwright-mcp/`, `node_modules/` | Build, test, and dependency products. | No |

## Root rules

Keep the root limited to project configuration (`package*.json`, TypeScript/Vite
configuration, `.gitignore`), entry files, `README.md`, and the four primary folders
above. Do not leave screenshots, diagnostic logs, generated walkthroughs, or temporary
scripts at the root.

## Local artifact routing

- Put ad hoc screenshots and captured browser states in `.local/audits/<topic>/`.
- Put local diagnostic logs in `.local/logs/`.
- Route new browser-client output to `.local/browser/<run-name>/` explicitly.
- Old root `output/`, `.playwright-mcp/` and disabled `.serena/` material is retained
  under `.local/archive/` when not in use; do not reactivate old tooling.
- Keep the player-readable Puzzle routes below `Solutions/Solution-<n>.md` and their
  adjacent image directory. These files stay ignored and must never be staged.
- Put new durable evidence in `docs/evidence/<task>/` and its QA disposition in
  `docs/agent-runs/<task>/QA.md`. Old `docs/qa/` and `docs/screenshots/` stay compatible.

The historical root captures are retained under `.local/audits/legacy-root/` so they
remain available without obscuring the project entry points.
