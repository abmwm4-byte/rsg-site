// Теги деталей/неисправностей кейсов — выводятся автоматически из текста кейса.
// Используются для точной подборки кейсов на страницах симптомов.
export interface PartTag {
  id: string;
  label: string;
  match: RegExp;
}

export const PART_TAGS: PartTag[] = [
  { id: 'shhetki', label: 'Щётки', match: /щ[её]тк/i },
  { id: 'vtulki', label: 'Втулки', match: /втулк/i },
  { id: 'podshipniki', label: 'Подшипники', match: /подшипник/i },
  { id: 'bendiks', label: 'Бендикс', match: /бендикс/i },
  { id: 'vtyag', label: 'Втягивающее реле', match: /втягивающ|втяжн/i },
  { id: 'kollektor', label: 'Токосъёмные кольца', match: /коллектор|токосъ[её]мн|кольц/i },
  { id: 'rotor', label: 'Ротор', match: /ротор/i },
  { id: 'stator', label: 'Статор', match: /статор/i },
  { id: 'diodny', label: 'Диодный мост', match: /диодн/i },
  { id: 'rele', label: 'Реле-регулятор', match: /реле[\s-]регулятор/i },
  { id: 'massa', label: 'Проводка и масса', match: /\bмасс|провод/i },
];

interface CaseLike {
  data: { title: string; symptom: string; solution: string; works?: string[] };
}

export function tagsFromCase(c: CaseLike): PartTag[] {
  const text = [c.data.title, c.data.symptom, c.data.solution, ...(c.data.works ?? [])].join(' ');
  return PART_TAGS.filter((t) => t.match.test(text));
}

export function caseHasAnyTag(c: CaseLike, ids: string[]): boolean {
  const tags = tagsFromCase(c);
  return tags.some((t) => ids.includes(t.id));
}
