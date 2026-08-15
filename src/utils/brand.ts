// Определение марки авто из поля car кейса (для посадочных страниц /keisy/marki/)
export interface Brand {
  slug: string;
  name: string;
  match: RegExp;
}

const BRANDS: Brand[] = [
  { slug: 'mercedes', name: 'Mercedes-Benz', match: /mercedes(-\s*benz)?/i },
  { slug: 'volkswagen', name: 'Volkswagen', match: /volkswagen|\bvw\b/i },
  { slug: 'renault', name: 'Renault', match: /renault/i },
  { slug: 'peugeot', name: 'Peugeot', match: /peugeot/i },
  { slug: 'ford', name: 'Ford', match: /ford/i },
  { slug: 'kia', name: 'Kia', match: /kia/i },
  { slug: 'hyundai', name: 'Hyundai', match: /hyundai/i },
  { slug: 'audi', name: 'Audi', match: /audi/i },
  { slug: 'bmw', name: 'BMW', match: /bmw/i },
  { slug: 'volvo', name: 'Volvo', match: /volvo/i },
  { slug: 'chevrolet', name: 'Chevrolet', match: /chevrolet/i },
  { slug: 'lada', name: 'Lada', match: /lada/i },
  { slug: 'smart', name: 'Smart', match: /smart/i },
  { slug: 'geely', name: 'Geely', match: /geely/i },
  { slug: 'gaz', name: 'ГАЗель', match: /газель|gazelle/i },
  { slug: 'zhong-tong', name: 'Zhong Tong', match: /zhong\s*tong/i },
];

export function brandFromCar(car: string): Brand | null {
  return BRANDS.find((b) => b.match.test(car)) ?? null;
}

export function brandBySlug(slug: string): Brand | null {
  return BRANDS.find((b) => b.slug === slug) ?? null;
}

// Модель = первое слово после марки в поле car («Renault Logan 2013, …» → Logan)
export function modelFromCar(car: string, brandMatch: RegExp): string | null {
  const rest = car.replace(brandMatch, '').split(/[,(]/)[0].replace(/^[-–\s]+/, '').trim();
  const word = rest.split(/\s+/)[0];
  return word || null;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-zа-яё0-9]+/giu, '-').replace(/^-|-$/g, '');

// Уникальные тексты для топ-марок: типичные болезни по нашим кейсам.
// Пишем только там, где есть реальный опыт — иначе страница будет «пустой» для SEO.
export const brandTexts: Record<string, string[]> = {
  renault: [
    'На Renault чаще всего видим классику: у Logan первого и второго поколения умирает реле-регулятор генератора — зарядка пропадает внезапно, на ходу. У таксистов этот узел изнашивается быстрее из-за круглосуточной работы. На стартерах Logan и Megane типовое — щётки и бендикс.',
    'Хорошая новость для владельцев: запчасти на эти машины ходовые, почти всё держим в наличии, поэтому ремонт обычно занимает 2–4 часа вместе со снятием и установкой.',
  ],
  mercedes: [
    'По Sprinter отработанная тема — масло из двигателя подтекает в генератор, и щётки с коллектором стираются в разы быстрее нормы. Если у Sprinter пропала зарядка, почти всегда показываем клиенту залитый маслом статор. Лечится заменой щёточного узла, колец и мойкой агрегата, заодно смотрим подшипники.',
    'На легковых Mercedes (E-класс W212 и других) типовое — щётки генератора и втягивающее реле стартера. Запчасти есть в наличии, ремонт в день обращения.',
  ],
  volkswagen: [
    'У Volkswagen 1.4 TSI (CAXA и соседние моторы) встречаем выработку токосъёмных колец генератора — протачиваем на станке, если позволяет металл, либо меняем. Это честнее и дешевле, чем новый генератор.',
    'Стартеры Golf, Jetta и Polo страдают от щёток и втягивающего реле. Большинство ремонтов по этим машинам — 2–3 часа со снятием.',
  ],
  ford: [
    'Ford Transit 2.2 — наш постоянный гость: стартеры живут внизу, ловят воду и грязь с дороги, поэтому подгнивают щётки и втягивающее реле. Клиенты обычно привозят «молчащий» стартер — после разборки внутри ржа. Восстанавливаем: щётки, бендикс, втягивающее, мойка.',
    'По Explorer и Fiesta типовое — бендикс (пробуксовка на запуске) и щёточные узлы генераторов. Запчасти в наличии.',
  ],
  peugeot: [
    'По Peugeot чаще всего генераторы: у 807 и соседних моделей изнашиваются токосъёмные кольца и щётки — зарядка пропадает постепенно, сначала плавает напряжение. У стартеров 206 типовое — втягивающее реле, особенно «щёлканье на горячую».',
  ],
};
