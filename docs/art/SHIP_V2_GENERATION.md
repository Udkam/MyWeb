# Salt-copper scene source record

2026-10-24. Built-in imagegen; no purchased resources, Blender or old-game art. Original source copies and their hashes are preserved by `scripts/import_ship_layers.py` in ignored `.local/assets/ship-v2`. The measured source/output sizes, alpha crop rectangles and hashes are in `ship-v2-import.json`.

The initial layers were generated against the project's salt-copper discussion concept, but that concept is not a runtime layer. Layer briefs (summaries, not quoted exact prompts):

- Sea: Prussian blue engraved/pixel ocean, aged ivory sky and wave highlights, flat horizon; no characters or foreground platform.
- Sail: one complete transparent ivory sail with copper/worn rope detail, broad calm folds and restrained weathering.
- Decks: isolated side-on hull ledge and raised planked platform with open braces, dark seasoned timber and worn brass fittings.
- Fittings: separate crate, left-facing bronze cannon and tall foreground mast, using the same light/material direction.
- Far ship: separate transparent distant sailing-ship silhouette, deliberately lower contrast than the playable foreground.

The generator did not follow an exact native pixel grid. Each target resolution samples independently from the new high-resolution source. Alpha thresholding, region cropping and target sizing are technical import operations; they are not hand-painted pixel improvements or proof of art acceptance. Prop dimensions follow the explicit collision layout. Actor art has its own uniform-scale/rig audit.

## Quiet combat band revision

Actual scene inspection found cloud highlights and distant mast detail competing with heads and blades. A new version was generated from the sea source; the previous source remains preserved. Final output `exec-6c4f7c77-62cf-4a24-adb8-dbe5f2b1957f.png`, working copy `sea-quiet-source.png`. Exact edit prompt:

> Edit this original Cutlass Wake background layer, preserve its wide 16:9 ocean composition, exact sea horizon height about 61% down, Prussian-blue/aged-ivory salt-copper engraving pixel-art direction and large lower waves. This is an actual side-scrolling game's far background, behind detailed 70px people, not a standalone poster. Specifically REDUCE busy contrast in the middle combat band (about 40%-72% image height): broad quiet muted blue-gray clouds and haze, sparse large color clusters, remove all ships and masts from this layer (a separate ship layer exists), and greatly reduce white sea glitter near the horizon. Retain fine crafted detail only toward upper sky corners and the lower waves, with clear hierarchy. The middle band should be calm enough that ivory steel blades and pale shirted actors read sharply without any glow, outline, fog-effect overlay or blur. Paint that quieter scenery into the illustration itself. No characters, weapons, foreground platforms, sails, UI, text or border. Keep crisp pixel/engraved edges, no smoothing filter. Opaque full background.

The 640/960 renderer uses this quieter sea and a separate subdued ship. No blur, vignette or full-screen combat effect was added to hide actor or environment quality. Raised platform braces extend to the main deck; the physics top remains y207 and collision thickness remains 12 logical pixels. All of these remain playtest candidates pending the user's actual visual and play acceptance.
