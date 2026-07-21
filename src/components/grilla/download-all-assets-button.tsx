"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadAssetsAsZip } from "@/lib/download-assets-zip";
import type { PostAsset } from "@/lib/types";

interface DownloadAllAssetsButtonProps {
  assets: PostAsset[];
  zipFileName?: string;
}

export function DownloadAllAssetsButton({
  assets,
  zipFileName,
}: DownloadAllAssetsButtonProps) {
  const [loading, setLoading] = useState(false);
  const readyCount = assets.filter((a) => !a.id.startsWith("temp-")).length;

  if (readyCount === 0) return null;

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await downloadAssetsAsZip(assets, zipFileName);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      loading={loading}
      onClick={handleClick}
      title="Descargar todos los archivos en un ZIP"
    >
      {!loading && <Download size={13} />}
      {loading ? "Preparando…" : "Descargar ZIP"}
    </Button>
  );
}
