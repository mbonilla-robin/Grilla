"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewPost } from "@/lib/actions";
import { PostStatusBadge } from "@/components/grilla/post-status-badge";
import { sortPostAssets, formatDate } from "@/lib/utils";
import { FORMAT_LABELS, type PostWithAssets } from "@/lib/types";

interface ReviewQueueProps {
  orgId: string;
  posts: PostWithAssets[];
}

export function ReviewQueue({ orgId, posts: initialPosts }: ReviewQueueProps) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    postId: string,
    action: "approve" | "reject"
  ) {
    setLoading(postId);
    const result = await reviewPost(orgId, postId, action, feedback[postId]);
    setLoading(null);

    if (!result.error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      router.refresh();
    }
  }

  if (posts.length === 0) {
    return (
      <div className="home-card p-8 text-center">
        <Check size={32} className="mx-auto text-emerald-500 mb-3" />
        <p className="text-sm font-medium">Cola vacía</p>
        <p className="text-xs text-muted mt-1">
          No hay posts pendientes de revisión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {posts.length} post{posts.length !== 1 ? "s" : ""} en revisión
      </p>

      {posts.map((post) => {
        const assets = sortPostAssets(post.assets || []);
        const cover = assets[0];

        return (
          <article
            key={post.id}
            className="home-card p-4 flex flex-col sm:flex-row gap-4"
          >
            <div className="shrink-0 w-full sm:w-32 h-40 sm:h-32 rounded-lg overflow-hidden bg-neutral-100 border border-border">
              {cover ? (
                cover.file_type === "video" ? (
                  <video
                    src={cover.file_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.file_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted">
                  Sin diseño
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{post.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                    <PostStatusBadge status={post.status} assetCount={assets.length} />
                    <span>{FORMAT_LABELS[post.format]}</span>
                    {post.pillar && <span>· {post.pillar}</span>}
                    {post.scheduled_at && (
                      <span>· {formatDate(post.scheduled_at)}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/org/${orgId}/grilla/${post.id}`}
                  className="text-muted hover:text-foreground shrink-0"
                >
                  <ExternalLink size={14} />
                </Link>
              </div>

              {post.caption && (
                <p className="text-xs text-muted line-clamp-2">{post.caption}</p>
              )}

              <div className="flex items-start gap-2">
                <MessageSquare size={14} className="text-muted mt-2 shrink-0" />
                <textarea
                  value={feedback[post.id] || ""}
                  onChange={(e) =>
                    setFeedback((prev) => ({
                      ...prev,
                      [post.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Feedback opcional para el equipo..."
                  className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(post.id, "approve")}
                  loading={loading === post.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check size={13} />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAction(post.id, "reject")}
                  loading={loading === post.id}
                >
                  <X size={13} />
                  Pedir cambios
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
