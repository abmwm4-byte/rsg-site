import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Приём черновиков кейсов из CRM (та защищена Cloudflare Access, поэтому пушит сюда).
// Храним в SESSION KV до публикации. Токен — env.CASE_IMPORT_TOKEN (secret).
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = (env as { CASE_IMPORT_TOKEN?: string }).CASE_IMPORT_TOKEN;
  if (!token || request.headers.get('x-token') !== token) return new Response('403', { status: 403 });

  const draft = await request.json() as { id?: number; car?: string; unit?: string; symptom?: string; solution?: string; price?: string; time?: string };
  if (!draft.car || !draft.unit) return new Response('bad draft', { status: 400 });

  const kv = (env as { SESSION?: KVNamespace }).SESSION;
  if (!kv) return new Response('no kv', { status: 500 });

  // Ключ по id черновика в CRM — повторная отправка перезаписывает.
  // approved: false — в расписание попадают только проверенные вручную
  await kv.put(`case-draft:${draft.id}`, JSON.stringify({ ...draft, approved: false }));
  return Response.json({ ok: true });
};
