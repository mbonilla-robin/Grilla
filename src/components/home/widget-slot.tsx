"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { formatPostLabel } from "@/lib/post-display";
import { PendientesList } from "./pendientes-list";
import { type TaskWithPost } from "@/lib/task-due";
import { getWidgetDef } from "@/lib/widget-config";
import { type Post } from "@/lib/types";
import type {
  HomeStats,
  HomePostPreview,
  OrgSnapshot,
} from "@/lib/home-data";
import { EmptyState } from "./home-ui";

export interface SlotWidgetData {
  orgId?: string;
  orgSnapshots?: OrgSnapshot[];
  stats?: HomeStats;
  upcomingPosts?: HomePostPreview[];
  reviewPosts?: HomePostPreview[];
  postsNeedingDesign?: HomePostPreview[];
  pendingPosts?: (Post & { organization?: { name: string; id: string } })[];
  tasks?: TaskWithPost[];
}

function RowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-neutral-50 -mx-1 px-1 rounded transition-colors"
    >
      {children}
    </Link>
  );
}

export function WidgetSlotCard({
  id,
  data,
}: {
  id: string;
  data: SlotWidgetData;
}) {
  const def = getWidgetDef(id);
  if (!def) return null;

  return (
    <section className="home-card flex flex-col min-h-[120px]">
      <header className="px-3 py-2 border-b border-border">
        <h2 className="text-xs font-medium">{def.label}</h2>
      </header>
      <div className="px-3 py-2 flex-1">
        <WidgetMenuSection id={id} data={data} />
      </div>
    </section>
  );
}

export function WidgetMenuSection({
  id,
  data,
}: {
  id: string;
  data: SlotWidgetData;
}) {
  return renderSlotContent(id, data);
}

function aggregateTotal(snapshots: OrgSnapshot[], key: keyof OrgSnapshot) {
  return snapshots.reduce((n, o) => n + (o[key] as number), 0);
}

function renderSlotContent(id: string, data: SlotWidgetData) {
  const snapshots = data.orgSnapshots ?? [];

  switch (id) {
    case "my_orgs":
      return snapshots.length ? (
        <div className="space-y-1.5">
          {snapshots.map((org) => (
            <Link
              key={org.id}
              href={`/org/${org.id}/home`}
              className="block rounded-md px-2 py-1.5 hover:bg-neutral-50 transition-colors"
            >
              <p className="text-xs font-medium">{org.name}</p>
              <p className="text-[10px] text-muted mt-0.5">
                {org.pending} pend. · {org.inReview} rev.
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState text="Sin organizaciones." />
      );

    case "pending_work": {
      const total = aggregateTotal(snapshots, "pending");
      if (total === 0) return <EmptyState text="Sin pendientes." />;
      return (
        <div>
          <p className="text-xl font-semibold tabular-nums mb-2">{total}</p>
          {snapshots
            .filter((o) => o.pending > 0)
            .map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.id}/grilla`}
                className="flex justify-between text-xs py-1 hover:underline"
              >
                <span className="truncate">{org.name}</span>
                <span className="text-muted shrink-0 ml-2">{org.pending}</span>
              </Link>
            ))}
        </div>
      );
    }

    case "in_review": {
      const total = aggregateTotal(snapshots, "inReview");
      if (total === 0) return <EmptyState text="Nada en revisión." />;
      return (
        <div>
          <p className="text-xl font-semibold tabular-nums mb-2">{total}</p>
          {snapshots
            .filter((o) => o.inReview > 0)
            .map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.id}/grilla`}
                className="flex justify-between text-xs py-1 hover:underline"
              >
                <span className="truncate">{org.name}</span>
                <span className="text-muted shrink-0 ml-2">{org.inReview}</span>
              </Link>
            ))}
        </div>
      );
    }

    case "needs_design": {
      const total = aggregateTotal(snapshots, "needsDesign");
      if (total === 0) return <EmptyState text="Todos tienen diseño." />;
      return (
        <div>
          <p className="text-xl font-semibold tabular-nums mb-2">{total}</p>
          {snapshots
            .filter((o) => o.needsDesign > 0)
            .map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.id}/grilla`}
                className="flex justify-between text-xs py-1 hover:underline"
              >
                <span className="truncate">{org.name}</span>
                <span className="text-muted shrink-0 ml-2">{org.needsDesign}</span>
              </Link>
            ))}
        </div>
      );
    }

    case "brand_pulse":
      return data.stats ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { n: data.stats.pending, l: "Pend." },
            { n: data.stats.inReview, l: "Rev." },
            { n: data.stats.needsDesign, l: "Diseño" },
            { n: data.stats.thisMonth, l: "Mes" },
            { n: data.stats.tasksOpen, l: "Tareas" },
          ].map((s) => (
            <div key={s.l} className="rounded bg-neutral-50 px-2 py-1.5 text-center">
              <p className="text-sm font-semibold tabular-nums">{s.n}</p>
              <p className="text-[9px] text-muted">{s.l}</p>
            </div>
          ))}
        </div>
      ) : null;

    case "calendar":
      return data.upcomingPosts?.length ? (
        <div>
          {data.upcomingPosts.slice(0, 5).map((post) => (
            <RowLink
              key={post.id}
              href={`/org/${post.organization_id}/grilla/${post.id}`}
            >
              <span className="text-[10px] text-muted w-14 shrink-0">
                {formatDate(post.scheduled_at)}
              </span>
              <p className="text-xs truncate flex-1">
                {formatPostLabel(post.format, post.title)}
              </p>
            </RowLink>
          ))}
        </div>
      ) : (
        <EmptyState text="Sin posts este mes." />
      );

    case "review":
      return data.reviewPosts?.length ? (
        <div>
          {data.reviewPosts.map((post) => (
            <RowLink
              key={post.id}
              href={`/org/${post.organization_id}/grilla/${post.id}`}
            >
              <p className="text-xs truncate flex-1">
                {formatPostLabel(post.format, post.title)}
              </p>
            </RowLink>
          ))}
        </div>
      ) : (
        <EmptyState text="Nada en revisión." />
      );

    case "needs_design":
    case "needs_design_org":
      return data.postsNeedingDesign?.length ? (
        <div>
          {data.postsNeedingDesign.map((post) => (
            <RowLink
              key={post.id}
              href={`/org/${post.organization_id}/grilla/${post.id}`}
            >
              <p className="text-xs truncate flex-1">
                {formatPostLabel(post.format, post.title)}
              </p>
            </RowLink>
          ))}
        </div>
      ) : (
        <EmptyState text="Todos tienen diseño." />
      );

    case "priority":
      return data.pendingPosts?.length ? (
        <div>
          {data.pendingPosts.slice(0, 4).map((post) => (
            <RowLink
              key={post.id}
              href={`/org/${post.organization_id}/grilla/${post.id}`}
            >
              <p className="text-xs truncate flex-1">
                {formatPostLabel(post.format, post.title)}
              </p>
            </RowLink>
          ))}
        </div>
      ) : (
        <EmptyState text="Todo al día." />
      );

    case "my_pendientes":
    case "assigned_posts":
    case "tasks":
      return <PendientesList tasks={data.tasks} compact />;

    default:
      return null;
  }
}
