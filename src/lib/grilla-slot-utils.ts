import { FORMAT_LABELS, type PostFormat } from "@/lib/types";

export interface GrillaSlot {
  id: string;
  date: string;
  pillar: string;
  format: PostFormat;
  title: string;
  autoTitle: boolean;
  copy: string;
  caption: string;
  plate: string;
  orgIdentifierId: string | null;
  identifierPhotoUrl: string | null;
  inDrive: boolean;
  references: string;
}

export function titleFromCopy(copy: string): string {
  const match = copy.match(/(?:Título|Title|Slide 1)[:\s]*([^\n]+)/i);
  if (match) return match[1].trim().slice(0, 120);
  const first = copy.trim().split("\n")[0];
  return first ? first.slice(0, 80) : "";
}

export function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(monthValue: string): string[] {
  const [year, month] = monthValue.split("-").map(Number);
  const count = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= count; d++) {
    days.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  return days;
}

export function makeSlotId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSlot(
  date: string,
  defaults: { pillar: string; format: PostFormat }
): GrillaSlot {
  return {
    id: makeSlotId(),
    date,
    pillar: defaults.pillar,
    format: defaults.format,
    title: "",
    autoTitle: true,
    copy: "",
    caption: "",
    plate: "",
    orgIdentifierId: null,
    identifierPhotoUrl: null,
    inDrive: false,
    references: "",
  };
}

export function monthLabel(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(monthValue: string, delta: number): string {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export type GrillaPeriod = "week" | "quincena" | "month";
export type QuincenaId = "Q1" | "Q2";

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMondayOfDate(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateString(d);
}

export function daysInWeek(weekStart: string): string[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    days.push(toDateString(dt));
  }
  return days;
}

export function shiftWeek(weekStart: string, delta: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta * 7);
  return toDateString(dt);
}

export function weekRangeLabel(weekStart: string): string {
  const days = daysInWeek(weekStart);
  const [y1, m1, d1] = days[0].split("-").map(Number);
  const [y2, m2, d2] = days[6].split("-").map(Number);
  const start = new Date(y1, m1 - 1, d1).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
  const end = new Date(y2, m2 - 1, d2).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: y1 !== y2 || m1 !== m2 ? "numeric" : undefined,
  });
  return `${start} – ${end}`;
}

export function currentQuincena(): QuincenaId {
  return new Date().getDate() <= 15 ? "Q1" : "Q2";
}

export function daysInQuincena(monthValue: string, quincena: QuincenaId): string[] {
  const [year, month] = monthValue.split("-").map(Number);
  const daysCount = new Date(year, month, 0).getDate();
  const start = quincena === "Q1" ? 1 : 16;
  const end = quincena === "Q1" ? 15 : daysCount;
  const days: string[] = [];
  for (let d = start; d <= end; d++) {
    days.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  return days;
}

export function quincenaLabel(monthValue: string, quincena: QuincenaId): string {
  const [year, month] = monthValue.split("-").map(Number);
  const daysCount = new Date(year, month, 0).getDate();
  const range = quincena === "Q1" ? "1–15" : `16–${daysCount}`;
  const name = new Date(year, month - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  return `${range} de ${name}`;
}

export function shiftQuincena(
  monthValue: string,
  quincena: QuincenaId,
  delta: number
): { month: string; quincena: QuincenaId } {
  if (delta === 0) return { month: monthValue, quincena };
  if (delta > 0) {
    if (quincena === "Q1") return { month: monthValue, quincena: "Q2" };
    return { month: shiftMonth(monthValue, 1), quincena: "Q1" };
  }
  if (quincena === "Q2") return { month: monthValue, quincena: "Q1" };
  return { month: shiftMonth(monthValue, -1), quincena: "Q2" };
}

export function copyEditorMode(
  format: PostFormat
): "single" | "slides" | "stories" {
  if (format === "story") return "stories";
  if (format === "carousel" || format === "video_carousel") return "slides";
  return "single";
}

export function parseCopyParts(copy: string, format: PostFormat): string[] {
  const mode = copyEditorMode(format);
  if (mode === "single") {
    const stripped = copy
      .replace(/^(?:Slide|Story)\s*1[:\s]+/i, "")
      .trim();
    return [stripped || copy];
  }

  const headerRe = /^(?:Slide|Story)\s*(\d+)[:\s]+(.*)$/i;
  const lines = copy.split("\n");
  const parts: string[] = [];
  let current = "";
  let foundHeader = false;

  for (const line of lines) {
    const match = line.match(headerRe);
    if (match) {
      foundHeader = true;
      if (current.trim()) parts.push(current.trim());
      current = match[2] ?? "";
    } else if (line.trim() || current) {
      current = current ? `${current}\n${line}` : line;
    }
  }

  if (current.trim()) parts.push(current.trim());

  if (!foundHeader && copy.trim()) {
    return [copy.trim()];
  }

  return parts.length > 0 ? parts : [""];
}

export function serializeCopyParts(parts: string[], format: PostFormat): string {
  const mode = copyEditorMode(format);
  if (mode === "single") {
    return parts[0]?.trim() ?? "";
  }

  const prefix = mode === "stories" ? "Story" : "Slide";
  return parts
    .map((part, index) =>
      part.trim() ? `${prefix} ${index + 1}: ${part.trim()}` : ""
    )
    .filter(Boolean)
    .join("\n");
}

export function rebuildSlotsForDates(
  dates: string[],
  existing: GrillaSlot[],
  defaults: { pillar: string; format: PostFormat }
): GrillaSlot[] {
  const byDate = existing.reduce<Record<string, GrillaSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return dates.flatMap((date) =>
    byDate[date]?.length
      ? byDate[date]
      : [createSlot(date, defaults)]
  );
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const WEEKDAYS_MONDAY_START = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export interface CalendarCell {
  date: string | null;
  day: number | null;
}

export function buildMonthCalendar(monthValue: string): CalendarCell[][] {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysCount = new Date(year, month, 0).getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, day: null });
  }
  for (let d = 1; d <= daysCount; d++) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function formatDayLabel(date: string): { day: number; weekday: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return { day: d, weekday: WEEKDAYS[dt.getDay()] };
}

export function slotHasContent(
  slot: GrillaSlot,
  defaults: { pillar: string; format: PostFormat }
): boolean {
  if (slot.title.trim()) return true;
  if (slot.copy.trim()) return true;
  if (slot.caption.trim()) return true;
  if (slot.plate.trim()) return true;
  if (slot.orgIdentifierId) return true;
  if (slot.references.trim()) return true;
  if (slot.pillar !== defaults.pillar) return true;
  if (slot.format !== defaults.format) return true;
  return false;
}

export function slotToBulkInput(slot: GrillaSlot) {
  const finalTitle =
    slot.title.trim() ||
    titleFromCopy(slot.copy) ||
    `Post — ${slot.date}`;

  return {
    title: finalTitle,
    scheduled_at: slot.date,
    format: slot.format,
    pillar: slot.pillar || undefined,
    copy: slot.copy || undefined,
    caption: slot.caption || undefined,
    plate: slot.plate || undefined,
    org_identifier_id: slot.orgIdentifierId || undefined,
    identifier_photo_url: slot.identifierPhotoUrl || undefined,
    in_drive: slot.inDrive,
    references_text: slot.references || undefined,
  };
}

export function formatShortLabel(format: PostFormat): string {
  return FORMAT_LABELS[format];
}
