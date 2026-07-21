"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Download } from "lucide-react";
import { registerPostAsset, deletePostAsset } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { cn, sortPostAssets } from "@/lib/utils";
import type { PostAsset, PostStatus } from "@/lib/types";

interface PostAssetUploaderProps {
  postId: string;
  orgId: string;
  assets: PostAsset[];
  compact?: boolean;
  mini?: boolean;
  uploadOnly?: boolean;
  /** Base name for the zip when downloading all files (without .zip). */
  zipFileName?: string;
  onAssetsChanged?: (assets: PostAsset[]) => void;
  onStatusChanged?: (status: PostStatus) => void;
}

function uniqueZipEntryName(fileName: string, index: number, used: Set<string>) {
  const fallback = `slide-${index + 1}`;
  const raw = (fileName || fallback).trim() || fallback;
  if (!used.has(raw)) {
    used.add(raw);
    return raw;
  }
  const dot = raw.lastIndexOf(".");
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const ext = dot > 0 ? raw.slice(dot) : "";
  let n = 2;
  let candidate = `${base}-${n}${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export function PostAssetUploader({
  postId,
  orgId,
  assets: initialAssets,
  compact = false,
  mini = false,
  uploadOnly = false,
  zipFileName,
  onAssetsChanged,
  onStatusChanged,
}: PostAssetUploaderProps) {
  const [localAssets, setLocalAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalAssets(initialAssets);
  }, [initialAssets]);

  function updateAssets(next: PostAsset[]) {
    setLocalAssets(next);
    onAssetsChanged?.(next);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("No autenticado");
      setLoading(false);
      return;
    }

    const sorted = sortPostAssets(localAssets);
    let nextOrder =
      sorted.length > 0
        ? Math.max(...sorted.map((a) => a.sort_order)) + 1
        : 0;

    let currentAssets = [...localAssets];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${orgId}/${postId}/${nextOrder}-${Date.now()}.${ext}`;
      const fileType = file.type.startsWith("video") ? "video" : "image";
      const blobUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${nextOrder}`;

      const optimistic: PostAsset = {
        id: tempId,
        post_id: postId,
        file_url: blobUrl,
        file_name: file.name,
        file_type: fileType,
        sort_order: nextOrder,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
      };

      currentAssets = sortPostAssets([...currentAssets, optimistic]);
      updateAssets(currentAssets);

      const { error: uploadError } = await supabase.storage
        .from("post-assets")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        URL.revokeObjectURL(blobUrl);
        currentAssets = currentAssets.filter((a) => a.id !== tempId);
        updateAssets(currentAssets);
        setError(uploadError.message);
        break;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-assets").getPublicUrl(path);

      const result = await registerPostAsset(postId, orgId, {
        file_url: publicUrl,
        file_name: file.name,
        file_type: fileType,
        sort_order: nextOrder,
      });

      if (result.error || !result.asset) {
        URL.revokeObjectURL(blobUrl);
        await supabase.storage.from("post-assets").remove([path]);
        currentAssets = currentAssets.filter((a) => a.id !== tempId);
        updateAssets(currentAssets);
        setError(result.error || "Error al registrar archivo");
        break;
      }

      URL.revokeObjectURL(blobUrl);
      currentAssets = sortPostAssets(
        currentAssets.map((a) => (a.id === tempId ? result.asset! : a))
      );
      updateAssets(currentAssets);

      if (result.newStatus) {
        onStatusChanged?.(result.newStatus as PostStatus);
      }

      nextOrder += 1;
    }

    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    if (loading) return;
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setIsDraggingOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (loading) return;
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  async function handleDelete(assetId: string) {
    setDeletingId(assetId);
    const previous = localAssets;
    const next = localAssets.filter((a) => a.id !== assetId);
    updateAssets(next);

    const result = await deletePostAsset(assetId, postId, orgId);
    if (result.error) {
      updateAssets(previous);
      setError(result.error);
    } else if (result.newStatus) {
      onStatusChanged?.(result.newStatus as PostStatus);
    }

    setDeletingId(null);
  }

  async function handleDownloadAll() {
    const ready = sortPostAssets(localAssets).filter(
      (a) => !a.id.startsWith("temp-")
    );
    if (ready.length === 0 || zipping) return;

    setZipping(true);
    setError(null);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const usedNames = new Set<string>();

      await Promise.all(
        ready.map(async (asset, i) => {
          const res = await fetch(asset.file_url);
          if (!res.ok) {
            throw new Error(`No se pudo descargar ${asset.file_name}`);
          }
          const blob = await res.blob();
          zip.file(uniqueZipEntryName(asset.file_name, i, usedNames), blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      const base =
        (zipFileName || "archivos-post")
          .replace(/[^\w\s\-àáâãäåæçèéêëìíîïñòóôõöùúûüýÿ]/gi, "")
          .trim()
          .replace(/\s+/g, "-")
          .slice(0, 80) || "archivos-post";
      a.download = `${base}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al descargar los archivos"
      );
    } finally {
      setZipping(false);
    }
  }

  const sorted = sortPostAssets(localAssets);
  const readyCount = sorted.filter((a) => !a.id.startsWith("temp-")).length;
  const thumbSize = mini ? "h-7 w-7" : "h-14 w-14";

  if (mini) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        {!uploadOnly &&
          sorted.map((asset, i) => (
            <div
              key={asset.id}
              className={`relative group ${thumbSize} rounded overflow-hidden border border-border bg-background shrink-0`}
            >
              {asset.file_type === "video" ? (
                <video
                  src={asset.file_url}
                  className="h-full w-full object-cover"
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.file_url}
                  alt={asset.file_name}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[8px] text-center leading-tight">
                {i + 1}
              </span>
            </div>
          ))}

        {uploadOnly && sorted.length > 0 && (
          <span className="text-[10px] text-muted tabular-nums">
            {sorted.length} {sorted.length === 1 ? "archivo" : "archivos"}
          </span>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          title={sorted.length === 0 ? "Subir diseños" : "Agregar slides"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted hover:text-foreground hover:border-foreground/20 transition-colors",
            isDraggingOver && "border-accent bg-accent/10 text-foreground"
          )}
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Upload size={11} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={compact ? "space-y-2" : "space-y-3"}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {error}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          {readyCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={zipping}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
                title="Descargar todos los archivos en un ZIP"
              >
                {zipping ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                {zipping
                  ? "Preparando ZIP…"
                  : readyCount === 1
                    ? "Descargar archivo"
                    : `Descargar todos (${readyCount})`}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((asset, i) => (
              <div
                key={asset.id}
                className={`relative group ${thumbSize} rounded-md overflow-hidden border border-border bg-background shrink-0`}
              >
                {asset.file_type === "video" ? (
                  <video
                    src={asset.file_url}
                    className="h-full w-full object-cover"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.file_url}
                    alt={asset.file_name}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1 rounded">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(asset.id)}
                  disabled={
                    deletingId === asset.id || asset.id.startsWith("temp-")
                  }
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {deletingId === asset.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <X size={10} />
                  )}
                </button>
                <a
                  href={asset.file_url}
                  download={asset.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Descargar original"
                >
                  <Download size={10} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-md text-muted hover:text-foreground hover:border-accent/40 hover:bg-background/50 transition-colors",
          compact ? "py-3 text-xs" : "py-4 text-sm",
          isDraggingOver && "border-accent bg-accent/10 text-foreground"
        )}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {sorted.length === 0
          ? "Subir diseños (slide 1 = portada)"
          : "Agregar más slides"}
      </button>
      {!compact && sorted.length > 0 && (
        <p className="text-[10px] text-muted">
          Archivo 1 = portada del Feed · Calidad original para publicar
        </p>
      )}
    </div>
  );
}
