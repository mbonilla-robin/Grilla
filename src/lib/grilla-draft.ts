import type { GrillaPeriod, GrillaSlot, QuincenaId } from "@/lib/grilla-slot-utils";

export interface GrillaDraftPayload {
  slots: GrillaSlot[];
  selectedId: string | null;
  month: string;
  weekStart: string;
  quincena: QuincenaId;
  creatorId: string;
  designerId: string;
  communityManagerId: string;
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
