"use client";

import { useEffect, useState } from "react";
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

function ProfileAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0`}
    >
      <div className="h-full w-full rounded-full bg-white" />
    </div>
  );
}

function PostMedia({
  assets,
  slide,
  onPrev,
  onNext,
  variant = "mobile",
}: {
  assets: ReturnType<typeof sortPostAssets>;
  slide: number;
  onPrev: () => void;
  onNext: () => void;
  variant?: "mobile" | "desktop";
}) {
  const current = assets[slide];
  const isDesktop = variant === "desktop";

  return (
    <div
      className={
        isDesktop
          ? "relative shrink-0 overflow-hidden bg-black h-[min(70vh,500px)] w-[min(400px,calc(min(70vh,500px)*4/5))]"
          : "relative w-full overflow-hidden bg-black aspect-[4/5]"
      }
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
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow z-10"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={onNext}
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
    </div>
  );
}

function PostActions({ size = "md" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? 22 : 24;
  const padding = size === "sm" ? "px-4 py-2.5" : "px-3 py-2.5";

  return (
    <div className={`flex items-center gap-4 ${padding} text-foreground`}>
      <Heart
        size={iconSize}
        strokeWidth={1.75}
        className="hover:text-red-500 cursor-pointer"
      />
      <MessageCircle size={iconSize} strokeWidth={1.75} />
      <Send size={iconSize} strokeWidth={1.75} />
      <Bookmark size={iconSize} strokeWidth={1.75} className="ml-auto" />
    </div>
  );
}

function PostCaption({
  accountName,
  body,
  tags,
  format,
  className = "",
  inlineUsername = true,
}: {
  accountName: string;
  body: string;
  tags: string;
  format: PostWithAssets["format"];
  className?: string;
  inlineUsername?: boolean;
}) {
  if (!body && !tags) {
    return (
      <p className={`text-[10px] text-muted uppercase tracking-wide ${className}`}>
        {FORMAT_LABELS[format]}
      </p>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      {body && (
        <p className="text-[13px] leading-[1.65] text-foreground/90 whitespace-pre-wrap break-words">
          {inlineUsername ? (
            <>
              <span className="font-semibold mr-1.5">{accountName}</span>
              {body}
            </>
          ) : (
            body
          )}
        </p>
      )}
      {tags && (
        <p className="text-[12px] leading-[1.5] text-sky-700/80 mt-2 whitespace-pre-wrap break-words">
          {tags}
        </p>
      )}
    </div>
  );
}

function DownloadLinks({
  assets,
  className = "",
}: {
  assets: ReturnType<typeof sortPostAssets>;
  className?: string;
}) {
  if (assets.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] text-muted mr-1">Descargar:</span>
      {assets.map((asset, i) => (
        <a
          key={asset.id}
          href={asset.file_url}
          download={asset.file_name}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5 border border-border bg-neutral-50 text-foreground hover:bg-neutral-100 transition-colors"
        >
          <Download size={12} />
          Slide {i + 1}
        </a>
      ))}
    </div>
  );
}

export function InstagramPostModal({
  post,
  accountName,
  onClose,
}: InstagramPostModalProps) {
  const assets = sortPostAssets(post.assets || []);
  const [slide, setSlide] = useState(0);
  const captionText = post.caption || post.copy || post.title || "";
  const { body, tags } = parseCaption(captionText);

  function prev() {
    setSlide((s) => (s > 0 ? s - 1 : assets.length - 1));
  }

  function next() {
    setSlide((s) => (s < assets.length - 1 ? s + 1 : 0));
  }

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] md:bg-black/70 md:flex md:items-center md:justify-center md:p-4 md:overflow-y-auto"
      onClick={onClose}
    >
      {/* Mobile — Instagram feed post */}
      <div
        className="md:hidden fixed inset-0 bg-surface overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-surface/95 backdrop-blur-sm pt-[max(0.625rem,env(safe-area-inset-top))]">
          <ProfileAvatar />
          <span className="text-sm font-semibold truncate min-w-0 flex-1">
            {accountName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-foreground"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
        </header>

        <PostMedia assets={assets} slide={slide} onPrev={prev} onNext={next} />
        <PostActions />
        <PostCaption
          accountName={accountName}
          body={body}
          tags={tags}
          format={post.format}
          className="px-3 pb-4"
        />
        <DownloadLinks assets={assets} className="px-3 py-3 border-t border-border" />
        <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
      </div>

      {/* Desktop — classic Instagram modal */}
      <div
        className="hidden md:flex flex-col items-center gap-3 my-auto min-w-0 max-w-[min(calc(100vw-2rem),740px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row rounded-xl overflow-hidden bg-surface shadow-2xl">
          <PostMedia
            assets={assets}
            slide={slide}
            onPrev={prev}
            onNext={next}
            variant="desktop"
          />

          <div className="w-[340px] shrink-0 flex flex-col h-[min(70vh,500px)] border-l border-border">
            <header className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <ProfileAvatar size="sm" />
              <span className="text-sm font-semibold truncate min-w-0 flex-1">
                {accountName}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
              <p className="text-[13px] font-semibold mb-2">{accountName}</p>
              <PostCaption
                accountName={accountName}
                body={body}
                tags={tags}
                format={post.format}
                inlineUsername={false}
              />
            </div>

            <div className="border-t border-border shrink-0">
              <PostActions size="sm" />
            </div>
          </div>
        </div>

        <DownloadLinks
          assets={assets}
          className="justify-center px-2 [&_span]:text-white/70 [&_a]:bg-white/10 [&_a]:hover:bg-white/20 [&_a]:text-white [&_a]:border-white/20"
        />
      </div>
    </div>
  );
}
