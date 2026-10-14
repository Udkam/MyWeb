# Cinder Below — asset provenance

The game uses original **Ninja Adventure** artwork and sound effects by **Pixel-boy and AAA**, downloaded from the [author's pack page](https://pixel-boy.itch.io/ninja-adventure-asset-pack). The included README explicitly covers package assets, including commercial games, under **CC0 1.0**. We preserve the original [license](src/assets/LICENSE-Ninja-Adventure.txt) and [README](src/assets/README-Ninja-Adventure.md). Music is existing CC0 work by **Juhani Junkala / SubspaceAudio**, documented separately below.

Source archive: `Ninja Adventure - Asset Pack.zip`, read without modifying the preserved original. Its SHA-256, byte size, selected original ZIP entries, local aliases, image dimensions and individual SHA-256 are in [the manifest](src/assets/manifest.json). Selected Ninja Adventure files are byte-for-byte original. Canvas uses source rectangles, integer scaling, ordinary transforms, and gameplay indicators; no generated or redrawn raster art is included.

The subset contains **95 PNG images, 4 OGG music files, 5 WAV effects and 2 original license/readme files: 11,058,395 bytes** before manifests. Original source archives and licensing-page snapshots remain in local acceptance evidence and are excluded from the public runtime.

| Runtime role | Original asset | Verified frame layout |
|---|---|---|
| Player | `Actor/Character/SorcererBlack/SeparateAnim` | 16×16 cells; columns down, up, left, right. Walk has four temporal rows. Idle/Attack each have one pose per direction, not four-frame animations. Dead is one 16×16 pose. |
| Slime / shooter / charger / caster | `Actor/Monster/Slime`, `Skull`, `BlueBat`, `Eye` | Each original sheet is 64×64: four directions in columns, four temporal frames in rows. |
| Sentinel | `Actor/Boss/GiantFrog` | 40×40 cells: Idle 5, Charge 7, Attack 3, Jump 6, Hit 3. Single facing. |
| Warden | `Actor/Boss/TenguBlue` | Idle: six 68×68; Hit: eight 68×68; Walk: ten 82×82; Attack: fifteen 82×82. Single facing. |
| Crypt | `Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png`, `TilesetWallSimple.png` | Original dark stone region and purple stone border; floor and walls are composed independently. |
| Props | `TilesetDungeon.png`, `TilesetElement.png` | Original props. Dungeon sheet is mainly mechanisms/objects and does not itself contain a full dungeon wall/floor set. |
| Shots / impact | `FX/Projectile`, `FX/Elemental`, `FX/Smoke`, `FX/Attack` | Fireball/Energy: 4×16px; BigEnergy: 4×24px; Explosion: 9×40px; Smoke: 6×32px; CircularSlash: 4×32px. Flame has eight 25×30 frames. |

Original Ninja Adventure effects map `shot` to Launch, `dash` to Whoosh, `hit` to Hit1, `death` to Explosion2, `relic` to PowerUp1. Playback is owned by the app and begins after a user gesture.

## Existing dark fantasy music

All four tracks are composed by **Juhani Junkala / SubspaceAudio** and released under CC0. Author-page evidence, the original pack INFO, original ZIP/WAV, exact download URLs, hashes and conversion details are retained in `.qa/atmosphere/music-source`; the shipped [music manifest](src/assets/music-manifest.json) and [selection notes](MUSIC-DIRECTION.md) record provenance.

| Recording | Scene | Author release |
|---|---|---|
| Catacombs | Hollow and mire | [JRPG Pack 3 — Evil](https://opengameart.org/content/jrpg-pack-3-evil) |
| Ancient Evil Awakens! | Cinder and storm | [JRPG Pack 3 — Evil](https://opengameart.org/content/jrpg-pack-3-evil) |
| Whispers From Beyond | Title, void and rift | [JRPG Pack 3 — Evil](https://opengameart.org/content/jrpg-pack-3-evil) |
| Epic Boss Battle | All bosses | [Boss Battle Music](https://opengameart.org/content/boss-battle-music) |

The first three OGG files retain exact original bytes. Epic Boss Battle is converted from the original WAV to Vorbis q5 with 3 ms edge fades to reduce loop clicks; no composition, synthesis, pitch/tempo change or arrangement is performed. Encoding introduces 2.903 ms of padding, documented in the music manifest. Playback gains normalize the ordinary tracks near -22 LUFS and Boss near -19 LUFS before the shared master gain. Technical decoding, loop-boundary playback and transition checks are verified; these measurements are not a subjective listening acceptance.

Research-only original contact sheets and the 532-page study stay outside this runtime. 0x72 DungeonTileset II was examined as an alternative; no art from that pack or another game's screenshots is included here.

## Expanded campaign subset

The campaign uses 20 distinct ordinary monster sheets (tiny Larva2 children excluded) and ten dedicated Boss families: GiantFrog, GiantBamboo, SquidGreen, GiantSlime, TenguBlue, GiantFlam, GiantBlueSamurai, DemonCyclop, GiantRacoonGold and GiantSpirit. The manifest records every source entry and all ten animation families, including rectangular 96×48 Samurai idle/walk/hit cells. No enemy is counted twice through a renamed copy. Some families have no dedicated attack strip; gameplay windups use existing original energy effects.

The five campaign biomes and purple rift use original interior/outdoor floor, nature, water, debris and FX crops. Four additional unmodified atlases (Relief, Pipes, VillageAbandoned and Field) supply cliff walls, furnace details, ruined columns and muddy ground. Palette/lighting adjustments happen in Canvas. Old runtime music has been replaced and removed; the original Ninja Adventure archive and previous published Git revisions preserve its provenance.
