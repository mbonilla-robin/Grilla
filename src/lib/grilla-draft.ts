import type { GrillaPeriod, GrillaSlot, QuincenaId } from "@/lib/grilla-slot-utils";

export interface GrillaDraftPayload {
  slots: GrillaSlot[];
  selectedId: string | null;
  month: string;
  weekStart: string;
  quincena: QuincenaId;
  /** Sticky content author — set on first draft save, never overwritten by later editors/publishers. */
  authorId?: string;
  creatorId: string;
  designerId: string;
  communityManagerId: string;
}

/** Prefer explicit creator pick, then sole-creator default, then sticky draft author. */
export function resolveDraftContentCreatorId(opts: {
  creatorId?: string | null;
  authorId?: string | null;
  draftUpdatedBy?: string | null;
  defaultCreatorId?: string | null;
  fallbackUserId: string;
}): string {
  return (
    opts.creatorId ||
    opts.defaultCreatorId ||
    opts.authorId ||
    opts.draftUpdatedBy ||
    opts.fallbackUserId
  );
}

export function buildGrillaPeriodKey(
  period: GrillaPeriod,
  opts: { month: string; weekStart: string; quincena: QuincenaId }
): string {
  if (period === "week") return opts.weekStart;
  if (period === "quincena") return `${opts.month}-${opts.quincena}`;
  return opts.month;
}

export interface GrillaDraftRecord {
  id: string;
  organization_id: string;
  period: GrillaPeriod;
  period_key: string;
  payload: GrillaDraftPayload;
  updated_by: string;
  updated_at: string;
  updated_by_name: string | null;
}
