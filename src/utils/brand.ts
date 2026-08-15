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
