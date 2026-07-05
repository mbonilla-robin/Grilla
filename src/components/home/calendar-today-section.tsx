import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatPostLabel } from "@/lib/post-display";
import type { TaskWithPost } from "@/lib/task-due";
import type { CalendarPostItem } from "@/lib/home-data";
import { SectionCard, EmptyState } from "./home-ui";
import { FeaturedTaskCards } from "./featured-task-cards";

function isTodayUtc(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function isTaskDueToday(task: TaskWithPost): boolean {
  const raw = task.due_at || task.post?.scheduled_at;
  if (!raw) return false;
  return isTodayUtc(raw);
}

interface CalendarTodaySectionProps {
  posts: CalendarPostItem[];
  tasks?: TaskWithPost[];
  tasksHref?: string;
}

export function CalendarTodaySection({
  posts,
  tasks = [],
  tasksHref,
}: CalendarTodaySectionProps) {
  const todayPosts = posts.filter((p) => isTodayUtc(p.scheduled_at));
  const todayTasks = tasks.filter(isTaskDueToday);
  const hasContent = todayPosts.length > 0 || todayTasks.length > 0;

  return (
    <SectionCard
      title="Hoy"
      action={tasksHref ? { label: "Ver pendientes", href: tasksHref } : undefined}
    >
      {!hasContent ? (
        <EmptyState text="Nada programado para hoy." />
      ) : (
        <div className="space-y-4">
          {todayTasks.length > 0 && (
            <FeaturedTaskCards tasks={todayTasks} max={3} />
          )}

          {todayPosts.length > 0 && (
            <div className="space-y-1">
              {todayPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/org/${post.organization_id}/grilla/${post.id}`}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-neutral-50 -mx-1 px-1 rounded-xl transition-colors"
                >
                  <div className="w-1 h-8 rounded-full bg-brand-dark shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {formatPostLabel(post.format, post.title)}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {post.organization_name}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
