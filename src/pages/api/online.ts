import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Уникальные посетители за сутки (по минскому времени) + агрегаты для
// страницы статистики: устройство (из User-Agent) и источник (referrer,
// присылает виджет из document.referrer). Боты не засчитываются.
// Все ключи живут 8 дней — хватает для истории за неделю.
export const prerender = false;

const TTL = 8 * 24 * 3600;

const dayKeyMinsk = (d = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const deviceOf = (ua: string): 'bot' | 'mobile' | 'tablet' | 'desktop' => {
  if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(ua)) return 'bot';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
};

const refDomain = (ref: string): string => {
  if (!ref) return 'Прямые заходы';
  try {
    let h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
    if (h.endsWith('remontstarterov.by')) return 'Внутренние переходы';
    if (/(^|\.)google\./.test(h)) return 'Google';
    if (/(^|\.)yandex\.(by|ru|com)/.test(h) || h === 'ya.ru') return 'Яндекс';
    if (h === 't.me' || h.includes('telegram')) return 'Telegram';
    if (h.includes('whatsapp')) return 'WhatsApp';
    if (h.includes('viber')) return 'Viber';
    if (/(^|\.)vk\.com/.test(h)) return 'ВКонтакте';
    if (/(^|\.)facebook\.com|(^|\.)instagram\.com/.test(h)) return 'Meta';
    return h;
  } catch {
    return 'Прямые заходы';
  }
};

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const fallback = () => Response.json({ online: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const kv = (env as { SESSION?: KVNamespace }).SESSION;
    if (!kv) return fallback();

    const day = dayKeyMinsk();
    const countKey = `uniq:${day}:_count`;

    const ua = request.headers.get('user-agent') ?? '';
    const device = deviceOf(ua);
    if (device === 'bot') {
      const total = parseInt((await kv.get(countKey)) ?? '0', 10);
      return Response.json({ online: Math.max(1, total) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Хешируем IP — сами адреса не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const seen = await kv.get(`uniq:${day}:${hash}`);
    if (!seen) {
      await kv.put(`uniq:${day}:${hash}`, '1', { expirationTtl: 90000 }); // дедуп на сутки
      const incr = async (key: string) => {
        const cur = parseInt((await kv.get(key)) ?? '0', 10);
        await kv.put(key, String(cur + 1), { expirationTtl: TTL });
      };
      const ref = refDomain(new URL(request.url).searchParams.get('ref') ?? '');
      await incr(countKey);
      await incr(`stats:${day}:dev:${device}`);
      await incr(`stats:${day}:ref:${ref}`);
    }

    const total = parseInt((await kv.get(countKey)) ?? '0', 10);
    return Response.json({ online: Math.max(1, total) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fallback();
  }
};
