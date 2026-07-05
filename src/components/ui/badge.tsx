import { cn } from "@/lib/utils";
import { type PostStatus } from "@/lib/types";

const statusStyles: Record<PostStatus, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  brief_ready: "bg-blue-50 text-blue-700",
  in_design: "bg-amber-50 text-amber-700",
  review: "bg-purple-50 text-purple-700",
  approved: "bg-green-50 text-green-700",
  scheduled: "bg-sky-50 text-sky-700",
  published: "bg-neutral-800 text-neutral-100",
};

interface BadgeProps {
  children: React.ReactNode;
  status?: PostStatus;
  className?: string;
}

export function Badge({ children, status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        status ? statusStyles[status] : "bg-neutral-100 text-neutral-600",
        className
      )}
    >
      {children}
    </span>
  );
}
