# TetraMorph — Current design contract

This document defines current product boundaries. Older proposals and rejected
iterations live in [the historical design record](archive/2026-09-22/DESIGN.md).

## Identity and visual direction

- Public name: plain-text TetraMorph; original visual system, no commercial trade dress.
- Accepted site icon: ice-blue isometric cube, tilted 18 degrees, one lowest vertex;
  bright top, cobalt side, dark side, thin cold-white ridges. Dark Apple background;
  transparent SVG and 16/32/64 PNG favicons. Shared deterministic generator geometry.
- Single gameplay canvas: React owns composition/lifecycle; PixiJS owns board rendering.
- Mutation items use frost, ceramic, satin gold and amethyst materials with causal,
  restrained activation cues. Bomb uses synthetic damped block fracture, not realistic
  explosive noise. Respect reduced-motion settings and keyboard/touch controls.

## Product scope

- Classic: five fixed speed presets. Survival: atomic pressure/relief settlement.
- Mutation: freeze, supergravity, Bomb, multiplier. Endgame: 46 levels in 5/25/16 groups,
  undo, mastery progression and three verified optimal certificates.
- Deferred exact-proof work is outside release scope; never manufacture certificates.
- Core is deterministic and renderer-independent. No React, DOM, audio, storage or
  browser clock inside `src/game/core`.
- Browser-local settings/progress; no account/cloud-sync promise. Preserve unreadable
  or future-version stored data and disclose storage failures.

## Security maintenance boundary

Dependency maintenance preserves gameplay, rendering, authored evidence and saved
progress. Build tools must reject malformed indexed source-map section offsets
without unbounded work; normal source maps and the existing production build must
remain usable. Security gates retain the current high-severity failure threshold.
Historical third-party evidence is not product code: an alert against an older
blob does not prove that the current archived response still contains a secret.
Credential ownership, effective revocation and historical cleanup are separate
from a dependency fix and may not be inferred from a successful build.

## Verification and publication

Typecheck, full test suite, production build, source-bound browser evidence and
independent QA precede publication. A screenshot alone is not gameplay proof.
Check exactly one canvas, zero errors, input, responsive layout and lifecycle cleanup.
Maintain deterministic replay coverage and bounded audio/presentation behavior.

The existing Vercel `tetramorph` project is connected to `Udkam/MyWeb`, production
branch `codex/tetramorph`, with the original public domain. Its Ignored Build Step
skips other branches so other website trees do not trigger a TetraMorph build.
Vercel publishes only `dist/`. Game routes use SPA rewrites; missing static
assets must remain 404. No private work logs or development evidence in production.
Subjective player acceptance must be distinguished from automated tests.

See [release guidance](release/README.md), [project structure](PROJECT_STRUCTURE.md)
and [commit policy](COMMIT_POLICY.md) for execution details.
