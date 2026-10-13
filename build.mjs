import { cp, mkdir, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid build directory');
try { await stat(output); await rm(output, { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output, { recursive: true });
await cp(path.join(root, 'src'), output, { recursive: true });
let files = 0, bytes = 0;
async function count(dir) {
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name), info = await stat(p);
    if (info.isDirectory()) await count(p); else { files++; bytes += info.size; }
  }
}
await count(output);
console.log(`Cinder Below: ${files} static files, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
