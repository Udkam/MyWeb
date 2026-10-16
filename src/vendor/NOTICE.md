# Vendored dependency

- Library: fflate 0.8.2
- Upstream: https://github.com/101arrowz/fflate
- License: MIT, copyright (c) 2023 Arjun Barrett. The complete license is in `LICENSE-fflate.txt`.
- Source: unchanged ES module already vendored by the local ReadyPack project; that project's README identifies version 0.8.2.
- SHA-256 of `fflate.js`: `8cc1f687e0159e977addb6b85e274dbd11e622cf151f4fcb7b85d49622ea43e7`.
- SpriteLab uses `zipSync` and `strToU8` to produce offline frame archives, and `zlibSync` / `unzlibSync` for PNG pixel encoding and decoding. No CDN or external runtime requests are needed.
