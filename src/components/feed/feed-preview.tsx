"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Grid3X3, Play, Circle } from "lucide-react";
import { sortPostAssets } from "@/lib/utils";
import type { PostWithAssets, PostFormat } from "@/lib/types";
import { InstagramPostModal } from "./instagram-post-modal";
import { ReelPreviewModal } from "./reel-preview-modal";
import { StoryPreviewModal } from "./story-preview-modal";

type FeedTab = "posts" | "reels" | "stories";

interface FeedPreviewProps {
  posts: PostWithAssets[];
  accountName: string;
  bio?: string;
  initialPostId?: string;
}

const REEL_FORMATS: PostFormat[] = ["reel", "video_carousel"];
const STORY_FORMATS: PostFormat[] = ["story"];

function isReelFormat(format: PostFormat) {
  return REEL_FORMATS.includes(format);
}

function FeedGridItem({
  post,
  variant = "post",
  onSelect,
}: {
  post: PostWithAssets;
  variant?: "post" | "reel";
  onSelect: (post: PostWithAssets) => void;
}) {
  const assets = sortPostAssets(post.assets || []);
  const cover = assets[0];
  const isReel = variant === "reel" || isReelFormat(post.format);

  return (
    <button
      type="button"
      onClick={() => onSelect(post)}
      className={`relative overflow-hidden bg-neutral-100 group ${
        variant === "reel" ? "aspect-[9/16] bg-neutral-900" : "aspect-[4/5]"
      }`}
    >
      {cover ? (
        cover.file_type === "video" ? (
          <video
            src={cover.file_url}
            className="h-full w-full object-cover"
            muted
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.file_url}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        )
      ) : (
        <div
          className={`flex h-full flex-col items-center justify-center px-2 ${
            variant === "reel" ? "text-white/40" : "text-muted/40"
          }`}
        >
          {isReel ? <Play size={18} /> : <ImageIcon size={18} />}
          <span className="mt-1 line-clamp-2 text-center text-[9px]">
            {post.title}
          </span>
        </div>
      )}
      {isReel && (
        <Play
          size={14}
          className="absolute top-1.5 right-1.5 text-white drop-shadow"
        />
      )}
      {!isReel && assets.length > 1 && (
        <Grid3X3
          size={14}
          className="absolute top-1.5 right-1.5 text-white drop-shadow"
        />
      )}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
    </button>
  );
}

export function FeedPreview({
  posts,
  accountName,
  bio,
  initialPostId,
}: FeedPreviewProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithAssets | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("posts");

  const reelPosts = posts.filter((p) => REEL_FORMATS.includes(p.format));
  const storyPosts = posts.filter((p) => STORY_FORMATS.includes(p.format));
  const publicationPosts = posts.filter((p) => !STORY_FORMATS.includes(p.format));
  const publicationCount = publicationPosts.length;

  useEffect(() => {
    if (initialPostId) {
      const post = posts.find((p) => p.id === initialPostId);
      if (post) {
        if (REEL_FORMATS.includes(post.format)) setActiveTab("reels");
        else if (STORY_FORMATS.includes(post.format)) setActiveTab("stories");
        setSelectedPost(post);
      }
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

  function closeModal() {
    setSelectedPost(null);
  }

  return (
    <>
      <div className="w-full max-w-[430px] mx-auto">
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          {/* Profile header */}
          <div className="px-4 pt-5 pb-4">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px] shrink-0">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-xl sm:text-2xl font-bold text-neutral-700">
                  {accountName.slice(0, 1).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-3 gap-1 text-center">
                <div className="min-w-0">
                  <p className="text-base font-semibold tabular-nums">{publicationCount}</p>
                  <p className="text-[10px] leading-tight text-muted truncate">
                    publicaciones
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold tabular-nums">—</p>
                  <p className="text-[10px] leading-tight text-muted truncate">
                    seguidores
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold tabular-nums">—</p>
                  <p className="text-[10px] leading-tight text-muted truncate">
                    siguiendo
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-semibold">{accountName}</p>
              {bio && (
                <p className="text-[13px] text-foreground/80 mt-0.5 leading-snug line-clamp-3">
                  {bio}
                </p>
              )}
            </div>

            {/* Highlights mock */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {["Marca", "Producto", "Equipo"].map((label) => (
                <div key={label} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="h-14 w-14 rounded-full border border-border bg-neutral-100 flex items-center justify-center">
                    <span className="text-[9px] text-muted font-medium">
                      {label.slice(0, 3)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stories strip */}
          {storyPosts.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-2">
                Stories
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {storyPosts.map((post) => {
                  const assets = sortPostAssets(post.assets || []);
                  const cover = assets[0];
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="flex flex-col items-center gap-1 shrink-0"
                    >
                      <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                        <div className="h-full w-full rounded-full overflow-hidden bg-neutral-100">
                          {cover ? (
                            cover.file_type === "video" ? (
                              <video
                                src={cover.file_url}
                                className="h-full w-full object-cover"
                                muted
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover.file_url}
                                alt={post.title}
                                className="h-full w-full object-cover"
                              />
                            )
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Circle size={12} className="text-muted/40" />
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-muted max-w-[64px] truncate">
                        {post.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-t border-b border-border text-center text-[10px] sm:text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition-colors ${
                activeTab === "posts"
                  ? "border-foreground font-semibold"
                  : "border-transparent text-muted"
              }`}
            >
              <Grid3X3 size={14} className="shrink-0" />
              <span className="truncate">PUBLICACIONES</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reels")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1 sm:gap-1.5 border-b-2 transition-colors ${
                activeTab === "reels"
                  ? "border-foreground font-semibold"
                  : "border-transparent text-muted"
              }`}
            >
              <Play size={14} className="shrink-0" />
              <span className="truncate">REELS</span>
            </button>
          </div>

          {/* Grid content */}
          {activeTab === "posts" && (
            <div className="grid grid-cols-3 gap-0.5">
              {publicationPosts.map((post) => (
                <FeedGridItem
                  key={post.id}
                  post={post}
                  onSelect={setSelectedPost}
                />
              ))}
              {publicationPosts.length === 0 && (
                <div className="col-span-3 py-12 text-center text-xs text-muted">
                  Sin publicaciones de feed
                </div>
              )}
            </div>
          )}

          {activeTab === "reels" && (
            <div className="grid grid-cols-3 gap-0.5">
              {reelPosts.map((post) => (
                <FeedGridItem
                  key={post.id}
                  post={post}
                  variant="reel"
                  onSelect={setSelectedPost}
                />
              ))}
              {reelPosts.length === 0 && (
                <div className="col-span-3 py-12 text-center text-xs text-muted">
                  Sin reels
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedPost &&
        (REEL_FORMATS.includes(selectedPost.format) ? (
          <ReelPreviewModal
            post={selectedPost}
            accountName={accountName}
            onClose={closeModal}
          />
        ) : STORY_FORMATS.includes(selectedPost.format) ? (
          <StoryPreviewModal
            post={selectedPost}
            accountName={accountName}
            onClose={closeModal}
          />
        ) : (
          <InstagramPostModal
            post={selectedPost}
            accountName={accountName}
            onClose={closeModal}
          />
        ))}
    </>
  );
}
