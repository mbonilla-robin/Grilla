import type { PostFormat } from "@/lib/types";
import { FORMAT_LABELS } from "@/lib/types";

export interface ExcelGrillaRow {
  id: string;
  date: string;
  pillar: string;
  format: PostFormat;
  title: string;
  copy: string;
  caption: string;
  plate: string;
  inDrive: boolean;
  references: string;
  errors: string[];
}

const FORMAT_ALIASES: Record<string, PostFormat> = {
  feed: "feed",
  image: "image",
  imagen: "image",
  carousel: "carousel",
  carrusel: "carousel",
  video_carousel: "video_carousel",
  "video carrusel": "video_carousel",
  videocarrusel: "video_carousel",
  reel: "reel",
  story: "story",
  historia: "story",
};

const HEADER_MAP: Record<string, keyof Omit<ExcelGrillaRow, "id" | "errors">> = {
  fecha: "date",
  date: "date",
  pilar: "pillar",
  pillar: "pillar",
  formato: "format",
  format: "format",
  titulo: "title",
  título: "title",
  title: "title",
  copy: "copy",
  caption: "caption",
  placa: "plate",
  plate: "plate",
  drive: "inDrive",
  "en drive": "inDrive",
  referencias: "references",
  references: "references",
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseBool(value: unknown): boolean {
  const str = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "si", "sí", "yes", "x"].includes(str);
}

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const slash = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

function parseFormat(value: unknown, allowed: PostFormat[]): PostFormat | null {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return allowed[0] ?? "image";
  const mapped = FORMAT_ALIASES[raw];
  if (mapped && allowed.includes(mapped)) return mapped;
  if (allowed.includes(raw as PostFormat)) return raw as PostFormat;
  return null;
}

function rowId(index: number): string {
  return `excel-row-${index}`;
}

export async function parseGrillaExcelFile(
  file: File,
  options: {
    pillarOptions: string[];
    allowedFormats: PostFormat[];
  }
): Promise<ExcelGrillaRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  if (rawRows.length === 0) return [];

  const firstKeys = Object.keys(rawRows[0]);
  const columnMap = new Map<string, keyof Omit<ExcelGrillaRow, "id" | "errors">>();
  for (const key of firstKeys) {
    const mapped = HEADER_MAP[normalizeHeader(key)];
    if (mapped) columnMap.set(key, mapped);
  }

  return rawRows.map((raw, index) => {
    const errors: string[] = [];
    const values: Record<string, unknown> = {};

    for (const [key, field] of columnMap.entries()) {
      values[field] = raw[key];
    }

    const date = parseExcelDate(values.date);
    if (!date) errors.push("Fecha inválida o vacía");

    const pillarRaw = String(values.pillar ?? "").trim();
    const pillar =
      pillarRaw &&
      options.pillarOptions.some(
        (p) => p.toLowerCase() === pillarRaw.toLowerCase()
      )
        ? options.pillarOptions.find(
            (p) => p.toLowerCase() === pillarRaw.toLowerCase()
          )!
        : pillarRaw || options.pillarOptions[0] || "";
    if (pillarRaw && !options.pillarOptions.some((p) => p === pillar)) {
      errors.push(`Pilar desconocido: ${pillarRaw}`);
    }

    const format = parseFormat(values.format, options.allowedFormats);
    if (!format) errors.push("Formato inválido");

    const title = String(values.title ?? "").trim();
    const copy = String(values.copy ?? "").trim();
    const caption = String(values.caption ?? "").trim();

    if (!title && !copy && !caption) {
      errors.push("Falta título, copy o caption");
    }

    return {
      id: rowId(index),
      date: date || "",
      pillar,
      format: format || options.allowedFormats[0] || "image",
      title,
      copy,
      caption,
      plate: String(values.plate ?? "").trim(),
      inDrive: parseBool(values.inDrive),
      references: String(values.references ?? "").trim(),
      errors,
    };
  });
}

export async function downloadGrillaTemplate() {
  const XLSX = await import("xlsx");
  const headers = [
    "Fecha",
    "Pilar",
    "Formato",
    "Título",
    "Copy",
    "Caption",
    "Placa",
    "Drive",
    "Referencias",
  ];
  const example = [
    "2026-08-01",
    "Valor",
    "reel",
    "Ejemplo de título",
    "Slide 1: Intro\nSlide 2: CTA",
    "Caption de la publicación",
    "",
    "no",
    "https://ejemplo.com",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 24 },
    { wch: 30 },
    { wch: 30 },
    { wch: 10 },
    { wch: 8 },
    { wch: 24 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grilla");
  XLSX.writeFile(wb, "plantilla-grilla.xlsx");
}

export function excelRowToBulkInput(row: ExcelGrillaRow) {
  const title =
    row.title.trim() ||
    row.copy.split("\n")[0]?.slice(0, 80) ||
    `Post — ${row.date}`;

  return {
    title,
    scheduled_at: row.date,
    format: row.format,
    pillar: row.pillar || undefined,
    copy: row.copy || undefined,
    caption: row.caption || undefined,
    plate: row.plate || undefined,
    in_drive: row.inDrive,
    references_text: row.references || undefined,
  };
}

export function formatLabelsList(formats: PostFormat[]): string {
  return formats.map((f) => FORMAT_LABELS[f]).join(", ");
}
