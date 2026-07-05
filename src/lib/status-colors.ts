import type { PostStatus, TaskStatus } from "@/lib/types";

/** Tarjetas de tarea: blanco → amarillo claro → amarillo → amarillo oscuro */
export const taskStatusCardStyles: Record<
  TaskStatus,
  { card: string; progress: string; pill: string }
> = {
  contenido: {
    card: "border-border bg-white hover:border-brand/30",
    progress: "bg-neutral-200",
    pill: "bg-white text-foreground border-border",
  },
  brief_listo: {
    card: "border-brand/30 bg-brand-muted hover:border-brand/50",
    progress: "bg-brand/40",
    pill: "bg-brand-muted text-foreground border-brand/40",
  },
  en_revision: {
    card: "border-brand/50 bg-brand hover:border-brand-dark/50",
    progress: "bg-brand-foreground/75",
    pill: "bg-brand text-brand-foreground border-brand-dark/30",
  },
  aprobado: {
    card: "border-brand-dark bg-brand-dark hover:border-foreground/25",
    progress: "bg-brand-foreground/90",
    pill: "bg-brand-dark text-brand-foreground border-brand-dark",
  },
};

/** Paleta unificada: contenido (blanco) → brief listo → en revisión → aprobado */
export const statusBadgeStyles: Record<PostStatus, string> = {
  draft: "bg-white text-foreground border border-border",
  brief_ready: "bg-brand-muted text-foreground border border-brand/40",
  in_design: "bg-white text-foreground border border-border",
  review: "bg-brand text-brand-foreground",
  approved: "bg-brand-dark text-brand-foreground",
  scheduled: "bg-brand-dark text-brand-foreground",
  published: "bg-brand-dark text-brand-foreground",
};

export const statusDotStyles: Record<PostStatus, string> = {
  draft: "bg-white border border-border",
  brief_ready: "bg-brand-muted border border-brand/40",
  in_design: "bg-white border border-border",
  review: "bg-brand",
  approved: "bg-brand-dark",
  scheduled: "bg-brand-dark",
  published: "bg-brand-dark",
};

export const statusCalendarStyles: Record<string, string> = {
  draft: "bg-white text-foreground border border-border",
  brief_ready: "bg-brand-muted text-foreground border border-brand/40",
  in_design: "bg-white text-foreground border border-border",
  review: "bg-brand text-brand-foreground",
  approved: "bg-brand-dark text-brand-foreground",
  scheduled: "bg-brand-dark text-brand-foreground",
  published: "bg-brand-dark text-brand-foreground",
};
