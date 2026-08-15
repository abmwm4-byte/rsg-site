// Публикация черновиков кейсов из CRM на сайт.
// Читает /api/case-drafts (токен из .env.case-token или аргумента), публикует
// ОДИН самый старый черновик (или N через --all): фото base64 → webp в
// public/images, .md в src/content/cases, помечает опубликованным.
// Запуск вручную: node scripts/publish-cases.mjs [--all]
// По расписанию: GitHub Action .github/workflows/publish-case.yml (пн/чт).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TOKEN = process.env.CASE_IMPORT_TOKEN
  ?? (existsSync(new URL('../.env.case-token', import.meta.url))
    ? readFileSync(new URL('../.env.case-token', import.meta.url), 'utf8').trim()
    : null);
if (!TOKEN) { console.error('нет токена (CASE_IMPORT_TOKEN или .env.case-token)'); process.exit(1); }
const API = 'https://remontstarterov.by/api/case-drafts';
const publishAll = process.argv.includes('--all');

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = (s) => s.toLowerCase().split('').map((ch) => TRANSLIT[ch] ?? ch).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const res = await fetch(API, { headers: { 'x-token': TOKEN } });
if (!res.ok) { console.error('API:', res.status); process.exit(1); }
const { drafts } = await res.json();
// В расписание попадают только проверенные вручную (approved) черновики
const approved = (drafts ?? []).filter((d) => d.approved);
if (!approved.length) {
  console.log(`проверенных черновиков нет (всего в очереди: ${drafts?.length ?? 0}, ждут проверки)`);
  process.exit(0);
}

const queue = publishAll ? approved : [approved[0]]; // отсортированы по id — публикуем самый старый
const published = [];
for (const d of queue) {
  let base = slugify(d.car.split(/[,(]/)[0].trim()) + '-' + (d.unit === 'Стартер' ? 'starter' : 'generator');
  // Если такой кейс уже есть (та же машина) — добавляем суффикс -2, -3...
  for (let n = 2; existsSync(`src/content/cases/${base}.md`); n++) base = base.replace(/-\d+$/, '') + '-' + n;
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
