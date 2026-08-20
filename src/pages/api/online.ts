import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Уникальные посетители за сутки (по Минску) + агрегаты для /statistika/:
// устройства, источники (с UTM), города (CF), страницы входа, часы, просмотры,
// цели с привязкой к источнику, новые/вернувшиеся, вовлечённость (>1 мин).
// Дневные срезы — одним JSON-блобом agg:<day> (экономим квоту записей KV).
// Бессрочные: uniq:<day>:_count, month:<YYYY-MM>:_count, total:all, goals:<day>.
export const prerender = false;

const TTL = 8 * 24 * 3600; // agg-блобы и хеши дедупа
const SEEN_TTL = 30 * 24 * 3600; // реестр «был на сайте» для новые/вернувшиеся
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

const refDomain = (ref: string, utm?: string): string => {
  if (utm) return 'UTM: ' + utm.slice(0, 40);
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
  ret: Record<string, number>; // new / back
  pv: number;
  eng: number; // провели на сайте > 1 минуты
}
interface DayGoals {
  goals: Record<string, number>;
  src: Record<string, number>;
}

const emptyAgg = (): DayAgg => ({ dev: {}, ref: {}, hour: {}, city: {}, page: {}, ret: {}, pv: 0, eng: 0 });
const bump = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const json = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const kv = (env as { SESSION?: KVNamespace }).SESSION;
    if (!kv) return json({ online: 1 });

    const ua = request.headers.get('user-agent') ?? '';
    const params = new URL(request.url).searchParams;
    const day = dayKeyMinsk();

    // Отладка и проверка IP — даже для ботов
    if (params.get('debug') === 'rsg-debug-2026') {
      const keys = [];
      let cursor = '';
      do {
        const list = await kv.list({ prefix: `debug:${day}:`, cursor, limit: 20 });
        keys.push(...list.keys.map(k => k.name));
        cursor = list.cursor;
      } while (cursor);
      const debugData = await Promise.all(
        keys.map(async (k) => ({ key: k, data: await kv.get(k, 'json') }))
      );
      return json({ debug: debugData.sort((a, b) => (b.key as string).localeCompare(a.key as string)) });
    }

    const checkIp = params.get('check');
    if (checkIp) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(checkIp));
      const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
      const seen = await kv.get(`uniq:${day}:${hash}`);
      const count = parseInt((await kv.get(`uniq:${day}:_count`)) ?? '0', 10);
      return json({ ip: checkIp, hash, seen: !!seen, day, totalToday: count });
    }

    // Просмотр агрегата за день
    if (params.get('agg') === 'rsg-debug-2026') {
      const agg = await kv.get(`agg:${day}`, 'json');
      return json({ day, agg });
    }

    // Сброс счётчика отладки
    if (params.get('reset-debug') === 'rsg-debug-2026') {
      await kv.put(`debug:count:${day}`, '0', { expirationTtl: TTL });
      return json({ reset: true, day });
    }

    if (deviceOf(ua) === 'bot') {
      const total = parseInt((await kv.get(`uniq:${day}:_count`)) ?? '0', 10);
      return json({ online: Math.max(1, total) });
    }

    // Отладка: записываем информацию о запросах (первые 50 в день)
    const cf = (request as unknown as { cf?: { city?: string; country?: string; colo?: string } }).cf;
    const debugCount = parseInt((await kv.get(`debug:count:${day}`)) ?? '0', 10);
    if (debugCount < 50) {
      const debugKey = `debug:${day}:${Date.now()}`;
      const debugInfo = {
        ip: clientAddress.slice(0, 8) + '...',
        ua: ua.slice(0, 60),
        device: deviceOf(ua),
        cf: { city: cf?.city, country: cf?.country, colo: cf?.colo },
        time: new Date().toISOString()
      };
      await kv.put(debugKey, JSON.stringify(debugInfo), { expirationTtl: TTL });
      await kv.put(`debug:count:${day}`, String(debugCount + 1), { expirationTtl: TTL });
    }

    // Клики по целям — каждый клик, с привязкой к источнику сессии
    const goal = params.get('goal');
    if (goal && GOALS.has(goal)) {
      const key = `goals:${day}`;
      const raw = (await kv.get(key, 'json')) as (DayGoals & Record<string, number>) | null;
      // Миграция: старый формат — плоский {call: n, ...}
      const data: DayGoals = raw && raw.goals ? raw : { goals: (raw as Record<string, number> | null) ?? {}, src: {} };
      bump(data.goals, goal);
      bump(data.src, refDomain(params.get('gref') ?? '', params.get('gutm') ?? undefined));
      await kv.put(key, JSON.stringify(data)); // бессрочно — история конверсий
      return json({ ok: true });
    }

    // Хешируем IP — сами адреса не храним
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
    const hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    const seen = await kv.get(`uniq:${day}:${hash}`);
    const isPv = params.get('pv') === '1';
    const isEngaged = params.get('engaged') === '1';

    if (!seen || isPv || isEngaged) {
      const aggKey = `agg:${day}`;
      const agg = { ...emptyAgg(), ...((await kv.get(aggKey, 'json')) as Partial<DayAgg> | null) };

      if (isPv) agg.pv++;
      if (isEngaged) agg.eng++;

      if (!seen) {
        await kv.put(`uniq:${day}:${hash}`, '1', { expirationTtl: 90000 }); // дедуп на сутки
        const incr = async (key: string) => {
          const cur = parseInt((await kv.get(key)) ?? '0', 10);
          await kv.put(key, String(cur + 1)); // бессрочно
        };
        await incr(`uniq:${day}:_count`);
        await incr(`month:${day.slice(0, 7)}:_count`);
        await incr('total:all');

        // Новый или вернувшийся (реестр на 30 дней)
        const seenKey = `seen30:${hash}`;
        const was = await kv.get(seenKey);
        bump(agg.ret, was ? 'back' : 'new');
        await kv.put(seenKey, '1', { expirationTtl: SEEN_TTL });

        bump(agg.dev, deviceOf(ua));
        bump(agg.ref, refDomain(params.get('ref') ?? '', params.get('utm') ?? undefined));
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
