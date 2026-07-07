"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Grid3x3, Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewPostDialog } from "@/components/grilla/new-post-dialog";
import { GrillaBuilderDialog } from "@/components/grilla/grilla-builder-dialog";
import { GrillaExcelImportDialog } from "@/components/grilla/grilla-excel-import-dialog";
import type { ContentPillar, OrgHashtagGroup, OrgIdentifier, PostFormat } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";
import type { PostAssignmentOptions } from "@/lib/team-assignments";
import type { CatalogEvent } from "@/lib/calendar-types";

type Mode = "menu" | "single" | "grid" | "excel";

interface AddToGrillaButtonProps {
  orgId: string;
  assignmentOptions: PostAssignmentOptions;
  currentUserId: string;
  pillarOptions?: string[];
  pillars?: ContentPillar[];
  hashtagGroups?: OrgHashtagGroup[];
  identifierConfig?: OrgIdentifierConfig;
  identifiers?: OrgIdentifier[];
  allowedFormats?: PostFormat[];
  catalogEvents?: CatalogEvent[];
  triggerClassName?: string;
}

export function AddToGrillaButton({
  orgId,
  assignmentOptions,
  currentUserId,
  pillarOptions,
  pillars,
  hashtagGroups,
  identifierConfig,
  identifiers,
  allowedFormats,
  catalogEvents = [],
  triggerClassName,
}: AddToGrillaButtonProps) {
  const [mode, setMode] = useState<Mode>("menu");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  function pick(next: Mode) {
    setMenuOpen(false);
    setMode(next);
  }

  function closeDialog() {
    setMode("menu");
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <Button
          size="sm"
          onClick={() => setMenuOpen((v) => !v)}
          className={triggerClassName}
        >
          <Plus size={14} />
          Agregar
          <ChevronDown size={12} className="opacity-70" />
        </Button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => pick("single")}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-background transition-colors"
            >
              <Plus size={14} className="text-muted shrink-0" />
              <div>
                <p className="font-medium">Un post</p>
                <p className="text-[11px] text-muted">Agregar un solo post</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => pick("grid")}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-background transition-colors border-t border-border"
            >
              <Grid3x3 size={14} className="text-muted shrink-0" />
              <div>
                <p className="font-medium">Crear grilla</p>
                <p className="text-[11px] text-muted">Planificar el mes completo</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => pick("excel")}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-background transition-colors border-t border-border"
            >
              <FileSpreadsheet size={14} className="text-muted shrink-0" />
              <div>
                <p className="font-medium">Importar Excel</p>
                <p className="text-[11px] text-muted">Subir hoja con preview</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <NewPostDialog
        orgId={orgId}
        assignmentOptions={assignmentOptions}
        currentUserId={currentUserId}
        pillarOptions={pillarOptions}
        hashtagGroups={hashtagGroups}
        identifierConfig={identifierConfig}
        identifiers={identifiers}
        allowedFormats={allowedFormats}
        open={mode === "single"}
        onOpenChange={(open) => (open ? setMode("single") : closeDialog())}
        hideTrigger
      />

      <GrillaBuilderDialog
        orgId={orgId}
        assignmentOptions={assignmentOptions}
        currentUserId={currentUserId}
        pillarOptions={pillarOptions}
        pillars={pillars}
        hashtagGroups={hashtagGroups}
        identifierConfig={identifierConfig}
        identifiers={identifiers}
        allowedFormats={allowedFormats}
        catalogEvents={catalogEvents}
        open={mode === "grid"}
        onOpenChange={(open) => (open ? setMode("grid") : closeDialog())}
      />

      <GrillaExcelImportDialog
        orgId={orgId}
        assignmentOptions={assignmentOptions}
        currentUserId={currentUserId}
        pillarOptions={pillarOptions}
        pillars={pillars}
        allowedFormats={allowedFormats}
        open={mode === "excel"}
        onOpenChange={(open) => (open ? setMode("excel") : closeDialog())}
      />
    </>
  );
}
