"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, X } from "lucide-react";
import {
  getEditorialCadenceAlerts,
  getEditorialCadenceClearMessage,
  type EditorialAlertSeverity,
  type EditorialCadenceAlert,
} from "@/lib/editorial-cadence";
import type { QuincenaBoardSnapshot } from "@/lib/editorial-quincena";
import type { MemberRole } from "@/lib/types";
import { homeStaggerDelay } from "@/lib/home-motion";
import { cn } from "@/lib/utils";

interface EditorialCadenceAlertsProps {
  firstName?: string;
  roles: MemberRole[];
  quincenaBoards?: QuincenaBoardSnapshot[];
  orgId?: string;
  currentUserId?: string;
  brandCount?: number;
  urgentTaskCount?: number;
  pendingTaskCount?: number;
  storageKey?: string;
}

const SEVERITY_ICONS: Record<
  EditorialAlertSeverity,
  typeof AlertCircle
> = {
  critical: AlertCircle,
  warning: CalendarClock,
  active: CalendarClock,
  info: CalendarClock,
  clear: CheckCircle2,
};

function buildTaskAlert(
  urgentTaskCount: number,
  pendingTaskCount: number,
  firstName?: string
): EditorialCadenceAlert | null {
  const greet = firstName?.trim() ? `${firstName.trim()}, ` : "";

  if (urgentTaskCount > 0) {
    return {
      id: "tasks-urgent",
      severity: "warning",
      message:
        urgentTaskCount === 1
          ? `${greet}tienes 1 tarea urgente en los próximos días.`
          : `${greet}tienes ${urgentTaskCount} tareas urgentes en los próximos días.`,
      quincena: "Q1",
      role: "creator",
      daysUntil: 0,
      sortOrder: 0,
    };
  }

  if (pendingTaskCount > 0) {
    return {
      id: "tasks-pending",
      severity: "info",
      message:
        pendingTaskCount === 1
          ? `${greet}tienes 1 tarea pendiente.`
          : `${greet}tienes ${pendingTaskCount} tareas pendientes.`,
      quincena: "Q1",
      role: "creator",
      daysUntil: 7,
      sortOrder: 7,
    };
  }

  return null;
}

const HIGHLIGHT_PATTERN =
  /^(?:\d+ tareas? (?:urgentes?|pendientes?)|Q[12] \(1–15\)|Q[12] \(16–fin\)|venció hace \d+ días(?: \([^)]+\))?|vence en \d+ días(?: \([^)]+\))?|vence hoy(?: \([^)]+\))?|vence mañana(?: \([^)]+\))?|venció ayer(?: \([^)]+\))?|ventana de revisión CM|\d+ fecha(?:s)? crítica(?:s)?|no ha subido las grillas)$/;

const MESSAGE_HIGHLIGHT_RE =
  /(\d+ tareas? (?:urgentes?|pendientes?)|Q[12] \(1–15\)|Q[12] \(16–fin\)|venció hace \d+ días(?: \([^)]+\))?|vence en \d+ días(?: \([^)]+\))?|vence hoy(?: \([^)]+\))?|vence mañana(?: \([^)]+\))?|venció ayer(?: \([^)]+\))?|ventana de revisión CM|\d+ fecha(?:s)? crítica(?:s)?|no ha subido las grillas)/g;

function AlertMessage({ message }: { message: string }) {
  const orgMatch = message.match(/^([^:]{1,32}):\s([\s\S]*)$/);
  const body = orgMatch ? orgMatch[2] : message;
  const parts = body.split(MESSAGE_HIGHLIGHT_RE);

  return (
    <>
      {orgMatch ? (
        <span className="font-medium text-foreground">{orgMatch[1]}: </span>
      ) : null}
      {parts.map((part, index) =>
        HIGHLIGHT_PATTERN.test(part) ? (
          <strong key={index} className="font-medium text-foreground">
            {part}
          </strong>
        ) : (
          <span key={index} className="text-muted">
            {part}
          </span>
        )
      )}
    </>
  );
}

function AlertPill({
  alert,
  onDismiss,
  grouped,
  index,
  exiting,
}: {
  alert: EditorialCadenceAlert;
  onDismiss: (id: string) => void;
  grouped?: boolean;
  index?: number;
  exiting?: boolean;
}) {
  const Icon = SEVERITY_ICONS[alert.severity];

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-3.5 py-3",
        !grouped && "rounded-xl border border-border/80 bg-surface shadow-sm",
        !exiting && "home-animate-in",
        exiting && "home-alert-exit"
      )}
      style={
        index !== undefined && !exiting
          ? { animationDelay: homeStaggerDelay(index, 0.08, 0.07) }
          : undefined
      }
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100">
        <Icon size={15} strokeWidth={1.75} className="text-muted" aria-hidden />
      </div>
      <p className="min-w-0 flex-1 pt-1 text-[13px] leading-snug">
        <AlertMessage message={alert.message} />
      </p>
      <button
        type="button"
        onClick={() => onDismiss(alert.id)}
        className={cn(
          "shrink-0 rounded-md p-1 text-muted/40 transition-colors",
          "hover:bg-neutral-100 hover:text-muted"
        )}
        aria-label="Cerrar alerta"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function EditorialCadenceAlerts({
  firstName,
  roles,
  quincenaBoards = [],
  orgId,
  currentUserId,
  brandCount,
  urgentTaskCount = 0,
  pendingTaskCount = 0,
  storageKey = "editorial-cadence-dismissed",
}: EditorialCadenceAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const cadenceAlerts = useMemo(
    () =>
      getEditorialCadenceAlerts({
        roles,
        firstName,
        brandCount,
        quincenaBoards,
        orgId,
        currentUserId,
      }),
    [roles, firstName, brandCount, quincenaBoards, orgId, currentUserId]
  );

  const taskAlert = useMemo(
    () => buildTaskAlert(urgentTaskCount, pendingTaskCount, firstName),
    [urgentTaskCount, pendingTaskCount, firstName]
  );

  const allAlerts = useMemo(() => {
    const combined = taskAlert ? [taskAlert, ...cadenceAlerts] : cadenceAlerts;
    if (combined.length > 0) return combined.slice(0, 3);

    return [
      {
        id: "cadence-clear",
        severity: "clear" as const,
        message: getEditorialCadenceClearMessage(firstName),
        quincena: "Q1" as const,
        role: "creator" as const,
        daysUntil: 99,
        sortOrder: 99,
      },
    ];
  }, [taskAlert, cadenceAlerts, firstName]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setDismissedIds(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { date: string; ids: string[] };
      setDismissedIds(parsed.date === today ? new Set(parsed.ids) : new Set());
    } catch {
      setDismissedIds(new Set());
    }
  }, [storageKey]);

  function handleDismiss(id: string) {
    if (exitingIds.has(id)) return;

    setExitingIds((prev) => new Set(prev).add(id));

    window.setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        localStorage.setItem(
          storageKey,
          JSON.stringify({ date: today, ids: [...next] })
        );
        return next;
      });
      setExitingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }, 260);
  }

  const visible = allAlerts.filter(
    (a) => !dismissedIds.has(a.id) || exitingIds.has(a.id)
  );
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        visible.length > 1
          ? "overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm divide-y divide-border/70"
          : "flex flex-col"
      )}
    >
      {visible.map((alert, index) => (
        <AlertPill
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
          grouped={visible.length > 1}
          index={index}
          exiting={exitingIds.has(alert.id)}
        />
      ))}
    </div>
  );
}
