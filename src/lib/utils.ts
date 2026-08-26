export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

import type { PostAsset } from "@/lib/types";

export function sortPostAssets(assets: PostAsset[]): PostAsset[] {
  return [...assets].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const isDateOnly =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0;

  if (isDateOnly) return formatDate(date);

  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function parseCopyFields(copy: string | null): {
  subtitle?: string;
} {
  if (!copy) return {};
  const subtitleMatch = copy.match(/(?:Subtítulo|Subtitle)[:\s]*([^\n]+)/i);
  return { subtitle: subtitleMatch?.[1]?.trim() };
}

export interface DesignerSlide {
  slide: number;
  label?: string;
  content: string;
}

export interface DesignerCopy {
  title?: string;
  subtitle?: string;
  body?: string;
  slides: DesignerSlide[];
}

export function parseDesignerCopy(copy: string | null): DesignerCopy {
  if (!copy) return { slides: [] };

  const result: DesignerCopy = { slides: [] };

  const titleMatch = copy.match(/(?:Título|Title)[:\s]*([^\n]+)/i);
  const subtitleMatch = copy.match(/(?:Subtítulo|Subtitle)[:\s]*([^\n]+)/i);
  const bodyMatch = copy.match(
    /(?:Cuerpo|Body)[:\s]*([\s\S]*?)(?=\n(?:Slide\s*\d|Título|Subtítulo)|$)/i
  );

  if (titleMatch) result.title = titleMatch[1].trim();
  if (subtitleMatch) result.subtitle = subtitleMatch[1].trim();
  if (bodyMatch) result.body = bodyMatch[1].trim();

  const slideRegex =
    /Slide\s*(\d+)(?:\s*\(([^)]+)\))?[:\s.]*([\s\S]*?)(?=Slide\s*\d+|$)/gi;
  let match;
  while ((match = slideRegex.exec(copy)) !== null) {
    const content = match[3].trim();
    if (content) {
      result.slides.push({
        slide: parseInt(match[1], 10),
        label: match[2]?.trim(),
        content,
      });
    }
  }

  if (
    result.slides.length === 0 &&
    !result.title &&
    !result.subtitle &&
    !result.body
  ) {
    const trimmed = copy.trim();
    if (trimmed) result.body = trimmed;
  }

  return result;
}

export function captionExcerpt(caption: string | null, max = 80): string | null {
  if (!caption) return null;
  const line = caption.trim().split("\n").find((l) => l.trim());
  if (!line) return null;
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

export interface MonthOption {
  value: string;
  label: string;
  count: number;
}

export function getAvailableMonths(
  dates: (string | null)[]
): MonthOption[] {
  const counts = new Map<string, number>();

  for (const date of dates) {
    if (!date) continue;
    const d = new Date(date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => {
      const [year, month] = value.split("-").map(Number);
      const label = new Intl.DateTimeFormat("es", {
        month: "long",
        year: "numeric",
      }).format(new Date(Date.UTC(year, month - 1, 1)));
      return {
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count,
      };
    });
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
