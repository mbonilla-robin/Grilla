import type { CatalogEvent } from "@/lib/calendar-types";
import { catalogShortName } from "@/lib/calendar-types";
import { FORMAT_LABELS, type PostFormat } from "@/lib/types";

export interface FertileOrgContext {
  id: string;
  name: string;
  catalogIds: string[];
  catalogNames: string[];
  postFormats: PostFormat[];
}

export interface PostRecommendation {
  orgId: string;
  orgName: string;
  format: PostFormat;
  title: string;
  copy: string;
  pillar: string;
  rationale: string;
}

const DEFAULT_FORMATS: PostFormat[] = ["image", "carousel", "reel", "story"];

function pickFormat(
  event: CatalogEvent,
  available: PostFormat[]
): PostFormat {
  const catalog = event.catalog_name.toLowerCase();
  const priorities: PostFormat[] = catalog.includes("comercial")
    ? ["carousel", "reel", "story", "image"]
    : catalog.includes("deporte")
      ? ["reel", "story", "carousel", "image"]
      : catalog.includes("profesion")
        ? ["story", "image", "carousel"]
        : catalog.includes("cultura")
          ? ["reel", "carousel", "story"]
          : catalog.includes("tecnolog")
            ? ["reel", "carousel", "story"]
            : catalog.includes("gastronom")
              ? ["reel", "carousel", "story"]
              : ["story", "image", "carousel", "reel"];

  return (
    priorities.find((f) => available.includes(f)) ??
    available[0] ??
    "story"
  );
}

function pickPillar(event: CatalogEvent): string {
  const catalog = event.catalog_name.toLowerCase();
  if (catalog.includes("comercial")) return "Ventas";
  if (catalog.includes("salud") || catalog.includes("profesion")) {
    return "Información";
  }
  return "Valor";
}

function contentAngle(event: CatalogEvent, format: PostFormat): string {
  const formatLabel = FORMAT_LABELS[format].toLowerCase();
  const catalog = event.catalog_name.toLowerCase();

  if (catalog.includes("comercial")) {
    return `un ${formatLabel} con oferta o llamado a la acción aprovechando ${event.name}`;
  }
  if (catalog.includes("profesion")) {
    return `un ${formatLabel} que reconozca o informe sobre ${event.name}`;
  }
  if (catalog.includes("deporte")) {
    return `un ${formatLabel} con energía deportiva sobre ${event.name}`;
  }
  if (catalog.includes("cultura")) {
    return `un ${formatLabel} que celebre o explique ${event.name} con identidad local`;
  }
  if (catalog.includes("tecnolog")) {
    return `un ${formatLabel} educativo sobre ${event.name} y su relevancia digital`;
  }
  if (catalog.includes("medio ambiente") || catalog.includes("sostenibil")) {
    return `un ${formatLabel} que informe sobre ${event.name} y buenas prácticas`;
  }
  return `un ${formatLabel} que informe o celebre ${event.name}`;
}

function buildCopy(event: CatalogEvent, orgName: string, format: PostFormat): string {
  const catalog = event.catalog_name.toLowerCase();

  if (catalog.includes("comercial")) {
    return `Aprovecha ${event.name} para conectar con tu audiencia en ${orgName}. Destaca un beneficio claro, urgencia y CTA directo.`;
  }
  if (catalog.includes("profesion")) {
    return `Hoy es ${event.name}. Comparte datos útiles, reconoce al gremio o cuenta cómo ${orgName} se relaciona con esta fecha.`;
  }
  if (event.description) {
    return `${event.description} Adapta el mensaje al tono de ${orgName}.`;
  }
  return `Fecha fértil: ${event.name}. Crea contenido relevante para la audiencia de ${orgName} en este día.`;
}

export function fertileEventDateLabel(event: CatalogEvent, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const date = new Date(Date.UTC(y, event.month - 1, event.day));
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function fertileScheduledAt(event: CatalogEvent, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const m = String(event.month).padStart(2, "0");
  const d = String(event.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generatePostRecommendations(
  event: CatalogEvent,
  orgs: FertileOrgContext[]
): PostRecommendation[] {
  const eventCatalogIds = event.catalog_ids?.length
    ? event.catalog_ids
    : [event.catalog_id];

  const eligible = orgs.filter(
    (org) =>
      org.catalogIds.some((id) => eventCatalogIds.includes(id)) ||
      org.catalogNames.includes(event.catalog_name)
  );

  const finalOrgs = eligible.length > 0 ? eligible : orgs;
  if (finalOrgs.length === 0) return [];

  return finalOrgs.map((org) => {
    const formats = org.postFormats.length ? org.postFormats : DEFAULT_FORMATS;
    const format = pickFormat(event, formats);
    const pillar = pickPillar(event);
    const angle = contentAngle(event, format);

    return {
      orgId: org.id,
      orgName: org.name,
      format,
      pillar,
      title: event.name,
      copy: buildCopy(event, org.name, format),
      rationale: `En ${org.name} puedes hacer ${angle}.`,
    };
  });
}

export function fertileCatalogLabel(name: string): string {
  return catalogShortName(name);
}
