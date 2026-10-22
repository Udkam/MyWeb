# MyWeb

Independent websites and games from [4c](https://foreseer.site/myweb/), with one complete source tree per branch of this repository.

`main` contains this directory and its maintenance history. Each product has its own local checkout, branch, dependencies and deployment. Product branches are not merged into `main`.

The personal portal is a separate repository: [Udkam/personal-web](https://github.com/Udkam/personal-web).

## Published websites

| Website | Source branch | Public entry |
| --- | --- | --- |
| TetraMorph | [codex/tetramorph](https://github.com/Udkam/MyWeb/tree/codex/tetramorph) | [tetramorph.vercel.app](https://tetramorph.vercel.app/) |
| Cinder Below | [codex/cinder-below](https://github.com/Udkam/MyWeb/tree/codex/cinder-below) | [foreseer.site/cinder-below](https://foreseer.site/cinder-below/) |
| SpriteLab | [codex/spritelab](https://github.com/Udkam/MyWeb/tree/codex/spritelab) | [foreseer.site/spritelab](https://foreseer.site/spritelab/) |

## Paused prototypes

| Project | Source branch | Status as of 2026-10-23 |
| --- | --- | --- |
| Wild Circuit | [codex/game-next](https://github.com/Udkam/MyWeb/tree/codex/game-next) | Paused prototype. The local checkout contains additional unpublished work; the remote branch is not a complete backup. |

Each branch's README and current task document describe its actual implementation and release state. A source branch alone does not imply a playable deployment.

Sailsong was cancelled on 2026-10-23. Its preview is no longer public and its product branch was removed. New pixel-game proposals await human review; no replacement game has been selected or started. The user will manually open the next production conversation after approving a proposal.

## Local layout

`E:\Proj\Active\MyWeb` is a container of independent checkouts, not another Git root.

| Local folder | Role |
| --- | --- |
| `TetraMorph` | Published TetraMorph source |
| `cinder-below` | Published Cinder Below source |
| `spritelab` | Published SpriteLab source |
| `_planning` | New pixel-game proposals awaiting human review |
| `_paused/wild-circuit` | Paused Wild Circuit checkout, including its uncommitted work |
| `_pending-delete/paper-and-pinions` | Retired source awaiting local deletion; not an active product or backup policy |
| `_pending-delete/sailsong` | Cancelled Sailsong source awaiting local deletion |

The local container README is the navigation entry. Its `_workspace` folder holds machine-specific repository and move verification records, which are not part of product releases.

## Working with a product

Clone the required product branch into its own directory, for example:

```bash
git clone --single-branch --branch codex/spritelab https://github.com/Udkam/MyWeb.git spritelab
```

Run Git commands from that product's root, fetch its branch, inspect local changes, and stage only the files belonging to the current task. Each checkout tracks its own branch; some also track the directory's `main`. Preserve local-only branches, uncommitted assets and saves when reorganizing folders.

## Deployments

- TetraMorph uses its existing Vercel project. Its production branch is `codex/tetramorph`; other product and directory branches are skipped by that project's build rules.
- Cinder Below and SpriteLab are published as verified static snapshots by the separate personal portal. Changes to their source branches reach the portal through their dedicated import scripts.
- New sites prefer an independent Vercel project, with ChatGPT Sites as the available fallback. A new public entry is added to the portal after deployment verification.

The original `Udkam/TetraMorph` repository remains a historical archive. Current TetraMorph development belongs on the branch linked above.
