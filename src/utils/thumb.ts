// Превью *-thumb.jpg генерирует scripts/make-thumbs.mjs перед каждым билдом
export const withThumb = (src?: string) =>
  src && /\.jpe?g$/i.test(src) ? src.replace(/\.jpe?g$/i, '-thumb.jpg') : src;

export const serviceByUnit: Record<string, { href: string; label: string }> = {
  'Стартер': { href: '/remont-starterov/', label: 'Цены на ремонт стартеров' },
  'Генератор': { href: '/remont-generatorov/', label: 'Цены на ремонт генераторов' },
};
