export interface CalendarCatalog {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  color: string;
  sort_order: number;
}

export interface CatalogEvent {
  id: string;
  catalog_id: string;
  catalog_ids: string[];
  catalog_name: string;
  catalog_color: string;
  month: number;
  day: number;
  name: string;
  description: string | null;
}

export function catalogEventsForDate(
  events: CatalogEvent[],
  month: number,
  day: number
) {
  return events.filter((e) => e.month === month + 1 && e.day === day);
}

const CATALOG_SHORT_NAMES: Record<string, string> = {
  "Venezuela — Fértiles generales": "Venezuela",
  "Comercial & E-commerce": "Comercial",
  "Sector petrolero & energía": "Petróleo",
  "Salud & bienestar": "Salud",
  "Banca & finanzas": "Finanzas",
  "Niños & educación": "Educación",
  "Deportes & FIFA": "Deportes",
  "Gastronomía & bebidas": "Gastronomía",
  "Días profesionales": "Profesiones",
  "Cultura LATAM": "Cultura",
  "Tecnología & digital": "Tech",
  "Medio ambiente & sostenibilidad": "Sostenibilidad",
};

export function catalogShortName(name: string): string {
  return CATALOG_SHORT_NAMES[name] ?? name;
}
