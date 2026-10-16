import { readFile, readdir, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const html = await readFile(path.join(src, "index.html"), "utf8");
const app = await readFile(path.join(src, "app.js"), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate HTML IDs");
for (const [, id] of app.matchAll(/\$\('([^']+)'\)/g)) {
  if (!ids.includes(id)) throw new Error(`Missing UI control: ${id}`);
}
async function visit(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isSymbolicLink())
      throw new Error(`Unexpected source symlink: ${file}`);
    if (item.isDirectory()) {
      await visit(file);
      continue;
    }
    const bytes = await readFile(file);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\uFFFD"))
      throw new Error(`Replacement character in ${file}`);
    if (file.endsWith(".js")) {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
      for (const [, relative] of text.matchAll(
        /from\s+['"](\.\.?\/[^'"]+)['"]/g,
      ))
        await access(path.resolve(dir, relative));
    }
  }
}
await visit(src);
for (const [, relative] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))
  await access(path.resolve(src, relative));
console.log(
  `SpriteLab source check passed: UTF-8, module syntax, ${ids.length} UI IDs, local resources.`,
);
