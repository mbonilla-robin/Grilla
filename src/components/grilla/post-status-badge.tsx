import { STATUS_LABELS, type PostStatus } from "@/lib/types";
import { statusDotStyles } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

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
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDotStyles[safeStatus])} />
      {STATUS_LABELS[safeStatus]}
    </span>
  );
}
