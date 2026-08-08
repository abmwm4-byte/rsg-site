// Превью *-thumb.webp генерирует scripts/make-thumbs.mjs перед каждым билдом
export const withThumb = (src?: string) =>
  src && /\.webp$/i.test(src) ? src.replace(/\.webp$/i, '-thumb.webp') : src;

export const serviceByUnit: Record<string, { href: string; label: string }> = {
  'Стартер': { href: '/remont-starterov/', label: 'Цены на ремонт стартеров' },
  'Генератор': { href: '/remont-generatorov/', label: 'Цены на ремонт генераторов' },
};
