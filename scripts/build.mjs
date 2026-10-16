import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src"),
  destination = path.join(root, "dist");
const files = [];
async function copy(dir, prefix = "") {
  for (const item of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const relative = prefix + item.name,
      input = path.join(dir, item.name),
      output = path.join(destination, relative);
    if (item.isSymbolicLink())
      throw new Error("Source links are not supported");
    if (item.isDirectory()) {
      await copy(input, relative + "/");
      continue;
    }
    if (!item.isFile()) throw new Error("Expected a regular source file");
    const bytes = await readFile(input);
    await mkdir(path.dirname(output), { recursive: true });
    await cp(input, output);
    files.push({
      file: relative,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
// Reject stale output rather than silently retaining files from older builds.
async function stale(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      await stale(path.join(dir, entry.name), relative + "/");
    else if (relative !== "build-manifest.json")
      await readFile(path.join(source, relative));
  }
}
await stale(destination);
await copy(source);
await writeFile(
  path.join(destination, "build-manifest.json"),
  JSON.stringify({ title: "SpriteLab", files }, null, 2) + "\n",
  "utf8",
);
console.log(
  `Built ${files.length} static runtime files; no external runtime dependencies.`,
);
