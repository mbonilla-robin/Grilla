"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/actions";
import type { Profile } from "@/lib/types";

interface ProfileEditorProps {
  profile: Profile;
  email: string;
}

export function ProfileEditor({ profile, email }: ProfileEditorProps) {
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [jobTitle, setJobTitle] = useState(profile.job_title || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const result = await updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      job_title: jobTitle || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      <Input label="Correo" type="email" value={email} disabled />

      <Input
        label="Cargo"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        placeholder="Diseñador, Community Manager..."
      />

      <Input
        label="Teléfono"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+57 300 000 0000"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={saving}>
          Guardar perfil
        </Button>
        {saved && <span className="text-xs text-success">Guardado</span>}
      </div>
    </form>
  );
}
