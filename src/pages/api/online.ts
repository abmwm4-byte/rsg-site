import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Счётчик «сейчас на сайте»: хеш IP кладём в KV с TTL 120 сек,
// количество живых ключей = примерное число посетителей онлайн.
export const prerender = false;

export const GET: APIRoute = async ({ clientAddress }) => {
  try {
    const kv = (env as { SESSION?: KVNamespace }).SESSION;
    if (!kv) return Response.json({ online: 1 });

    // Хешируем IP — сами адреса не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const key = 'online:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    await kv.put(key, '1', { expirationTtl: 120 });

    const { keys } = await kv.list({ prefix: 'online:' });
    return Response.json(
      { online: Math.max(1, keys.length) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // KV недоступен/сломан — не роняем endpoint, показываем минимум
    return Response.json({ online: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
