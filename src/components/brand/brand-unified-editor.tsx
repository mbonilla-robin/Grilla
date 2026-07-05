"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandStrategyTab } from "./brand-strategy-tab";
import { BrandVisualTab } from "./brand-visual-tab";
import { BrandPillarsTab } from "./brand-pillars-tab";
import { BrandHashtagsTab } from "./brand-hashtags-tab";
import type { BrandKit, ContentPillar, OrgHashtagGroup } from "@/lib/types";

const TABS = [
  { id: "estrategia", label: "Estrategia" },
  { id: "visual", label: "Visual" },
  { id: "pilares", label: "Pilares" },
  { id: "hashtags", label: "Hashtags" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface BrandUnifiedEditorProps {
  orgId: string;
  orgName: string;
  brandKit: BrandKit;
  pillars: ContentPillar[];
  hashtagGroups: OrgHashtagGroup[];
  canEdit: boolean;
  initialTab?: string;
}

export function BrandUnifiedEditor({
  orgId,
  orgName,
  brandKit,
  pillars,
  hashtagGroups,
  canEdit,
  initialTab,
}: BrandUnifiedEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || initialTab || "estrategia";
  const activeTab = (TABS.find((t) => t.id === tabParam)?.id || "estrategia") as TabId;

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/org/${orgId}/marca?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "estrategia" && (
        <BrandStrategyTab
          orgId={orgId}
          orgName={orgName}
          brandKit={brandKit}
          canEdit={canEdit}
        />
      )}
      {activeTab === "visual" && (
        <BrandVisualTab orgId={orgId} brandKit={brandKit} canEdit={canEdit} />
      )}
      {activeTab === "pilares" && (
        <BrandPillarsTab
          orgId={orgId}
          orgName={orgName}
          pillars={pillars}
          canEdit={canEdit}
        />
      )}
      {activeTab === "hashtags" && (
        <BrandHashtagsTab
          orgId={orgId}
          groups={hashtagGroups}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
