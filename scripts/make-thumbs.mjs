// Генерирует производные для фото в public/images:
//   *-thumb.webp (640px, q78) — превью карточек
//   *.avif (q55) — полноразмерный AVIF для <picture>
// Идемпотентно: создаёт только недостающие/устаревшие файлы.
// Новые фото добавляем в WebP — конвейер: sharp → .webp → производные при билде.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = 'public/images';
const files = readdirSync(dir).filter((f) => /\.webp$/i.test(f) && !f.includes('-thumb'));

let thumbs = 0, avifs = 0;
for (const file of files) {
  const src = join(dir, file);
  const mtime = statSync(src).mtimeMs;

  const thumb = join(dir, file.replace(/\.webp$/i, '-thumb.webp'));
  if (!existsSync(thumb) || statSync(thumb).mtimeMs < mtime) {
    await sharp(src).resize(640, null, { withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumb);
    thumbs++;
  }
  const thumbAvif = thumb.replace(/\.webp$/, '.avif');
  if (!existsSync(thumbAvif) || statSync(thumbAvif).mtimeMs < mtime) {
    await sharp(src).resize(640, null, { withoutEnlargement: true }).avif({ quality: 50, effort: 4 }).toFile(thumbAvif);
    thumbs++;
  }

  const avif = join(dir, file.replace(/\.webp$/i, '.avif'));
  if (!existsSync(avif) || statSync(avif).mtimeMs < mtime) {
    await sharp(src).avif({ quality: 55, effort: 4 }).toFile(avif);
    avifs++;
  }
}
console.log(`производные: ${thumbs} превью, ${avifs} avif (исходников ${files.length})`);
