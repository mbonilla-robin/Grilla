"use client";

import { useState } from "react";
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

interface NotificationsListProps {
  notifications: Notification[];
}

export function NotificationsList({ notifications: initial }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initial);

  async function markRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function markAll() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={markAll}>
            Marcar todas como leídas
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          No tienes notificaciones aún
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {notifications.map((n) => {
            const typeLabel: Record<Notification["type"], string> = {
              mention: "Mención",
              comment: "Comentario",
              assignment: "Asignación",
              status_change: "Estado",
            };

            const content = (
              <div className="px-4 py-3">
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted">
                  {typeLabel[n.type]}
                </span>
                <p className="text-sm font-medium mt-0.5">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-muted mt-0.5">{n.body}</p>
                )}
                <p className="text-[10px] text-muted mt-1">
                  {new Intl.DateTimeFormat("es", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(n.created_at))}
                </p>
              </div>
            );

            return (
              <li
                key={n.id}
                className={cn(!n.read && "bg-brand/15")}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => !n.read && markRead(n.id)}
                    className="block hover:bg-neutral-50 transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => !n.read && markRead(n.id)}
                    className="w-full text-left hover:bg-neutral-50 transition-colors"
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
