import { cp, mkdir, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
if (process.cwd() !== root) process.chdir(root);
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid build directory');
await rm(output, { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
async function count(dir) { let bytes=0, files=0; for (const name of await readdir(dir)) { const p=path.join(dir,name), s=await stat(p); if(s.isDirectory()){const c=await count(p);bytes+=c.bytes;files+=c.files;}else{bytes+=s.size;files++;} }return {files,bytes}; }
console.log('Static game built:',await count('dist'));
