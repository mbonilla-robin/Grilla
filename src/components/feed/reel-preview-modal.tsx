"use client";

import { X, Heart, MessageCircle, Send, Bookmark, Play } from "lucide-react";
import { sortPostAssets } from "@/lib/utils";
import type { PostWithAssets } from "@/lib/types";

interface ReelPreviewModalProps {
  post: PostWithAssets;
  accountName: string;
  onClose: () => void;
}

export function ReelPreviewModal({
  post,
  accountName,
  onClose,
}: ReelPreviewModalProps) {
  const assets = sortPostAssets(post.assets || []);
  const cover = assets[0];
  const captionText = post.caption || post.copy || post.title || "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-x-hidden bg-black/80 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-[320px] aspect-[9/16] max-h-[85vh] rounded-xl overflow-hidden bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {cover ? (
          cover.file_type === "video" ? (
            <video
              src={cover.file_url}
              className="absolute inset-0 h-full w-full object-cover"
              controls
              autoPlay
              playsInline
              loop
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.file_url}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play size={48} className="text-white/40" />
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-1.5 z-10"
        >
          <X size={18} />
        </button>

        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white z-10">
          <Heart size={24} />
          <MessageCircle size={24} />
          <Send size={24} />
          <Bookmark size={24} />
        </div>

        <div className="absolute bottom-0 left-0 right-12 p-4 bg-gradient-to-t from-black/80 to-transparent z-10 min-w-0">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <span className="text-sm font-semibold text-white truncate min-w-0">{accountName}</span>
          </div>
          {captionText && (
            <p className="text-[13px] text-white/90 line-clamp-3 leading-snug break-words">
              {captionText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
