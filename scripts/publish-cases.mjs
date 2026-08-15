// Публикация черновиков кейсов из CRM на сайт.
// Читает /api/case-drafts (токен из .env.case-token или аргумента), для каждого
// черновика: сохраняет фото (base64 → webp в public/images), пишет .md в
// src/content/cases, помечает опубликованным. Дальше — build/commit/deploy.
// Запуск: node scripts/publish-cases.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TOKEN = process.argv[2] ?? readFileSync(new URL('../.env.case-token', import.meta.url), 'utf8').trim();
const API = 'https://remontstarterov.by/api/case-drafts';

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = (s) => s.toLowerCase().split('').map((ch) => TRANSLIT[ch] ?? ch).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const res = await fetch(API, { headers: { 'x-token': TOKEN } });
if (!res.ok) { console.error('API:', res.status); process.exit(1); }
const { drafts } = await res.json();
if (!drafts?.length) { console.log('черновиков нет'); process.exit(0); }

const published = [];
for (const d of drafts) {
  const base = slugify(d.car.split(/[,(]/)[0].trim()) + '-' + (d.unit === 'Стартер' ? 'starter' : 'generator');
  const imgBase = base.replace(/-generator$/, '').replace(/-starter$/, '');

  // Фото: base64 data-url → webp файлы
  const photos = [];
  d.photos.forEach((dataUrl, i) => {
    const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const name = `${imgBase}-${i + 1}.webp`;
    writeFileSync(`public/images/${name}`, Buffer.from(b64, 'base64'));
    photos.push(`/images/${name}`);
  });

  const works = d.works?.length ? '\nworks:\n' + d.works.map((w) => `  - '${w.replace(/'/g, "’")}'`).join('\n') : '';
  const photoLines = photos.slice(1).map((p) => `![${d.car} — фото ремонта](${p})`).join('\n\n');
  const md = `---
title: '${d.car}: ${d.symptom.split('.')[0].replace(/'/g, "’")}'
car: '${d.car.replace(/'/g, "’")}'
unit: '${d.unit}'
symptom: '${d.symptom.replace(/'/g, "’")}'
solution: '${d.solution.replace(/'/g, "’")}'${works}
price: '${d.price}'
time: '${d.time}'
date: ${new Date().toISOString().slice(0, 10)}
photo: ${photos[0]}
---

${d.solution}

${photoLines}

Итог: ${d.price}.
Гарантия 3 месяца на работы и запчасти.
`;
  writeFileSync(`src/content/cases/${base}.md`, md);
  console.log('готово:', base, `(фото: ${photos.length})`);
  published.push(d.id);
}

execSync('node scripts/make-thumbs.mjs', { stdio: 'inherit' });

// Помечаем опубликованными (удаляем из очереди на сайте)
await fetch(API, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-token': TOKEN },
  body: JSON.stringify({ ids: published }),
});
console.log('опубликовано:', published.length, '— дальше: git add -A && git commit && git push');
