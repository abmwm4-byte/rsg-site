import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Локальный скрипт публикации читает черновики отсюда (сайт не за Cloudflare Access).
export const prerender = false;

const ok = (req: Request) => {
  const token = (env as { CASE_IMPORT_TOKEN?: string }).CASE_IMPORT_TOKEN;
  return token && req.headers.get('x-token') === token;
};

export const GET: APIRoute = async ({ request }) => {
  if (!ok(request)) return new Response('403', { status: 403 });
  const kv = (env as { SESSION?: KVNamespace }).SESSION;
  if (!kv) return Response.json({ drafts: [] });

  const { keys } = await kv.list({ prefix: 'case-draft:' });
  const drafts = [];
  for (const k of keys) {
    const v = await kv.get(k.name);
    if (v) drafts.push(JSON.parse(v));
  }
  return Response.json({ drafts });
};

// Отметить опубликованные: удаляем ключи
export const POST: APIRoute = async ({ request }) => {
  if (!ok(request)) return new Response('403', { status: 403 });
  const { ids } = await request.json() as { ids: number[] };
  const kv = (env as { SESSION?: KVNamespace }).SESSION;
  if (!kv) return new Response('no kv', { status: 500 });
  for (const id of ids ?? []) await kv.delete(`case-draft:${id}`);
  return Response.json({ ok: true });
};
