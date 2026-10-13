# Cinder Below

A full-viewport browser action roguelite: eight chambers, two bosses, twelve stacking relics and three distinct starting weapons. Start immediately, dodge readable attacks, choose a build and take Hunt or Refuge gates between rooms.

**Public site:** https://foreseer-focus-desk.fresh-ape-5596.chatgpt.site

**Canonical editable source:** `E:\Proj\Active\MyWeb\cinder-below`

The existing public ChatGPT Sites project and stable URL are retained. The old Focus Desk / Mosslight Post URL slug is not the game's title. This game replaces Mosslight Post; its complete earlier source remains in Git at `fb20b88e4e7c564eb9912d390c69678d52bdd5af`.

## Play

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse + hold left button | Aim and fire |
| Arrow keys | Keyboard-only aim and fire |
| Space / right mouse / Shift | Dash |
| E | Charged nova: damage and clear nearby hostile shots |
| 1 / 2 / 3 | Select a relic |
| Escape / P | Pause |
| F | Toggle browser fullscreen |
| M | Toggle audio |

Phones have two independent sticks and separate Dash / Nova buttons. The game fills the browser viewport even where the Fullscreen API is unavailable. Portrait and landscape are supported; small screens can use landscape for more horizontal aiming space.

Room one introduces the controls in a single wave. Other normal rooms have two waves with spawn warnings. Bosses occupy rooms four and eight, change their attacks at half health and summon a finite pair of supporting enemies. Clearing a room offers three relics. Split, ricochet, pierce, seeking, chain, burn, cold, explosions, orbiting blades, dash trails, nova and a health-for-damage pact combine during the run.

Hunt sends two more enemies per wave and awards more embers. Refuge has fewer enemies and heals one heart on entry. Total cleared rooms unlock Scatter at four and Needle at ten. There are no daily rewards, wait timers or account requirements. Embers are a run/lifetime score, not a purchasable currency or an unfinished shop.

## Saves

Progress is **local to this browser**, under `cinder-below-v1`. Settings offers JSON export/import for backups and moving between devices. Continuing resumes the last safe room entrance, with already-banked rewards protected against double counting. The earlier `mosslight-post-v1` save is untouched.

Writes use the Web Locks API and revision checks. Another tab's update pauses this tab and asks the player to load the latest save or export the local one. Corrupt data is preserved; replacement requires confirmation. When storage or safe locking is unavailable, play continues in memory with a visible status and export. Cloud/account sync is not implemented.

## Local development

Node 22+ and Python 3 are sufficient for the source build; there are no npm runtime dependencies.

```text
npm run check
npm run test
npm run build
python -m http.server 4328 --bind 127.0.0.1
```

Open `http://127.0.0.1:4328/src/` for development or `/dist/` for the built version. Browser checks use an existing Python Playwright + Chromium installation:

```text
python tests/browser-ui-check.py
python tests/browser-storage-check.py
python tests/browser-combat-check.py
```

The tests use `?test=1` and the public deterministic `advanceTime(ms)` hook. They use real UI input; combat completion tests do not modify health, enemies or the world. `render_game_to_text()` exposes a read-only JSON description for verification. A test hook is not an automatic gameplay feature.

## Hosting and evidence

ChatGPT Sites project: `appgprj_6accfe11a0ec8191ab683ddd3e52de07`. `.openai/hosting.json` points to `dist`. The official Sites source workflow opens/synchronizes the existing repository, runs remaining checks, commits and pushes the exact source, and packages the static output. A saved archive-backed version is deployed with public access. Local build success alone does not establish deployment; `.qa/release.json` records the actual source/version/deployment evidence.

- [Design and module boundaries](DESIGN.md)
- [Implementation details](IMPLEMENTATION.md)
- [532-page research ledger and limitations](docs/research/README.md)
- [Downloaded art and audio licenses / hashes](ASSET-CREDITS.md)

Research and diagnostic screenshots stay outside `src` and the deployed artifact. `.qa` is ignored and retains acceptance evidence locally. Game art and all audio are credited original CC0 Ninja Adventure assets; no art or music from The Binding of Isaac is used.
