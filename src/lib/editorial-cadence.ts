import type { MemberRole } from "@/lib/types";
import type { QuincenaBoardSnapshot } from "@/lib/editorial-quincena";
import {
  allPostsHandedToCm,
  allPostsInReview,
  creatorHasUploadedGrids,
} from "@/lib/editorial-quincena";

export type QuincenaId = "Q1" | "Q2";

export type EditorialAlertSeverity =
  | "critical"
  | "warning"
  | "active"
  | "info"
  | "clear";

export interface EditorialCadenceAlert {
  id: string;
  severity: EditorialAlertSeverity;
  message: string;
  quincena: QuincenaId;
  role: MemberRole;
  daysUntil: number;
  sortOrder: number;
}

const INTERNAL_ROLES: MemberRole[] = [
  "creator",
  "designer",
  "community_manager",
  "admin",
];

const SEVERITY_ORDER: Record<EditorialAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  active: 2,
  info: 3,
  clear: 4,
};

const QUINCENA_LABEL: Record<QuincenaId, string> = {
  Q1: "Q1 (1–15)",
  Q2: "Q2 (16–fin)",
};

interface QuincenaContext {
  id: QuincenaId;
  publishMonth: number;
  publishYear: number;
  prepMonth: number;
  prepYear: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateInMonth(year: number, month: number, day: number): Date {
  const clamped = Math.min(day, lastDayOfMonth(year, month));
  return new Date(year, month, clamped);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function monthLabel(year: number, month: number): string {
  const label = new Intl.DateTimeFormat("es", { month: "long" }).format(
    new Date(year, month, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getQuincenaContexts(now: Date): QuincenaContext[] {
  const year = now.getFullYear();
  const month = now.getMonth();

  const q2Current: QuincenaContext = {
    id: "Q2",
    publishMonth: month,
    publishYear: year,
    prepMonth: month,
    prepYear: year,
  };

  const q1NextMonth = month === 11 ? 0 : month + 1;
  const q1NextYear = month === 11 ? year + 1 : year;
  const q1Upcoming: QuincenaContext = {
    id: "Q1",
    publishMonth: q1NextMonth,
    publishYear: q1NextYear,
    prepMonth: month,
    prepYear: year,
  };

  const q1Current: QuincenaContext = {
    id: "Q1",
    publishMonth: month,
    publishYear: year,
    prepMonth: month === 0 ? 11 : month - 1,
    prepYear: month === 0 ? year - 1 : year,
  };

  const contexts = [q2Current, q1Upcoming];

  const day = now.getDate();
  if (day <= 15) {
    contexts.push(q1Current);
  }

  return contexts;
}

function severityForDays(daysUntil: number, inWindow = false): EditorialAlertSeverity | null {
  if (inWindow) return "active";
  if (daysUntil < 0) return "critical";
  if (daysUntil === 0) return "critical";
  if (daysUntil <= 3) return "warning";
  if (daysUntil <= 7) return "info";
  return null;
}

function greet(firstName: string | undefined): string {
  return firstName?.trim() ? `${firstName.trim()}, ` : "";
}

function deadlinePhrase(daysUntil: number, deadline: Date): string {
  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return overdue === 1
      ? `venció ayer (${formatShortDate(deadline)})`
      : `venció hace ${overdue} días (${formatShortDate(deadline)})`;
  }
  if (daysUntil === 0) return `vence hoy (${formatShortDate(deadline)})`;
  if (daysUntil === 1) return `vence mañana (${formatShortDate(deadline)})`;
  return `vence en ${daysUntil} días (${formatShortDate(deadline)})`;
}

function orgPrefix(orgName: string, multiBrand: boolean): string {
  return multiBrand ? `${orgName}: ` : "";
}

function isInDesignerDeliveryWindow(ctx: QuincenaContext, now: Date): boolean {
  const creatorDay = ctx.id === "Q2" ? 5 : 20;
  const designerDay = ctx.id === "Q2" ? 10 : 25;
  const creatorDeadline = dateInMonth(ctx.prepYear, ctx.prepMonth, creatorDay);
  const designerDeadline = dateInMonth(ctx.prepYear, ctx.prepMonth, designerDay);
  const today = startOfDay(now);
  return (
    today >= startOfDay(creatorDeadline) &&
    today <= startOfDay(designerDeadline)
  );
}

function shouldSuppressProductionAlerts(board: QuincenaBoardSnapshot): boolean {
  if (board.posts.length === 0) return false;
  return allPostsInReview(board.posts) || allPostsHandedToCm(board.posts);
}

function boardsForContext(
  snapshots: QuincenaBoardSnapshot[],
  ctx: QuincenaContext,
  orgId?: string
): QuincenaBoardSnapshot[] {
  return snapshots.filter(
    (board) =>
      board.quincena === ctx.id &&
      board.publishYear === ctx.publishYear &&
      board.publishMonth === ctx.publishMonth &&
      (!orgId || board.orgId === orgId)
  );
}

function creatorAlert(
  ctx: QuincenaContext,
  board: QuincenaBoardSnapshot,
  now: Date,
  firstName: string | undefined,
  multiBrand: boolean
): EditorialCadenceAlert | null {
  if (shouldSuppressProductionAlerts(board)) return null;
  if (creatorHasUploadedGrids(board.posts)) return null;

  const deadlineDay = ctx.id === "Q2" ? 5 : 20;
  const deadline = dateInMonth(ctx.prepYear, ctx.prepMonth, deadlineDay);
  const daysUntil = daysBetween(now, deadline);
  const severity = severityForDays(daysUntil);
  if (!severity) return null;

  const publishLabel = monthLabel(ctx.publishYear, ctx.publishMonth);
  const prefix = orgPrefix(board.orgName, multiBrand);
  const message =
    ctx.id === "Q2"
      ? `${prefix}${greet(firstName)}la entrega de contenido para ${QUINCENA_LABEL.Q2} de ${publishLabel} ${deadlinePhrase(daysUntil, deadline)}. Diseño necesita la grilla lista.`
      : `${prefix}${greet(firstName)}la entrega de contenido para ${QUINCENA_LABEL.Q1} de ${publishLabel} ${deadlinePhrase(daysUntil, deadline)}. Publicaciones arrancan el 1.`;

  return {
    id: `creator-${board.orgId}-${ctx.id}-${ctx.publishYear}-${ctx.publishMonth}`,
    severity,
    message,
    quincena: ctx.id,
    role: "creator",
    daysUntil,
    sortOrder: daysUntil,
  };
}

function designerAlert(
  ctx: QuincenaContext,
  board: QuincenaBoardSnapshot,
  now: Date,
  firstName: string | undefined,
  multiBrand: boolean
): EditorialCadenceAlert | null {
  if (shouldSuppressProductionAlerts(board)) return null;
  if (!creatorHasUploadedGrids(board.posts)) return null;

  const deadlineDay = ctx.id === "Q2" ? 10 : 25;
  const deadline = dateInMonth(ctx.prepYear, ctx.prepMonth, deadlineDay);
  const daysUntil = daysBetween(now, deadline);
  const severity = severityForDays(daysUntil);
  if (!severity) return null;

  const publishLabel = monthLabel(ctx.publishYear, ctx.publishMonth);
  const publishDay = ctx.id === "Q2" ? "15" : "1";
  const prefix = orgPrefix(board.orgName, multiBrand);
  const message = `${prefix}${greet(firstName)}la entrega de diseño para ${QUINCENA_LABEL[ctx.id]} de ${publishLabel} ${deadlinePhrase(daysUntil, deadline)}. Publicaciones arrancan el ${publishDay}.`;

  return {
    id: `designer-${board.orgId}-${ctx.id}-${ctx.publishYear}-${ctx.publishMonth}`,
    severity,
    message,
    quincena: ctx.id,
    role: "designer",
    daysUntil,
    sortOrder: daysUntil,
  };
}

function creatorMissingGridsAlert(
  ctx: QuincenaContext,
  board: QuincenaBoardSnapshot,
  now: Date,
  multiBrand: boolean
): EditorialCadenceAlert | null {
  if (!isInDesignerDeliveryWindow(ctx, now)) return null;
  if (creatorHasUploadedGrids(board.posts)) return null;
  if (shouldSuppressProductionAlerts(board)) return null;

  const designerDay = ctx.id === "Q2" ? 10 : 25;
  const designerDeadline = dateInMonth(ctx.prepYear, ctx.prepMonth, designerDay);
  const daysUntil = daysBetween(now, designerDeadline);
  const creatorName = board.creatorName || "El creador de contenido";
  const publishLabel = monthLabel(ctx.publishYear, ctx.publishMonth);
  const prefix = orgPrefix(board.orgName, multiBrand);

  return {
    id: `creator-missing-${board.orgId}-${ctx.id}-${ctx.publishYear}-${ctx.publishMonth}`,
    severity: daysUntil <= 2 ? "critical" : "warning",
    message: `${prefix}${creatorName} no ha subido las grillas de ${QUINCENA_LABEL[ctx.id]} de ${publishLabel}.`,
    quincena: ctx.id,
    role: "designer",
    daysUntil,
    sortOrder: daysUntil - 0.5,
  };
}

function communityManagerAlert(
  ctx: QuincenaContext,
  board: QuincenaBoardSnapshot,
  now: Date,
  firstName: string | undefined,
  multiBrand: boolean
): EditorialCadenceAlert | null {
  if (board.posts.length === 0) return null;
  if (allPostsHandedToCm(board.posts) && !board.posts.some((p) => p.status === "review")) {
    return null;
  }

  const windowStartDay = ctx.id === "Q2" ? 10 : 25;
  const windowEndDay = ctx.id === "Q2" ? 15 : 30;
  const start = dateInMonth(ctx.prepYear, ctx.prepMonth, windowStartDay);
  const end = dateInMonth(
    ctx.prepYear,
    ctx.prepMonth,
    Math.min(windowEndDay, lastDayOfMonth(ctx.prepYear, ctx.prepMonth))
  );

  const today = startOfDay(now);
  const inWindow = today >= startOfDay(start) && today <= startOfDay(end);
  const daysUntilStart = daysBetween(now, start);
  const daysUntilEnd = daysBetween(now, end);

  let severity: EditorialAlertSeverity | null = null;
  if (inWindow) {
    severity = "active";
  } else if (daysUntilStart >= 0 && daysUntilStart <= 1) {
    severity = "info";
  } else {
    return null;
  }

  const publishLabel = monthLabel(ctx.publishYear, ctx.publishMonth);
  const range = `${formatShortDate(start)}–${formatShortDate(end)}`;
  const prefix = orgPrefix(board.orgName, multiBrand);
  const message = inWindow
    ? `${prefix}${greet(firstName)}estás en ventana de revisión CM para ${QUINCENA_LABEL[ctx.id]} de ${publishLabel} (${range}). Revisa las grillas antes de que salgan al aire.`
    : `${prefix}${greet(firstName)}mañana abre la revisión CM para ${QUINCENA_LABEL[ctx.id]} de ${publishLabel} (${range}).`;

  return {
    id: `cm-${board.orgId}-${ctx.id}-${ctx.publishYear}-${ctx.publishMonth}`,
    severity,
    message,
    quincena: ctx.id,
    role: "community_manager",
    daysUntil: inWindow ? daysUntilEnd : daysUntilStart,
    sortOrder: inWindow ? -1 : daysUntilStart,
  };
}

function adminSummaryAlert(
  alerts: EditorialCadenceAlert[],
  firstName?: string,
  brandCount?: number
): EditorialCadenceAlert | null {
  if (alerts.length === 0) return null;

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;
  const active = alerts.filter((a) => a.severity === "active").length;

  if (critical === 0 && warning === 0 && active === 0) return null;

  const brands =
    brandCount && brandCount > 1 ? ` en tus ${brandCount} marcas` : "";
  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} fecha${critical > 1 ? "s" : ""} crítica${critical > 1 ? "s" : ""}`);
  if (warning > 0) parts.push(`${warning} próxima${warning > 1 ? "s" : ""}`);
  if (active > 0) parts.push(`${active} en revisión`);

  return {
    id: "admin-summary",
    severity: critical > 0 ? "critical" : warning > 0 ? "warning" : "active",
    message: `${greet(firstName)}hay hitos editoriales${brands}: ${parts.join(", ")}.`,
    quincena: alerts[0].quincena,
    role: "admin",
    daysUntil: Math.min(...alerts.map((a) => a.daysUntil)),
    sortOrder: -10,
  };
}

export function collectEditorialRoles(
  role: MemberRole,
  extraRoles: MemberRole[] = []
): MemberRole[] {
  const roles = new Set<MemberRole>([role, ...extraRoles]);
  return [...roles].filter((r) => INTERNAL_ROLES.includes(r));
}

export function getEditorialCadenceAlerts(options: {
  roles: MemberRole[];
  firstName?: string;
  brandCount?: number;
  quincenaBoards?: QuincenaBoardSnapshot[];
  orgId?: string;
  currentUserId?: string;
  now?: Date;
  maxAlerts?: number;
}): EditorialCadenceAlert[] {
  const {
    roles,
    firstName,
    brandCount = 1,
    quincenaBoards = [],
    orgId,
    currentUserId,
    now = new Date(),
    maxAlerts = 3,
  } = options;
  const contexts = getQuincenaContexts(now);
  const alerts: EditorialCadenceAlert[] = [];
  const roleSet = new Set(roles);
  const multiBrand = !orgId && brandCount > 1;

  const hasCreator = roleSet.has("creator");
  const hasDesigner = roleSet.has("designer");
  const hasCm = roleSet.has("community_manager");
  const isAdminOnly =
    roleSet.has("admin") && !hasCreator && !hasDesigner && !hasCm;

  for (const ctx of contexts) {
    const boards = boardsForContext(quincenaBoards, ctx, orgId);
    if (boards.length === 0) continue;

    for (const board of boards) {
      const isSelfCreator =
        !!currentUserId &&
        !!board.creatorUserId &&
        currentUserId === board.creatorUserId;

      if (hasCreator) {
        const alert = creatorAlert(ctx, board, now, firstName, multiBrand);
        if (alert) alerts.push(alert);
      }

      if (hasDesigner) {
        const missing = creatorMissingGridsAlert(ctx, board, now, multiBrand);
        if (missing && !isSelfCreator) {
          alerts.push(missing);
        } else {
          const alert = designerAlert(ctx, board, now, firstName, multiBrand);
          if (alert) alerts.push(alert);
        }
      } else if (hasCm || roleSet.has("admin")) {
        const missing = creatorMissingGridsAlert(ctx, board, now, multiBrand);
        if (missing) alerts.push(missing);
      }

      if (hasCm) {
        const alert = communityManagerAlert(ctx, board, now, firstName, multiBrand);
        if (alert) alerts.push(alert);
      }
    }
  }

  if (isAdminOnly) {
    const summary = adminSummaryAlert(
      contexts.flatMap((ctx) => {
        const boards = boardsForContext(quincenaBoards, ctx, orgId);
        return boards.flatMap((board) => {
          const items: EditorialCadenceAlert[] = [];
          const missing = creatorMissingGridsAlert(ctx, board, now, multiBrand);
          const c = creatorAlert(ctx, board, now, firstName, multiBrand);
          const d = designerAlert(ctx, board, now, firstName, multiBrand);
          const cm = communityManagerAlert(ctx, board, now, firstName, multiBrand);
          if (missing) items.push(missing);
          if (c) items.push(c);
          if (d) items.push(d);
          if (cm) items.push(cm);
          return items;
        });
      }),
      firstName,
      brandCount
    );
    if (summary) alerts.push(summary);
  }

  const unique = new Map<string, EditorialCadenceAlert>();
  for (const alert of alerts) {
    const existing = unique.get(alert.id);
    if (!existing || alert.sortOrder < existing.sortOrder) {
      unique.set(alert.id, alert);
    }
  }

  return [...unique.values()]
    .sort((a, b) => {
      const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sev !== 0) return sev;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, maxAlerts);
}

export function getEditorialCadenceClearMessage(firstName?: string): string {
  return `${greet(firstName)}todo al día en el calendario editorial. No hay entregas ni revisiones urgentes esta semana.`;
}
