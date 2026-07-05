"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ImageIcon } from "lucide-react";
import { updatePostStatus } from "@/lib/actions";
import { formatPostLabel } from "@/lib/post-display";
import { cn } from "@/lib/utils";
import type { ReviewPostItem } from "@/lib/home-data";
import { EmptyState } from "./home-ui";

interface ReviewGalleryProps {
  posts: ReviewPostItem[];
}

export function ReviewGallery({ posts: initialPosts }: ReviewGalleryProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const brands = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of posts) {
      names.set(p.organization_id, p.organization_name);
    }
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [posts]);

  const filtered =
    brandFilter === "all"
      ? posts
      : posts.filter((p) => p.organization_id === brandFilter);

  async function handleApprove(post: ReviewPostItem) {
    setApprovingId(post.id);
    const result = await updatePostStatus(post.id, "approved", post.organization_id);
    if (!result.error) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    }
    setApprovingId(null);
  }

  if (initialPosts.length === 0) {
    return <EmptyState text="Nada en revisión por ahora." />;
  }

  return (
    <div className="space-y-4">
      {brands.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setBrandFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              brandFilter === "all"
                ? "bg-foreground text-background"
                : "bg-neutral-100 text-muted hover:text-foreground"
            )}
          >
            Todas
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrandFilter(b.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                brandFilter === b.id
                  ? "bg-foreground text-background"
                  : "bg-neutral-100 text-muted hover:text-foreground"
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState text="Sin posts en revisión para esta marca." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="group relative rounded-lg border border-border bg-surface overflow-hidden"
            >
              <Link
                href={`/org/${post.organization_id}/grilla/${post.id}`}
                className="block aspect-[4/5] bg-neutral-100"
              >
                {post.cover_url ? (
                  post.cover_type === "video" ? (
                    <video
                      src={post.cover_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_url}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon size={24} className="text-muted/30" />
                  </div>
                )}
              </Link>

              <button
                type="button"
                disabled={approvingId === post.id}
                onClick={() => handleApprove(post)}
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center",
                  "bg-white/90 shadow-sm border border-border",
                  "hover:bg-brand/20 hover:border-brand-dark/50 hover:text-foreground transition-colors",
                  "disabled:opacity-50"
                )}
                title="Aprobar"
              >
                <Check size={16} />
              </button>

              <div className="p-2.5 border-t border-border">
                <p className="text-[10px] text-muted uppercase tracking-wide truncate">
                  {post.organization_name}
                </p>
                <p className="text-xs font-medium truncate mt-0.5">
                  {formatPostLabel(post.format, post.title)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
