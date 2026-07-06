"use client";

import { useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOrgDialog } from "@/components/org/create-org-dialog";
import Link from "next/link";

export function SettingsActions() {
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" variant="secondary" onClick={() => setShowCreateOrg(true)} className="w-full sm:w-auto">
          <Plus size={14} /> Nueva organización
        </Button>
        <Link href="/join" className="w-full sm:w-auto">
          <Button size="sm" variant="ghost" className="w-full sm:w-auto">
            <Link2 size={14} /> Unirme a otra
          </Button>
        </Link>
      </div>
      <CreateOrgDialog open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
    </>
  );
}
