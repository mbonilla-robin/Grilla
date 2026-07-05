"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CalendarDays, Sparkles, Plus } from "lucide-react";
import { createPost, getFertileRecommendations } from "@/lib/actions";
import type { CatalogEvent } from "@/lib/calendar-types";
import { catalogShortName } from "@/lib/calendar-types";
import {
  fertileEventDateLabel,
  fertileScheduledAt,
  type PostRecommendation,
} from "@/lib/fertile-recommendations";
import { FORMAT_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FertileEventModalProps {
  event: CatalogEvent;
  year: number;
  orgId?: string;
  onClose: () => void;
}

function RecommendationCard({
  recommendation,
  scheduledAt,
  onCreated,
}: {
  recommendation: PostRecommendation;
  scheduledAt: string;
  onCreated: (postId: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const result = await createPost(recommendation.orgId, {
      title: recommendation.title,
      format: recommendation.format,
      pillar: recommendation.pillar,
      copy: recommendation.copy,
      scheduled_at: scheduledAt,
    });
    setLoading(false);

    if (result.data?.id) {
      onCreated(result.data.id as string);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{recommendation.orgName}</p>
          <p className="text-sm text-muted mt-1">{recommendation.rationale}</p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
          {FORMAT_LABELS[recommendation.format]}
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed border-l-2 border-border pl-3">
        {recommendation.copy}
      </p>

      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Plus size={13} />
        {loading ? "Creando…" : "Crear borrador"}
      </button>
    </div>
  );
}

export function FertileEventModal({
  event,
  year,
  orgId,
  onClose,
}: FertileEventModalProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<PostRecommendation[]>(
    []
  );
  const [loadingRecs, setLoadingRecs] = useState(true);

  const dateLabel = fertileEventDateLabel(event, year);
  const scheduledAt = fertileScheduledAt(event, year);

  useEffect(() => {
    let cancelled = false;
    setLoadingRecs(true);

    getFertileRecommendations(event.id, orgId ? { orgId } : undefined)
      .then((recs) => {
        if (!cancelled) {
          setRecommendations(recs);
          setLoadingRecs(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecommendations([]);
          setLoadingRecs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [event.id, orgId]);

  function handleCreated(recOrgId: string, postId: string) {
    onClose();
    router.push(`/org/${recOrgId}/grilla/${postId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-surface rounded-xl shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border"
                  style={{
                    borderColor: `${event.catalog_color}40`,
                    backgroundColor: `${event.catalog_color}12`,
                    color: event.catalog_color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: event.catalog_color }}
                  />
                  {catalogShortName(event.catalog_name)}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{event.name}</h2>
              <p className="text-sm text-muted capitalize mt-0.5">{dateLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-neutral-100 text-muted shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {event.description && (
            <div className="flex gap-3 rounded-lg bg-neutral-50 p-3">
              <CalendarDays size={16} className="text-muted shrink-0 mt-0.5" />
              <p className="text-sm text-muted leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-muted" />
              <h3 className="text-sm font-medium">Ideas de contenido</h3>
            </div>

            {loadingRecs ? (
              <p className="text-sm text-muted text-center py-6">
                Buscando ideas…
              </p>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.orgId}
                    recommendation={rec}
                    scheduledAt={scheduledAt}
                    onCreated={(postId) => handleCreated(rec.orgId, postId)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted rounded-lg border border-dashed border-border p-4 text-center">
                No encontramos organizaciones con este calendario. Revisa las
                suscripciones en el calendario de cada marca.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SelectedFertileEvent {
  event: CatalogEvent;
  year: number;
}

export function useFertileEventModal(orgId?: string) {
  const [selected, setSelected] = useState<SelectedFertileEvent | null>(null);

  const modal = selected ? (
    <FertileEventModal
      event={selected.event}
      year={selected.year}
      orgId={orgId}
      onClose={() => setSelected(null)}
    />
  ) : null;

  function openEvent(event: CatalogEvent, year: number) {
    setSelected({ event, year });
  }

  return { modal, openEvent };
}

export function FertileBadgeButton({
  event,
  size = "sm",
  onClick,
}: {
  event: CatalogEvent;
  size?: "sm" | "md";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium truncate max-w-full hover:opacity-80 transition-opacity text-left",
        size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"
      )}
      style={{
        backgroundColor: `${event.catalog_color}18`,
        color: event.catalog_color,
      }}
      title={`${event.name} · ${event.catalog_name}`}
    >
      <CalendarDays size={size === "sm" ? 10 : 12} className="shrink-0" />
      <span className="truncate">{event.name}</span>
    </button>
  );
}
