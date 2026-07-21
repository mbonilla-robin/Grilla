import { STATUS_LABELS, type PostStatus } from "@/lib/types";
import { effectivePostStatus } from "@/lib/post-progress";
import { statusDotStyles } from "@/lib/status-colors";
import { cn } from "@/lib/utils";

interface PostStatusBadgeProps {
  status: PostStatus;
  assetCount?: number;
  className?: string;
}

export function PostStatusBadge({
  status,
  assetCount = 0,
  className,
}: PostStatusBadgeProps) {
  const baseStatus = status in STATUS_LABELS ? status : "draft";
  const safeStatus = effectivePostStatus(baseStatus, assetCount);
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
