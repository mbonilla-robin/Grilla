export type WidgetScope = "global" | "org";

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  scope: WidgetScope;
  slot?: boolean;
}

export const MAX_SLOT_WIDGETS = 4;

export const WIDGETS: WidgetDefinition[] = [
  {
    id: "my_orgs",
    label: "Tus marcas",
    description: "Estado rápido por organización",
    scope: "global",
    slot: true,
  },
  {
    id: "pending_work",
    label: "Pendientes",
    description: "Posts por avanzar en todas tus marcas",
    scope: "global",
    slot: true,
  },
  {
    id: "in_review",
    label: "En revisión",
    description: "Listos para aprobar",
    scope: "global",
    slot: true,
  },
  {
    id: "needs_design",
    label: "Sin diseño",
    description: "Esperan archivos de diseño",
    scope: "global",
    slot: true,
  },
  {
    id: "my_pendientes",
    label: "Mis pendientes",
    description: "Todo lo asignado a ti, con fecha límite",
    scope: "global",
  },
  {
    id: "brand_pulse",
    label: "Pulso",
    description: "Números de la marca",
    scope: "org",
    slot: true,
  },
  {
    id: "calendar",
    label: "Calendario",
    description: "Posts del mes",
    scope: "org",
    slot: true,
  },
  {
    id: "review",
    label: "En revisión",
    description: "Listos para aprobar",
    scope: "org",
    slot: true,
  },
  {
    id: "needs_design_org",
    label: "Sin diseño",
    description: "Esperan archivos",
    scope: "org",
    slot: true,
  },
  {
    id: "priority",
    label: "Prioridad",
    description: "Posts por avanzar",
    scope: "org",
    slot: true,
  },
];

export const DEFAULT_GLOBAL_SLOTS = ["my_orgs", "pending_work", "in_review"];

export const DEFAULT_ORG_SLOTS = ["brand_pulse", "calendar", "review"];

export function getWidgetDef(id: string) {
  return WIDGETS.find((w) => w.id === id);
}

export function slotWidgetsForScope(scope: WidgetScope) {
  return WIDGETS.filter((w) => w.scope === scope && w.slot);
}

export function allWidgetsForScope(scope: WidgetScope) {
  return WIDGETS.filter((w) => w.scope === scope);
}

export interface HomeWidgetsConfig {
  global: string[];
  orgs: Record<string, string[]>;
}

export function resolveOrgSlots(
  config: HomeWidgetsConfig,
  orgId: string
): string[] {
  return config.orgs[orgId]?.length
    ? config.orgs[orgId].slice(0, MAX_SLOT_WIDGETS)
    : DEFAULT_ORG_SLOTS;
}

/** @deprecated use DEFAULT_GLOBAL_SLOTS */
export const DEFAULT_GLOBAL_WIDGETS = DEFAULT_GLOBAL_SLOTS;

/** @deprecated use resolveOrgSlots */
export const resolveOrgWidgets = resolveOrgSlots;

export function widgetsForScope(scope: WidgetScope) {
  return slotWidgetsForScope(scope);
}
