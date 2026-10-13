# Cinder Below — asset provenance

The game uses original **Ninja Adventure** assets by **Pixel-boy and AAA**, downloaded from the [author's pack page](https://pixel-boy.itch.io/ninja-adventure-asset-pack). The included README explicitly covers all package assets, including commercial games, under **CC0 1.0**. Attribution is appreciated but not required. We preserve the original [license](src/assets/LICENSE-Ninja-Adventure.txt) and [README](src/assets/README-Ninja-Adventure.md).

Source archive: `Ninja Adventure - Asset Pack.zip`, read without modifying the preserved original. Its SHA-256, byte size, every selected original ZIP entry, local alias, image dimension and individual SHA-256 are in [the manifest](src/assets/manifest.json). Selected files are byte-for-byte original. Canvas uses source rectangles, integer scaling, ordinary transforms, and gameplay indicators; no generated or redrawn raster art is included.

The subset contains 31 PNG images, 2 OGG music files, 5 WAV effects and the 2 original license/readme files: **2,742,833 bytes** before the manifest. The full source archive is not part of the public runtime.

| Runtime role | Original asset | Verified frame layout |
|---|---|---|
| Player | `Actor/Character/SorcererBlack/SeparateAnim` | 16×16 cells; columns down, up, left, right. Walk has four temporal rows. Idle/Attack each have one pose per direction, not four-frame animations. Dead is one 16×16 pose. |
| Slime / shooter / charger / caster | `Actor/Monster/Slime`, `Skull`, `BlueBat`, `Eye` | Each original sheet is 64×64: four directions in columns, four temporal frames in rows. |
| Sentinel | `Actor/Boss/GiantFrog` | 40×40 cells: Idle 5, Charge 7, Attack 3, Jump 6, Hit 3. Single facing. |
| Warden | `Actor/Boss/TenguBlue` | Idle: six 68×68; Hit: eight 68×68; Walk: ten 82×82; Attack: fifteen 82×82. Single facing. |
| Crypt | `Backgrounds/Tilesets/Interior/TilesetInteriorFloor.png`, `TilesetWallSimple.png` | Original dark stone region and purple stone border; floor and walls are composed independently. |
| Props | `TilesetDungeon.png`, `TilesetElement.png` | Original props. Dungeon sheet is mainly mechanisms/objects and does not itself contain a full dungeon wall/floor set. |
| Shots / impact | `FX/Projectile`, `FX/Elemental`, `FX/Smoke`, `FX/Attack` | Fireball/Energy: 4×16px; BigEnergy: 4×24px; Explosion: 9×40px; Smoke: 6×32px; CircularSlash: 4×32px. Flame has eight 25×30 frames. |

Audio remains the author's original recordings. `music-fight.ogg` is **17 - Fight** (32 s); `music-dungeon.ogg` is **21 - Dungeon** (60 s). Effects map `shot` to Launch, `dash` to Whoosh, `hit` to Hit1, `death` to Explosion2, `relic` to PowerUp1. Durations/sample rates were verified from the original OGG/PCM headers; listening quality, mixing and loop seam suitability require audition and are not implied by file names. Playback is owned by the app and begins after a user gesture.

Research-only original contact sheets and the 532-page study stay outside this runtime. 0x72 DungeonTileset II was examined as an alternative; no art from that pack or another game's screenshots is included here.
