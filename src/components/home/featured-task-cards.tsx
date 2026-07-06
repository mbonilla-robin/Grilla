import type { TaskWithPost } from "@/lib/task-due";
import { EmptyState } from "./home-ui";
import { TaskCard } from "./task-card";

export function FeaturedTaskCards({
  tasks,
  max = 3,
}: {
  tasks: TaskWithPost[];
  max?: number;
}) {
  const featured = tasks.slice(0, max);

  if (featured.length === 0) {
    return <EmptyState text="Nada destacado por ahora." />;
  }

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-0.5 sm:hidden">
        {featured.map((task) => (
          <div key={task.id} className="w-[62vw] max-w-[200px] shrink-0 snap-start">
            <TaskCard task={task} showOrg size="sm" />
          </div>
        ))}
      </div>

      <div className="hidden sm:grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {featured.map((task) => (
          <TaskCard key={task.id} task={task} showOrg />
        ))}
      </div>
    </>
  );
}
