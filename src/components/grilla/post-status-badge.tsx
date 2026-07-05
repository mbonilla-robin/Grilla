import { STATUS_LABELS, type PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusDot: Record<PostStatus, string> = {
  draft: "bg-neutral-400",
  brief_ready: "bg-blue-500",
  in_design: "bg-amber-500",
  review: "bg-purple-500",
  approved: "bg-green-500",
  scheduled: "bg-sky-500",
  published: "bg-neutral-800",
};

interface PostStatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
  const safeStatus = status in STATUS_LABELS ? status : "draft";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium text-muted uppercase tracking-wide",
        className
      )}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[safeStatus]}`} />
      {STATUS_LABELS[safeStatus]}
    </span>
  );
}
