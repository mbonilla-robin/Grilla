"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  X,
} from "lucide-react";
import { sortPostAssets } from "@/lib/utils";
import { FORMAT_LABELS, type PostWithAssets } from "@/lib/types";

interface InstagramPostModalProps {
  post: PostWithAssets;
  accountName: string;
  onClose: () => void;
}

function parseCaption(text: string) {
  const lines = text.split("\n");
  const body: string[] = [];
  const tags: string[] = [];
  let inTags = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTags && trimmed.startsWith("#")) inTags = true;
    if (inTags && trimmed) tags.push(line);
    else if (!inTags) body.push(line);
  }

  return {
    body: body.join("\n").trim(),
    tags: tags.join("\n").trim(),
  };
}

export function InstagramPostModal({
  post,
  accountName,
  onClose,
}: InstagramPostModalProps) {
  const assets = sortPostAssets(post.assets || []);
  const [slide, setSlide] = useState(0);
  const current = assets[slide];
  const captionText = post.caption || post.copy || post.title || "";
  const { body, tags } = parseCaption(captionText);

  function prev() {
    setSlide((s) => (s > 0 ? s - 1 : assets.length - 1));
  }

  function next() {
    setSlide((s) => (s < assets.length - 1 ? s + 1 : 0));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-3 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row rounded-xl overflow-hidden bg-surface shadow-2xl">
          <div
            className="relative shrink-0 overflow-hidden bg-black"
            style={{
              width: "min(400px, calc(min(70vh, 500px) * 4 / 5))",
              height: "min(70vh, 500px)",
            }}
          >
            {current ? (
              current.file_type === "video" ? (
                <video
                  src={current.file_url}
                  className="absolute inset-0 h-full w-full object-cover"
                  controls
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.file_url}
                  alt={`Slide ${slide + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-sm">Sin archivos subidos</p>
              </div>
            )}

            {assets.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow z-10"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow z-10"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {assets.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i === slide ? "bg-white" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 md:hidden bg-black/50 text-white rounded-full p-1 z-10"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="w-full md:w-[340px] flex flex-col border-t md:border-t-0 md:border-l border-border"
            style={{ height: "min(70vh, 500px)" }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                <div className="h-full w-full rounded-full bg-white" />
              </div>
              <span className="text-sm font-semibold truncate">{accountName}</span>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto hidden md:block text-muted hover:text-foreground shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              <p className="text-[13px] font-semibold mb-2">{accountName}</p>
              {body && (
                <p className="text-[13px] leading-[1.65] text-foreground/90 whitespace-pre-wrap">
                  {body}
                </p>
              )}
              {tags && (
                <p className="text-[12px] leading-[1.5] text-sky-700/80 mt-3 whitespace-pre-wrap">
                  {tags}
                </p>
              )}
              <p className="text-[10px] text-muted mt-4 uppercase tracking-wide">
                {FORMAT_LABELS[post.format]}
              </p>
            </div>

            <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-foreground shrink-0">
              <Heart size={22} className="hover:text-red-500 cursor-pointer" />
              <MessageCircle size={22} />
              <Send size={22} />
              <Bookmark size={22} className="ml-auto" />
            </div>
          </div>
        </div>

        {assets.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-2">
            <span className="text-[11px] text-white/70 mr-1">Descargar:</span>
            {assets.map((asset, i) => (
              <a
                key={asset.id}
                href={asset.file_url}
                download={asset.file_name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-3 py-1.5 transition-colors backdrop-blur-sm"
              >
                <Download size={12} />
                Slide {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
