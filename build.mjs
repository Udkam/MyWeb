import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'model.js', 'icon.svg']) {
  await copyFile(`src/${file}`, `dist/${file}`);
}
console.log('Built five static files into dist/');
