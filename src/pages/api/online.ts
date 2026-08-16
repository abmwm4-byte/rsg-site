import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Уникальные посетители за сутки (по минскому времени): хеш IP пишется в KV
// один раз в день, счётчик инкрементируется при новом уникальном хеше.
// Читатели (виджет) читают только ключ счётчика — list-операции не нужны,
// в лимиты бесплатного плана (1000 записей/день) укладываемся с запасом.
export const prerender = false;

const dayKeyMinsk = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date()); // YYYY-MM-DD

export const GET: APIRoute = async ({ clientAddress }) => {
  const fallback = () => Response.json({ online: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const kv = (env as { SESSION?: KVNamespace }).SESSION;
    if (!kv) return fallback();

    const day = dayKeyMinsk();
    const countKey = `uniq:${day}:_count`;

    // Хешируем IP — сами адреса не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const seen = await kv.get(`uniq:${day}:${hash}`);
    if (!seen) {
      await kv.put(`uniq:${day}:${hash}`, '1', { expirationTtl: 90000 }); // 25ч — живёт до конца суток
      const cur = parseInt((await kv.get(countKey)) ?? '0', 10);
      await kv.put(countKey, String(cur + 1), { expirationTtl: 172800 }); // 48ч
    }

    const total = parseInt((await kv.get(countKey)) ?? '0', 10);
    return Response.json({ online: Math.max(1, total) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fallback();
  }
};
