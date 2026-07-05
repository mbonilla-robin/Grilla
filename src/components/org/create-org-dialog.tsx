"use client";

import { CreateOrgWizard } from "./create-org-wizard";

interface CreateOrgDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateOrgDialog({ open, onClose }: CreateOrgDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg">
        <CreateOrgWizard onClose={onClose} />
      </div>
    </div>
  );
}
