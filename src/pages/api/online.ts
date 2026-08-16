import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Счётчик «сейчас на сайте»: хеш IP уходит в мини-воркер rsg-online
// (Durable Object, окно 120 сек). KV для этого не используем — бесплатный
// план даёт всего 1000 записей/list'ов в день, чего не хватает на трафик.
export const prerender = false;

export const GET: APIRoute = async ({ clientAddress }) => {
  try {
    const counter = (env as { ONLINE_COUNTER?: { fetch: typeof fetch } }).ONLINE_COUNTER;
    if (!counter) return Response.json({ online: 1 });

    // Хешируем IP — сами адреса никуда не отправляем и не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const res = await counter.fetch(`https://counter/hit?h=${hash}`, {
      headers: { 'x-counter-auth': 'rsg-online-7f3d9a' },
    });
    const data = (await res.json()) as { online?: number };
    return Response.json(
      { online: Math.max(1, data.online ?? 1) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Счётчик недоступен — не роняем endpoint
    return Response.json({ online: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
