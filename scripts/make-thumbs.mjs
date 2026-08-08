// Генерирует превью *-thumb.jpg (640px, q78) для всех фото в public/images.
// Идемпотентно: создаёт только недостающие/устаревшие превью.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = 'public/images';
const files = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f) && !f.includes('-thumb'));

let created = 0;
for (const file of files) {
  const src = join(dir, file);
  const out = join(dir, file.replace(/\.jpe?g$/i, '-thumb.jpg'));
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
  await sharp(src)
    .resize(640, null, { withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out);
  created++;
}
console.log(`thumbs: создано ${created}, всего исходников ${files.length}`);
