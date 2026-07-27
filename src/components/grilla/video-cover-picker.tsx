"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrillaModal } from "@/components/grilla/grilla-modal";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function isGeneratedVideoCover(fileName: string) {
  return /^cover-frame-/i.test(fileName);
}

interface VideoCoverPickerProps {
  open: boolean;
  videoUrl: string;
  videoName?: string;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
}

export function VideoCoverPicker({
  open,
  videoUrl,
  videoName,
  onClose,
  onConfirm,
}: VideoCoverPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoadingVideo(true);
      setLoadError(null);
      setSaveError(null);
      setDuration(0);
      setCurrentTime(0);
      setBlobUrl(null);

      try {
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error("No se pudo cargar el video");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "No se pudo cargar el video"
          );
        }
      } finally {
        if (!cancelled) setLoadingVideo(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, videoUrl]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    // Skip the often-blank first frame when possible
    const start = video.duration > 0.35 ? 0.1 : 0;
    video.currentTime = start;
    setCurrentTime(start);
  }

  function handleSeek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  async function handleConfirm() {
    const video = videoRef.current;
    if (!video || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("El video no está listo"));
          };
          const cleanup = () => {
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("error", onError);
          };
          video.addEventListener("loadeddata", onReady);
          video.addEventListener("error", onError);
        });
      }

      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo capturar el frame");
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen"))),
          "image/jpeg",
          0.92
        );
      });

      const file = new File(
        [blob],
        `cover-frame-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );
      await onConfirm(file);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar portada");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GrillaModal open={open}>
      <div
        className="relative w-full max-w-md rounded-xl bg-surface shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">Elegir portada</h2>
            <p className="text-[11px] text-muted truncate">
              Mueve el video y elige el frame que se verá en el feed
              {videoName ? ` · ${videoName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 p-1 text-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="bg-black aspect-[9/16] max-h-[55vh] relative flex items-center justify-center">
          {loadingVideo && (
            <Loader2 size={22} className="animate-spin text-white/70" />
          )}
          {loadError && (
            <p className="text-sm text-white/80 px-6 text-center">{loadError}</p>
          )}
          {blobUrl && (
            <video
              ref={videoRef}
              src={blobUrl}
              className="absolute inset-0 h-full w-full object-contain"
              playsInline
              muted
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              onSeeked={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
            />
          )}
        </div>

        <div className="px-4 py-3 space-y-3 border-t border-border">
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={Math.min(currentTime, duration || 0)}
              disabled={!blobUrl || loadingVideo || duration <= 0 || saving}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[11px] text-muted tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {(saveError || loadError) && (
            <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
              {saveError || loadError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              loading={saving}
              disabled={!blobUrl || loadingVideo || !!loadError}
              onClick={() => void handleConfirm()}
            >
              Usar este frame
            </Button>
          </div>
        </div>
      </div>
    </GrillaModal>
  );
}
