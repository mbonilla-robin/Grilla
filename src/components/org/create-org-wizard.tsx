"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOrganization } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  FORMAT_LABELS,
  ROLE_LABELS,
  type CreateOrganizationInput,
  type MemberRole,
  type OrgPillarInput,
  type OrgRoleSlotInput,
  type PostFormat,
} from "@/lib/types";

const STEPS = [
  "Nombre",
  "Cargos",
  "Pilares",
  "Formatos",
  "Cliente",
  "Marca",
  "Brand kit",
] as const;

const SETUP_ROLES: MemberRole[] = [
  "community_manager",
  "creator",
  "designer",
  "client",
];

const ONBOARDING_FORMATS: PostFormat[] = ["story", "reel", "image", "carousel"];

const PILLAR_COLORS = ["#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];

function defaultPillars(): OrgPillarInput[] {
  return [
    { name: "", color: PILLAR_COLORS[0], target_pct: 34 },
    { name: "", color: PILLAR_COLORS[1], target_pct: 33 },
    { name: "", color: PILLAR_COLORS[2], target_pct: 33 },
  ];
}

interface CreateOrgWizardProps {
  onClose?: () => void;
  showHeader?: boolean;
}

export function CreateOrgWizard({ onClose, showHeader = true }: CreateOrgWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [roleSlots, setRoleSlots] = useState<OrgRoleSlotInput[]>([
    { role: "community_manager" },
    { role: "designer" },
  ]);
  const [pillars, setPillars] = useState<OrgPillarInput[]>(defaultPillars);
  const [postFormats, setPostFormats] = useState<PostFormat[]>([
    "story",
    "reel",
    "image",
    "carousel",
  ]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [objective, setObjective] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [kitFile, setKitFile] = useState<File | null>(null);

  function toggleFormat(format: PostFormat) {
    setPostFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  }

  function addRoleSlot(role: MemberRole) {
    setRoleSlots((prev) => [...prev, { role }]);
  }

  function updateRoleSlot(index: number, patch: Partial<OrgRoleSlotInput>) {
    setRoleSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  }

  function removeRoleSlot(index: number) {
    setRoleSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function addPillar() {
    setPillars((prev) => [
      ...prev,
      {
        name: "",
        color: PILLAR_COLORS[prev.length % PILLAR_COLORS.length],
        target_pct: Math.max(0, 100 - prev.reduce((s, p) => s + p.target_pct, 0)),
      },
    ]);
  }

  function updatePillar(index: number, patch: Partial<OrgPillarInput>) {
    setPillars((prev) =>
      prev.map((pillar, i) => (i === index ? { ...pillar, ...patch } : pillar))
    );
  }

  function removePillar(index: number) {
    setPillars((prev) => prev.filter((_, i) => i !== index));
  }

  function validateStep(current: number): string | null {
    if (current === 0 && !name.trim()) return "Ingresa el nombre de la organización.";
    if (current === 2) {
      const valid = pillars.filter((p) => p.name.trim());
      if (valid.length === 0) return "Agrega al menos un pilar.";
    }
    if (current === 3 && postFormats.length === 0) {
      return "Selecciona al menos un formato de post.";
    }
    return null;
  }

  function goNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function uploadBrandFiles(orgId: string, brandKitId: string) {
    if (!logoFile && !kitFile) return;

    const supabase = createClient();
    const updates: Record<string, string> = {};

    if (logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `${orgId}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-kits")
        .upload(path, logoFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("brand-kits").getPublicUrl(path);
        updates.logo_url = data.publicUrl;
      }
    }

    if (kitFile) {
      const ext = kitFile.name.split(".").pop() || "pdf";
      const path = `${orgId}/kit-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("brand-kits")
        .upload(path, kitFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("brand-kits").getPublicUrl(path);
        updates.kit_file_url = data.publicUrl;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("brand_kits").update(updates).eq("id", brandKitId);
    }
  }

  async function handleSubmit() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }

    setError("");
    setLoading(true);

    const validPillars = pillars.filter((p) => p.name.trim());
    const payload: CreateOrganizationInput = {
      name: name.trim(),
      roleSlots: roleSlots.length > 0 ? roleSlots : undefined,
      pillars: validPillars,
      postFormats,
      clientName: clientName.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      toneOfVoice: toneOfVoice.trim() || undefined,
      objective: objective.trim() || undefined,
    };

    const result = await createOrganization(payload);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const orgId = result.data!.id;
    const brandKitId = result.data!.brandKitId;

    if (brandKitId && (logoFile || kitFile)) {
      await uploadBrandFiles(orgId, brandKitId);
    }

    onClose?.();
    router.push(`/org/${orgId}/home`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Nueva organización</h2>
            <p className="text-xs text-muted mt-0.5">
              Paso {step + 1} de {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-foreground" : "bg-neutral-200"
            )}
          />
        ))}
      </div>

      <div className="min-h-[280px]">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Cómo se llama la marca?</h3>
              <p className="text-xs text-muted mt-1">
                Este es el nombre de la organización o cuenta que vas a administrar.
              </p>
            </div>
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: PETROEQUIP"
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Qué cargos tiene el equipo?</h3>
              <p className="text-xs text-muted mt-1">
                Define los roles aunque aún no tengas a las personas registradas.
              </p>
            </div>

            <div className="space-y-2">
              {roleSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={slot.role}
                    onChange={(e) =>
                      updateRoleSlot(i, { role: e.target.value as MemberRole })
                    }
                    className="h-9 flex-1 rounded-md border border-border bg-surface px-2 text-sm"
                  >
                    {SETUP_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={slot.label || ""}
                    onChange={(e) => updateRoleSlot(i, { label: e.target.value })}
                    placeholder="Etiqueta (opcional)"
                    className="flex-[1.2]"
                  />
                  <button
                    type="button"
                    onClick={() => removeRoleSlot(i)}
                    className="text-muted hover:text-foreground p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SETUP_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => addRoleSlot(role)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-neutral-50"
                >
                  <Plus size={12} />
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Cuáles son los pilares de contenido?</h3>
              <p className="text-xs text-muted mt-1">
                Cada marca tiene sus propios pilares. Define nombre, color y meta mensual.
              </p>
            </div>

            <div className="space-y-2">
              {pillars.map((pillar, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_72px_auto] gap-2 items-center">
                  <input
                    type="color"
                    value={pillar.color}
                    onChange={(e) => updatePillar(i, { color: e.target.value })}
                    className="h-9 w-9 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={pillar.name}
                    onChange={(e) => updatePillar(i, { name: e.target.value })}
                    placeholder="Nombre del pilar"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pillar.target_pct}
                    onChange={(e) =>
                      updatePillar(i, {
                        target_pct: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="%"
                  />
                  <button
                    type="button"
                    onClick={() => removePillar(i)}
                    disabled={pillars.length <= 1}
                    className="text-muted hover:text-foreground p-1 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPillar}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <Plus size={12} /> Agregar pilar
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Qué formatos de post manejan?</h3>
              <p className="text-xs text-muted mt-1">
                Selecciona los tipos de contenido que produce esta marca.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ONBOARDING_FORMATS.map((format) => {
                const selected = postFormats.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFormat(format)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors",
                      selected
                        ? "border-foreground bg-neutral-50"
                        : "border-border hover:bg-neutral-50"
                    )}
                  >
                    {FORMAT_LABELS[format]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Quién es el cliente?</h3>
              <p className="text-xs text-muted mt-1">
                Opcional. Si tienes el correo, le enviaremos una invitación cuando se registre.
              </p>
            </div>
            <Input
              label="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: María González"
            />
            <Input
              label="Correo del cliente (opcional)"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@empresa.com"
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Tono y objetivo de marca</h3>
              <p className="text-xs text-muted mt-1">
                Opcional. Esto prellena el brand kit para que el equipo arranque alineado.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Tono comunicacional</label>
              <textarea
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                rows={2}
                placeholder="Profesional, cercano, técnico, inspirador..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Objetivo de la marca</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Posicionar la marca como referente en..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">¿Ya tienes un brand kit?</h3>
              <p className="text-xs text-muted mt-1">
                Opcional. Sube el logo o un archivo con la guía de marca (PDF, imagen).
              </p>
            </div>

            <label className="block rounded-lg border border-dashed border-border p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-muted shrink-0" />
                <div>
                  <p className="text-sm font-medium">Logo</p>
                  <p className="text-xs text-muted">
                    {logoFile ? logoFile.name : "PNG, JPG o SVG"}
                  </p>
                </div>
              </div>
            </label>

            <label className="block rounded-lg border border-dashed border-border p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setKitFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-muted shrink-0" />
                <div>
                  <p className="text-sm font-medium">Archivo de brand kit</p>
                  <p className="text-xs text-muted">
                    {kitFile ? kitFile.name : "PDF o imagen con colores, tipografías, guías"}
                  </p>
                </div>
              </div>
            </label>

            <div className="rounded-md bg-neutral-50 px-3 py-2.5 text-xs text-muted">
              Resumen: <strong className="text-foreground">{name}</strong>
              {roleSlots.length > 0 && (
                <>
                  {" · "}
                  {roleSlots.length} cargo{roleSlots.length !== 1 ? "s" : ""}
                </>
              )}
              {" · "}
              {pillars.filter((p) => p.name.trim()).length} pilar
              {pillars.filter((p) => p.name.trim()).length !== 1 ? "es" : ""}
              {" · "}
              {postFormats.length} formato{postFormats.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between gap-2 pt-1">
        {step === 0 && !onClose ? (
          <div />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={step === 0 ? onClose : goBack}
            disabled={loading || (step === 0 && !onClose)}
          >
            {step === 0 ? "Cancelar" : "Atrás"}
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button type="button" size="sm" onClick={goNext}>
            Siguiente
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleSubmit} loading={loading}>
            Crear organización
          </Button>
        )}
      </div>
    </div>
  );
}
