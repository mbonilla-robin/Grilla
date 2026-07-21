"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Download } from "lucide-react";
import {
  registerPostAsset,
  deletePostAsset,
  reorderPostAssets,
} from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { cn, sortPostAssets } from "@/lib/utils";
import type { PostAsset, PostStatus } from "@/lib/types";

const ASSET_DRAG_TYPE = "text/post-asset-id";

interface PostAssetUploaderProps {
  postId: string;
  orgId: string;
  assets: PostAsset[];
  compact?: boolean;
  mini?: boolean;
  uploadOnly?: boolean;
  onAssetsChanged?: (assets: PostAsset[]) => void;
  onStatusChanged?: (status: PostStatus) => void;
}

export function PostAssetUploader({
  postId,
  orgId,
  assets: initialAssets,
  compact = false,
  mini = false,
  uploadOnly = false,
  onAssetsChanged,
  onStatusChanged,
}: PostAssetUploaderProps) {
  const [localAssets, setLocalAssets] = useState(initialAssets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
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

  function handleFileDragOver(e: React.DragEvent) {
    if (loading || draggingId) return;
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }

  function handleFileDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setIsDraggingOver(false);
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (loading || draggingId) return;
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

  function handleAssetDragStart(e: React.DragEvent, assetId: string) {
    if (assetId.startsWith("temp-") || loading) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(ASSET_DRAG_TYPE, assetId);
    // Firefox needs some data set to allow drag
    e.dataTransfer.setData("text/plain", assetId);
    setDraggingId(assetId);
    setIsDraggingOver(false);
  }

  function handleAssetDragOver(e: React.DragEvent, targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    if (targetId.startsWith("temp-")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(targetId);
  }

  function handleAssetDragLeave(e: React.DragEvent, targetId: string) {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related) && dropTargetId === targetId) {
      setDropTargetId(null);
    }
  }

  async function handleAssetDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();

    const sourceId =
      e.dataTransfer.getData(ASSET_DRAG_TYPE) ||
      e.dataTransfer.getData("text/plain") ||
      draggingId;

    setDropTargetId(null);
    setDraggingId(null);

    if (!sourceId || sourceId === targetId || sourceId.startsWith("temp-")) {
      return;
    }

    const sorted = sortPostAssets(localAssets);
    const fromIndex = sorted.findIndex((a) => a.id === sourceId);
    const toIndex = sorted.findIndex((a) => a.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...sorted];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const reordered = next.map((asset, index) => ({
      ...asset,
      sort_order: index,
    }));

    const previous = localAssets;
    updateAssets(reordered);
    setError(null);

    const result = await reorderPostAssets(
      postId,
      orgId,
      reordered.map((a) => a.id)
    );

    if (result.error) {
      updateAssets(previous);
      setError(result.error);
    }
  }

  function handleAssetDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  const sorted = sortPostAssets(localAssets);
  const thumbSize = mini ? "h-7 w-7" : "h-14 w-14";
  const canReorder = !mini && sorted.length > 1;

  if (mini) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
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
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
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
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((asset, i) => {
            const isTemp = asset.id.startsWith("temp-");
            const isDragging = draggingId === asset.id;
            const isDropTarget = dropTargetId === asset.id;

            return (
              <div
                key={asset.id}
                draggable={canReorder && !isTemp && !loading}
                onDragStart={(e) => handleAssetDragStart(e, asset.id)}
                onDragOver={(e) => handleAssetDragOver(e, asset.id)}
                onDragLeave={(e) => handleAssetDragLeave(e, asset.id)}
                onDrop={(e) => handleAssetDrop(e, asset.id)}
                onDragEnd={handleAssetDragEnd}
                title={
                  canReorder && !isTemp
                    ? "Arrastra para cambiar el orden"
                    : undefined
                }
                className={cn(
                  `relative group ${thumbSize} rounded-md overflow-hidden border border-border bg-background shrink-0`,
                  canReorder &&
                    !isTemp &&
                    "cursor-grab active:cursor-grabbing",
                  isDragging && "opacity-40",
                  isDropTarget && "ring-2 ring-accent border-accent"
                )}
              >
                {asset.file_type === "video" ? (
                  <video
                    src={asset.file_url}
                    className="h-full w-full object-cover pointer-events-none"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.file_url}
                    alt={asset.file_name}
                    className="h-full w-full object-cover pointer-events-none"
                    draggable={false}
                  />
                )}
                <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1 rounded">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(asset.id)}
                  disabled={deletingId === asset.id || isTemp}
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
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                  className="absolute bottom-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Descargar original"
                >
                  <Download size={10} />
                </a>
              </div>
            );
          })}
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
          Archivo 1 = portada del Feed
          {canReorder ? " · Arrastra para reordenar" : ""} · Calidad original
          para publicar
        </p>
      )}
    </div>
  );
}
