// Мини-воркер «счётчик онлайна».
// Durable Object держит хеши IP в памяти (TTL-окно 120 сек) —
// без KV, чтобы не упираться в дневные лимиты бесплатного плана.
// Вызывается только изнутри: основной воркер rsg-site ходит сюда
// через service binding ONLINE_COUNTER.

const WINDOW_MS = 120_000;

export class OnlineCounter {
  private hits = new Map<string, number>();

  async fetch(request: Request): Promise<Response> {
    const hash = new URL(request.url).searchParams.get('h');
    const now = Date.now();

    if (hash) this.hits.set(hash, now);
    for (const [k, ts] of this.hits) {
      if (now - ts > WINDOW_MS) this.hits.delete(k);
    }

    return Response.json({ online: Math.max(1, this.hits.size) });
  }
}

export default {
  async fetch(request: Request, env: { ONLINE: DurableObjectNamespace }): Promise<Response> {
    // Не публичный API: принимаем только вызовы по service binding (с секретом)
    if (request.headers.get('x-counter-auth') !== 'rsg-online-7f3d9a') {
      return new Response('forbidden', { status: 403 });
    }
    const stub = env.ONLINE.get(env.ONLINE.idFromName('global'));
    return stub.fetch(request);
  },
};
