"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationRead } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

interface NotificationBellProps {
  userId: string;
  initialCount?: number;
}

export function NotificationBell({ userId, initialCount = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications((data || []) as Notification[]);
      setUnreadCount((data || []).filter((n) => !n.read).length);
    }

    load();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-muted hover:text-foreground hover:bg-neutral-50 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">Notificaciones</p>
              <Link
                href="/home/notificaciones"
                onClick={() => setOpen(false)}
                className="text-xs text-muted hover:text-foreground"
              >
                Ver todas
              </Link>
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted text-center">
                Sin notificaciones
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => handleClick(n)}
                        className={cn(
                          "block px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-border last:border-0",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <NotificationItem notification={n} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-border last:border-0",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <NotificationItem notification={n} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const time = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(notification.created_at));

  const typeLabel: Record<Notification["type"], string> = {
    mention: "Mención",
    comment: "Comentario",
    assignment: "Asignación",
    status_change: "Estado",
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted">
          {typeLabel[notification.type]}
        </span>
      </div>
      <p className="text-sm font-medium leading-snug">{notification.title}</p>
      {notification.body && (
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notification.body}</p>
      )}
      <p className="text-[10px] text-muted mt-1">{time}</p>
    </div>
  );
}
