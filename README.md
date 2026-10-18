# MyWeb

Independent websites and games from [4c](https://foreseer.site/myweb/), with one complete source tree per branch.

The `main` branch is this directory and its maintenance guide. Each website is checked out in a separate local folder, built from its own branch, and deployed using its own settings. Website branches are independent histories and are not merged into this directory.

The 4c personal portal is maintained separately in `Udkam/personal-web`; it is not part of this repository.

## Websites

| Website | Source branch | Play |
| --- | --- | --- |
| TetraMorph | [codex/tetramorph](https://github.com/Udkam/MyWeb/tree/codex/tetramorph) | [tetramorph.vercel.app](https://tetramorph.vercel.app/) |
| Cinder Below | [codex/cinder-below](https://github.com/Udkam/MyWeb/tree/codex/cinder-below) | [foreseer.site/cinder-below](https://foreseer.site/cinder-below/) |

Clone just the website you want to work on:

```bash
git clone --single-branch --branch codex/tetramorph https://github.com/Udkam/MyWeb.git TetraMorph
git clone --single-branch --branch codex/cinder-below https://github.com/Udkam/MyWeb.git cinder-below
```

Each website branch contains its own README, dependencies, verification commands and asset credits. Keep local saves and deployment settings independent between websites.

## Deployments

- TetraMorph uses the existing Vercel project and public domain. Its production branch is `codex/tetramorph`; the project's ignored-build rule skips the directory and other website branches.
- Cinder Below is published as a verified static snapshot by the separate `Udkam/personal-web` portal. A game-source push alone does not update that snapshot.
- The `main` branch is a source directory and maintenance guide.

The original `Udkam/TetraMorph` repository is retained as a read-only historical archive. New development belongs on the branch linked above.
