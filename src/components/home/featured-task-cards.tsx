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
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {featured.map((task) => (
        <TaskCard key={task.id} task={task} showOrg />
      ))}
    </div>
  );
}
