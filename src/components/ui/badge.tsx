import { cn } from "@/lib/utils";
import { type PostStatus } from "@/lib/types";
import { statusBadgeStyles } from "@/lib/status-colors";

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
        status ? statusBadgeStyles[status] : "bg-neutral-100 text-neutral-600",
        className
      )}
    >
      {children}
    </span>
  );
}
