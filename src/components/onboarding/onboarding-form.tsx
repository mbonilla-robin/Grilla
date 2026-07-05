"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOrganization } from "@/lib/actions";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    router.push(`/org/${result.data!.id}/home`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre de la organización"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Studio Creativo"
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" loading={loading}>
        Continuar
      </Button>
    </form>
  );
}
