// Проверка черновиков кейсов перед публикацией.
//   node scripts/review-cases.mjs            — список черновиков (с фото в /tmp)
//   node scripts/review-cases.mjs approve 3 5 8   — отметить проверенными (встанут в расписание)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.CASE_IMPORT_TOKEN
  ?? (existsSync(new URL('../.env.case-token', import.meta.url))
    ? readFileSync(new URL('../.env.case-token', import.meta.url), 'utf8').trim()
    : null);
if (!TOKEN) { console.error('нет токена'); process.exit(1); }
const API = 'https://remontstarterov.by/api/case-drafts';

const [, , cmd, ...ids] = process.argv;

if (cmd === 'approve' && ids.length) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-token': TOKEN },
    body: JSON.stringify({ action: 'approve', ids: ids.map(Number) }),
  });
  console.log(r.ok ? `проверены и в расписании: ${ids.join(', ')}` : `ошибка: ${r.status}`);
  process.exit(r.ok ? 0 : 1);
}

const res = await fetch(API, { headers: { 'x-token': TOKEN } });
const { drafts } = await res.json();
if (!drafts?.length) { console.log('черновиков нет'); process.exit(0); }

for (const d of drafts) {
  console.log(`\n#${d.id} ${d.approved ? '[ПРОВЕРЕН]' : '[ждёт]'} ${d.car} — ${d.unit}`);
  console.log(`  Симптом: ${d.symptom}`);
  console.log(`  Решение: ${d.solution}`);
  if (d.works?.length) console.log(`  Работы: ${d.works.join(' / ')}`);
  console.log(`  ${d.price} · ${d.time} · фото: ${d.photos?.length ?? 0}`);
  // фото складываем в /tmp для просмотра
  d.photos?.forEach((p, i) => {
    const f = `/tmp/case-${d.id}-${i + 1}.webp`;
    writeFileSync(f, Buffer.from(p.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
    console.log(`    ${f}`);
  });
}
console.log('\nПосле проверки: node scripts/review-cases.mjs approve <id...>');
