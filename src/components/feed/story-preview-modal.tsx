"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { sortPostAssets } from "@/lib/utils";
import type { PostWithAssets } from "@/lib/types";

interface StoryPreviewModalProps {
  post: PostWithAssets;
  accountName: string;
  onClose: () => void;
}

export function StoryPreviewModal({
  post,
  accountName,
  onClose,
}: StoryPreviewModalProps) {
  const assets = sortPostAssets(post.assets || []);
  const [slide, setSlide] = useState(0);
  const current = assets[slide];

  function prev() {
    setSlide((s) => (s > 0 ? s - 1 : assets.length - 1));
  }

  function next() {
    setSlide((s) => (s < assets.length - 1 ? s + 1 : 0));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-black shadow-2xl"
        style={{ width: "min(320px, 90vw)", height: "min(568px, 80vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        {assets.length > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {assets.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className={`h-full bg-white transition-all ${
                    i < slide ? "w-full" : i === slide ? "w-1/2" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {current ? (
          current.file_type === "video" ? (
            <video
              src={current.file_url}
              className="absolute inset-0 h-full w-full object-cover"
              controls
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.file_url}
              alt={`Story ${slide + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/60 text-sm">Sin archivos</p>
          </div>
        )}

        {assets.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
            />
            <button
              type="button"
              onClick={next}
              className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
            />
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-10 right-3 text-white z-10"
        >
          <X size={20} />
        </button>

        <div className="absolute top-10 left-3 flex items-center gap-2 z-10">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="h-full w-full rounded-full bg-white" />
          </div>
          <span className="text-sm font-semibold text-white">{accountName}</span>
        </div>
      </div>
    </div>
  );
}
