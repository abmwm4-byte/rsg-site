import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Кейсы ремонтов: каждый кейс — отдельный .md файл в src/content/cases/
// Как добавить кейс: см. docs/cases-brief.md
const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),          // "VW Passat B6: стартер щёлкал, но не крутил"
    car: z.string(),            // "Volkswagen Passat B6, 2012"
    unit: z.enum(['Стартер', 'Генератор']),
    symptom: z.string(),        // симптом со слов клиента
    solution: z.string(),       // что сделали (работы и запчасти)
    price: z.string(),          // "90 BYN"
    time: z.string(),           // "2 часа"
    date: z.date(),
    before: z.string().optional(), // фото «до» (путь из public/)
    after: z.string().optional(),  // фото «после»
    photo: z.string().optional(),  // одиночное фото, если пары нет
  }),
});

export const collections = { cases };
