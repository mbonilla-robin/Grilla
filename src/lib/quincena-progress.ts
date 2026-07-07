import {
  getQuincenaContexts,
  type QuincenaId,
} from "@/lib/editorial-cadence";
import {
  allPostsHandedToCm,
  creatorHasUploadedGrids,
  type QuincenaBoardSnapshot,
} from "@/lib/editorial-quincena";
import {
  WORKFLOW_PHASES,
  workflowPhaseProgress,
  type WorkflowPhaseKey,
} from "@/lib/post-progress";
import type { MemberRole, PostStatus } from "@/lib/types";

const QUINCENA_RANGE: Record<QuincenaId, string> = {
  Q1: "(1–15)",
  Q2: "(16–fin)",
};

export interface QuincenaPhaseBreakdown {
  contenido: number;
  brief_listo: number;
  en_revision: number;
  aprobado: number;
}

export interface QuincenaProgressCard {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  totalCount: number;
  phases: QuincenaPhaseBreakdown;
  averageProgressPct: number;
  summaryText: string;
  milestone: string;
  calendarHref: string;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateInMonth(year: number, month: number, day: number): Date {
  const clamped = Math.min(day, lastDayOfMonth(year, month));
  return new Date(year, month, clamped);
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function monthLabel(year: number, month: number): string {
  const label = new Intl.DateTimeFormat("es", { month: "long" }).format(
    new Date(year, month, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatBoardTitle(board: QuincenaBoardSnapshot): string {
  const month = monthLabel(board.publishYear, board.publishMonth);
  return `${board.orgName} · ${board.quincena} ${month} ${QUINCENA_RANGE[board.quincena]}`;
}

function postWorkflowPhase(status: PostStatus): WorkflowPhaseKey {
  for (const phase of WORKFLOW_PHASES) {
    if (phase.statuses.includes(status)) {
      return phase.key;
    }
  }
  return "contenido";
}

function analyzeQuincenaPosts(posts: QuincenaBoardSnapshot["posts"]) {
  const phases: QuincenaPhaseBreakdown = {
    contenido: 0,
    brief_listo: 0,
    en_revision: 0,
    aprobado: 0,
  };

  let progressSum = 0;

  for (const post of posts) {
    const phase = postWorkflowPhase(post.status);
    phases[phase] += 1;
    progressSum += workflowPhaseProgress(phase);
  }

  const averageProgressPct =
    posts.length === 0 ? 0 : Math.round(progressSum / posts.length);

  return { phases, averageProgressPct };
}

function formatProgressSummary(phases: QuincenaPhaseBreakdown): string {
  const parts: string[] = [];

  if (phases.aprobado > 0) {
    parts.push(
      `${phases.aprobado} aprobado${phases.aprobado === 1 ? "" : "s"}`
    );
  }
  if (phases.en_revision > 0) {
    parts.push(
      `${phases.en_revision} en revisión`
    );
  }
  if (phases.brief_listo > 0) {
    parts.push(
      `${phases.brief_listo} con brief listo`
    );
  }
  if (phases.contenido > 0) {
    parts.push(
      `${phases.contenido} en contenido`
    );
  }

  return parts.join(" · ");
}

function formatDaysUntil(label: string, daysUntil: number): string {
  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return overdue === 1
      ? `${label} venció ayer`
      : `${label} venció hace ${overdue} días`;
  }
  if (daysUntil === 0) return `${label} vence hoy`;
  if (daysUntil === 1) return `${label} vence mañana`;
  return `${label} vence en ${daysUntil} días`;
}

function cmWindowStatus(
  ctx: ReturnType<typeof getQuincenaContexts>[number],
  now: Date
): "active" | "tomorrow" | null {
  const windowStartDay = ctx.id === "Q2" ? 10 : 25;
  const windowEndDay = ctx.id === "Q2" ? 15 : 30;
  const start = dateInMonth(ctx.prepYear, ctx.prepMonth, windowStartDay);
  const end = dateInMonth(
    ctx.prepYear,
    ctx.prepMonth,
    Math.min(windowEndDay, lastDayOfMonth(ctx.prepYear, ctx.prepMonth))
  );

  const today = startOfDay(now);
  if (today >= startOfDay(start) && today <= startOfDay(end)) {
    return "active";
  }

  const daysUntilStart = daysBetween(now, start);
  if (daysUntilStart === 1) return "tomorrow";
  return null;
}

function getMilestone(
  board: QuincenaBoardSnapshot,
  roles: MemberRole[],
  now: Date
): string {
  const ctx = getQuincenaContexts(now).find(
    (item) =>
      item.id === board.quincena &&
      item.publishYear === board.publishYear &&
      item.publishMonth === board.publishMonth
  );

  if (!ctx) return "";
  if (board.posts.length === 0) return "Sin posts programados";
  if (allPostsHandedToCm(board.posts)) {
    return "Entregado al community manager";
  }

  const roleSet = new Set(roles);
  const uploaded = creatorHasUploadedGrids(board.posts);
  const cmStatus = cmWindowStatus(ctx, now);

  if ((roleSet.has("community_manager") || roleSet.has("admin")) && cmStatus === "active") {
    return "Ventana de revisión CM abierta";
  }
  if ((roleSet.has("community_manager") || roleSet.has("admin")) && cmStatus === "tomorrow") {
    return "Revisión CM abre mañana";
  }

  if (roleSet.has("designer") && uploaded) {
    const day = ctx.id === "Q2" ? 10 : 25;
    const daysUntil = daysBetween(
      now,
      dateInMonth(ctx.prepYear, ctx.prepMonth, day)
    );
    return formatDaysUntil("Diseño", daysUntil);
  }

  if (roleSet.has("creator") && !uploaded) {
    const day = ctx.id === "Q2" ? 5 : 20;
    const daysUntil = daysBetween(
      now,
      dateInMonth(ctx.prepYear, ctx.prepMonth, day)
    );
    return formatDaysUntil("Contenido", daysUntil);
  }

  if (uploaded) {
    const day = ctx.id === "Q2" ? 10 : 25;
    const daysUntil = daysBetween(
      now,
      dateInMonth(ctx.prepYear, ctx.prepMonth, day)
    );
    return formatDaysUntil("Diseño", daysUntil);
  }

  const day = ctx.id === "Q2" ? 5 : 20;
  const daysUntil = daysBetween(
    now,
    dateInMonth(ctx.prepYear, ctx.prepMonth, day)
  );
  return formatDaysUntil("Contenido", daysUntil);
}

function milestoneSortKey(board: QuincenaBoardSnapshot, now: Date): number {
  const ctx = getQuincenaContexts(now).find(
    (item) =>
      item.id === board.quincena &&
      item.publishYear === board.publishYear &&
      item.publishMonth === board.publishMonth
  );
  if (!ctx) return Number.MAX_SAFE_INTEGER;

  const uploaded = creatorHasUploadedGrids(board.posts);
  const day = uploaded ? (ctx.id === "Q2" ? 10 : 25) : ctx.id === "Q2" ? 5 : 20;
  return daysBetween(now, dateInMonth(ctx.prepYear, ctx.prepMonth, day));
}

function isActiveQuincenaBoard(board: QuincenaBoardSnapshot, now: Date): boolean {
  return getQuincenaContexts(now).some(
    (ctx) =>
      ctx.id === board.quincena &&
      ctx.publishYear === board.publishYear &&
      ctx.publishMonth === board.publishMonth
  );
}

function pickBoardsForDisplay(
  boards: QuincenaBoardSnapshot[],
  now: Date,
  options: { maxPerOrg?: number; max?: number }
): QuincenaBoardSnapshot[] {
  const active = boards
    .filter((board) => isActiveQuincenaBoard(board, now) && board.posts.length > 0)
    .sort((a, b) => {
      const orgCmp = a.orgName.localeCompare(b.orgName, "es");
      if (orgCmp !== 0) return orgCmp;
      return milestoneSortKey(a, now) - milestoneSortKey(b, now);
    });

  if (options.maxPerOrg) {
    const byOrg = new Map<string, QuincenaBoardSnapshot[]>();
    for (const board of active) {
      const list = byOrg.get(board.orgId) ?? [];
      if (list.length < options.maxPerOrg) {
        list.push(board);
        byOrg.set(board.orgId, list);
      }
    }
    const perOrg = [...byOrg.values()].flat();
    return options.max ? perOrg.slice(0, options.max) : perOrg;
  }

  return options.max ? active.slice(0, options.max) : active;
}

function boardToCard(
  board: QuincenaBoardSnapshot,
  roles: MemberRole[],
  now: Date
): QuincenaProgressCard {
  const { phases, averageProgressPct } = analyzeQuincenaPosts(board.posts);

  return {
    id: `${board.orgId}-${board.quincena}-${board.publishYear}-${board.publishMonth}`,
    orgId: board.orgId,
    orgName: board.orgName,
    title: formatBoardTitle(board),
    totalCount: board.posts.length,
    phases,
    averageProgressPct,
    summaryText: formatProgressSummary(phases),
    milestone: getMilestone(board, roles, now),
    calendarHref: `/org/${board.orgId}/calendario`,
  };
}

export function buildQuincenaProgressCards(options: {
  boards: QuincenaBoardSnapshot[];
  roles: MemberRole[];
  now?: Date;
  maxPerOrg?: number;
  max?: number;
}): QuincenaProgressCard[] {
  const { boards, roles, now = new Date(), maxPerOrg, max } = options;

  return pickBoardsForDisplay(boards, now, { maxPerOrg, max }).map((board) =>
    boardToCard(board, roles, now)
  );
}
