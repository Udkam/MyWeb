import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(js|mjs)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
      if ((await readFile(file, 'utf8')).includes('\uFFFD')) throw new Error(`Invalid UTF-8 in ${file}`);
    }
  }
}
await walk('src');
await walk('scripts');
console.log('Source syntax and UTF-8 checks passed.');
