import type { PostAsset } from "@/lib/types";
import { sortPostAssets } from "@/lib/utils";

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

function sanitizeZipBaseName(name?: string) {
  return (
    (name || "archivos-post")
      .replace(/[^\w\s\-àáâãäåæçèéêëìíîïñòóôõöùúûüýÿ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "archivos-post"
  );
}

/** Downloads all ready post assets as a single ZIP file. */
export async function downloadAssetsAsZip(
  assets: PostAsset[],
  zipFileName?: string
) {
  const ready = sortPostAssets(assets).filter((a) => !a.id.startsWith("temp-"));
  if (ready.length === 0) {
    throw new Error("No hay archivos para descargar");
  }

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
  a.download = `${sanitizeZipBaseName(zipFileName)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
