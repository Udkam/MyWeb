# Cinder Below

This folder is the standalone Cinder Below game checkout. The shared GitHub
repository is `https://github.com/Udkam/MyWeb.git`; this website belongs to
`codex/cinder-below`. The portal belongs to the separate repository
`Udkam/personal-web`, on `main` in its own checkout. MyWeb keeps only the three
published website branches; its default branch is `codex/tetramorph`.

Canonical local source: `E:\Proj\Active\MyWeb\cinder-below`. The parent MyWeb
folder groups the separate website checkouts; it is not an additional Git root.

- Keep game work on `codex/cinder-below`; never push this game tree to another website's branch.
- `src` contains the deployable HTML, JavaScript, CSS, art and audio.
- Preserve asset licenses, source credits and the existing local-save contract.
- Use UTF-8 for text and keep `.qa`, `dist`, dependencies and secrets untracked.
- Run `npm ci`, `npm run check`, `npm test`, and `npm run build` for a release.
- Verify UI changes in a browser, with desktop and mobile controls as relevant.
- Fetch the exact remote game branch before pushing. Use normal fast-forward
  pushes and exact file staging; preserve unrelated work and Git history.
- The live portal snapshot is imported separately on `Udkam/personal-web` main.
  Read README.md before changing hosting or claiming a deployment has changed.
