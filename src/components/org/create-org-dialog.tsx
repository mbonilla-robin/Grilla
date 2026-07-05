"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOrganization } from "@/lib/actions";

interface CreateOrgDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateOrgDialog({ open, onClose }: CreateOrgDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createOrganization(name);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
    router.push(`/org/${result.data!.id}/home`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Nueva organización</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Studio Creativo"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Crear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
