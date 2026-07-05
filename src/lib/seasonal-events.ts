export interface SeasonalEvent {
  month: number;
  day: number;
  name: string;
  category: "comercial" | "cultural" | "social";
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  { month: 1, day: 1, name: "Año Nuevo", category: "cultural" },
  { month: 1, day: 6, name: "Día de Reyes", category: "cultural" },
  { month: 2, day: 14, name: "San Valentín", category: "comercial" },
  { month: 3, day: 8, name: "Día de la Mujer", category: "social" },
  { month: 3, day: 20, name: "Inicio de Primavera", category: "cultural" },
  { month: 4, day: 1, name: "Día del Niño", category: "cultural" },
  { month: 5, day: 1, name: "Día del Trabajo", category: "social" },
  { month: 5, day: 10, name: "Día de la Madre", category: "comercial" },
  { month: 6, day: 21, name: "Inicio de Verano", category: "cultural" },
  { month: 6, day: 21, name: "Día del Padre", category: "comercial" },
  { month: 7, day: 4, name: "Independencia USA", category: "cultural" },
  { month: 8, day: 15, name: "Regreso a Clases", category: "comercial" },
  { month: 9, day: 15, name: "Independencia (LATAM)", category: "cultural" },
  { month: 10, day: 31, name: "Halloween", category: "comercial" },
  { month: 11, day: 1, name: "Día de Todos los Santos", category: "cultural" },
  { month: 11, day: 11, name: "Singles Day / 11.11", category: "comercial" },
  { month: 11, day: 28, name: "Black Friday", category: "comercial" },
  { month: 12, day: 8, name: "Inmaculada Concepción", category: "cultural" },
  { month: 12, day: 24, name: "Nochebuena", category: "cultural" },
  { month: 12, day: 25, name: "Navidad", category: "comercial" },
  { month: 12, day: 31, name: "Fin de Año", category: "comercial" },
];

export function eventsForDate(year: number, month: number, day: number) {
  return SEASONAL_EVENTS.filter((e) => e.month === month + 1 && e.day === day);
}

export function eventsForMonth(year: number, month: number) {
  return SEASONAL_EVENTS.filter((e) => e.month === month + 1);
}

export const EVENT_CATEGORY_COLORS: Record<SeasonalEvent["category"], string> = {
  comercial: "bg-brand text-brand-foreground",
  cultural: "bg-white text-foreground border border-border",
  social: "bg-foreground text-background",
};
