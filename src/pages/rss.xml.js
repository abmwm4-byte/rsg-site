import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site, articles } from '../data/site';

export async function GET(context) {
  const cases = await getCollection('cases');
  
  const caseItems = cases.map((c) => ({
    title: `Кейс: ${c.data.title}`,
    pubDate: new Date(c.data.date),
    description: `Ремонт: ${c.data.car}. Симптом: ${c.data.symptom} Решение: ${c.data.solution}`,
    link: `/keisy/${c.id}/`,
  }));

  const articleItems = articles.map((a) => ({
    title: `Статья: ${a.title}`,
    pubDate: new Date(a.date),
    description: a.lead,
    link: `/stati/${a.slug}/`,
  }));

  const items = [...caseItems, ...articleItems].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: site.name,
    description: site.description || 'Ремонт стартеров и генераторов в Минске.',
    site: context.site || site.url,
    items: items,
    customData: `<language>ru-by</language>`,
  });
}
