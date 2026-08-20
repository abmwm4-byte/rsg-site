import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Уникальные посетители за сутки (по Минску) + агрегаты для /statistika/:
// устройства, источники, города (CF), страницы входа, часы, просмотры, цели.
// Дневные срезы — одним JSON-блобом agg:<day> (экономим квоту записей KV).
// Бессрочные счётчики: uniq:<day>:_count, month:<YYYY-MM>:_count, total:all, goals:<day>.
export const prerender = false;

const TTL = 8 * 24 * 3600; // agg-блобы и хеши дедупа
const GOALS = new Set(['call', 'telegram', 'viber', 'whatsapp', 'route']);

const dayKeyMinsk = (d = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Minsk', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const hourMinsk = () =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', hour12: false }).format(new Date()).slice(0, 2);

const deviceOf = (ua: string): 'bot' | 'mobile' | 'tablet' | 'desktop' => {
  if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(ua)) return 'bot';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
};

const refDomain = (ref: string): string => {
  if (!ref) return 'Прямые заходы';
  try {
    const h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
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

interface DayAgg {
  dev: Record<string, number>;
  ref: Record<string, number>;
  hour: Record<string, number>;
  city: Record<string, number>;
  page: Record<string, number>;
  pv: number;
}

const emptyAgg = (): DayAgg => ({ dev: {}, ref: {}, hour: {}, city: {}, page: {}, pv: 0 });
const bump = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const json = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const kv = (env as { SESSION?: KVNamespace }).SESSION;
    if (!kv) return json({ online: 1 });

    const ua = request.headers.get('user-agent') ?? '';
    if (deviceOf(ua) === 'bot') {
      const total = parseInt((await kv.get(`uniq:${dayKeyMinsk()}:_count`)) ?? '0', 10);
      return json({ online: Math.max(1, total) });
    }

    const params = new URL(request.url).searchParams;
    const day = dayKeyMinsk();

    // Клики по целям (звонок, мессенджеры, маршрут) — считаем каждый клик
    const goal = params.get('goal');
    if (goal && GOALS.has(goal)) {
      const key = `goals:${day}`;
      const goals = (await kv.get(key, 'json')) as Record<string, number> | null ?? {};
      bump(goals, goal);
      await kv.put(key, JSON.stringify(goals)); // бессрочно — история конверсий
      return json({ ok: true });
    }

    // Хешируем IP — сами адреса не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const seen = await kv.get(`uniq:${day}:${hash}`);
    const isPv = params.get('pv') === '1';

    if (!seen || isPv) {
      const aggKey = `agg:${day}`;
      const agg = (await kv.get(aggKey, 'json')) as DayAgg | null ?? emptyAgg();

      if (isPv) agg.pv++;

      if (!seen) {
        await kv.put(`uniq:${day}:${hash}`, '1', { expirationTtl: 90000 }); // дедуп на сутки
        const incr = async (key: string) => {
          const cur = parseInt((await kv.get(key)) ?? '0', 10);
          await kv.put(key, String(cur + 1)); // бессрочно
        };
        await incr(`uniq:${day}:_count`);
        await incr(`month:${day.slice(0, 7)}:_count`);
        await incr('total:all');

        bump(agg.dev, deviceOf(ua));
        bump(agg.ref, refDomain(params.get('ref') ?? ''));
        bump(agg.hour, hourMinsk());
        const cf = (request as unknown as { cf?: { city?: string; country?: string } }).cf;
        bump(agg.city, cf?.city || cf?.country || 'Другие');
        const path = params.get('path') ?? '';
        if (path.startsWith('/')) bump(agg.page, path.slice(0, 120));
      }

      await kv.put(aggKey, JSON.stringify(agg), { expirationTtl: TTL });
    }

    const total = parseInt((await kv.get(`uniq:${day}:_count`)) ?? '0', 10);
    return json({ online: Math.max(1, total) });
  } catch {
    return json({ online: 1 });
  }
};
