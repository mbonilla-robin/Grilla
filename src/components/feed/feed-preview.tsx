"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Grid3X3 } from "lucide-react";
import { sortPostAssets } from "@/lib/utils";
import type { PostWithAssets } from "@/lib/types";
import { InstagramPostModal } from "./instagram-post-modal";

interface FeedPreviewProps {
  posts: PostWithAssets[];
  accountName: string;
  initialPostId?: string;
}

export function FeedPreview({
  posts,
  accountName,
  initialPostId,
}: FeedPreviewProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithAssets | null>(null);

  useEffect(() => {
    if (initialPostId) {
      const post = posts.find((p) => p.id === initialPostId);
      if (post) setSelectedPost(post);
    }
  }, [initialPostId, posts]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">Sin posts para preview</p>
        <p className="text-sm text-muted/60 mt-1">
          Los posts de la grilla aparecerán aquí como en Instagram
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-[375px] mx-auto">
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-700">
                  {accountName.slice(0, 1).toUpperCase()}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {accountName.toLowerCase().replace(/\s+/g, "")}
                </p>
                <p className="text-[10px] text-muted">{accountName}</p>
              </div>
            </div>
            <Grid3X3 size={18} className="text-muted" />
          </div>

          <div className="flex border-b border-border text-center text-xs">
            <button
              type="button"
              className="flex-1 py-2.5 border-b-2 border-foreground font-semibold"
            >
              PUBLICACIONES
            </button>
          </div>

          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const assets = sortPostAssets(post.assets || []);
              const cover = assets[0];

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className="aspect-[4/5] bg-neutral-100 relative group overflow-hidden"
                >
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
                    <div className="flex flex-col items-center justify-center h-full text-muted/40 px-2">
                      <ImageIcon size={18} />
                      <span className="text-[9px] mt-1 text-center line-clamp-2">
                        {post.title}
                      </span>
                    </div>
                  )}
                  {assets.length > 1 && (
                    <Grid3X3
                      size={14}
                      className="absolute top-1.5 right-1.5 text-white drop-shadow"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPost && (
        <InstagramPostModal
          post={selectedPost}
          accountName={accountName}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
}
