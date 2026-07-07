"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteOrgIdentifier, saveOrgIdentifier, updateOrgIdentifierPhoto } from "@/lib/actions";
import { uploadCatalogIdentifierPhoto } from "@/lib/identifier-photo";
import type { OrgIdentifier } from "@/lib/types";
import type { OrgIdentifierConfig } from "@/lib/org-identifier";

interface BrandIdentifierTabProps {
  orgId: string;
  config: OrgIdentifierConfig;
  identifiers: OrgIdentifier[];
  canEdit: boolean;
}

export function BrandIdentifierTab({
  orgId,
  config: initialConfig,
  identifiers: initialIdentifiers,
  canEdit,
}: BrandIdentifierTabProps) {
  const router = useRouter();
  const [identifiers, setIdentifiers] = useState(initialIdentifiers);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState(initialConfig.label || "");
  const [value, setValue] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldLabel = initialConfig.label || label;

  function resetForm() {
    setValue("");
    setPhotoFile(null);
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function handlePhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPhotoFile(file);
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const fieldName = (initialConfig.label || label).trim();
    if (!fieldName) {
      setError("Define el nombre del campo (ej: Placa)");
      setSaving(false);
      return;
    }

    const result = await saveOrgIdentifier(orgId, {
      value,
      label: initialConfig.label ? undefined : fieldName,
      allow_photo: true,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    let photoUrl = result.data?.photo_url || null;
    if (photoFile && result.data?.id) {
      const uploaded = await uploadCatalogIdentifierPhoto(
        orgId,
        result.data.id,
        photoFile
      );
      if (uploaded.error) {
        setError(uploaded.error);
        setSaving(false);
        return;
      }
      photoUrl = uploaded.url || null;
      if (photoUrl) {
        await updateOrgIdentifierPhoto(orgId, result.data.id, photoUrl);
      }
    }

    const newItem = {
      ...(result.data as OrgIdentifier),
      photo_url: photoUrl,
    };
    setIdentifiers((prev) => [...prev, newItem]);
    closeForm();
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este identificador?")) return;
    const result = await deleteOrgIdentifier(orgId, id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setIdentifiers((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-w-2xl">
        <h3 className="text-sm font-medium">Identificadores</h3>
        <p className="text-sm text-muted leading-relaxed">
          Aquí registras los sujetos de tus posts — placas de carros, platos,
          productos, etc. Cada uno lleva su valor y, si aplica, una foto de
          referencia que aparece en los briefs.
        </p>
      </div>

      {fieldLabel && (
        <p className="text-sm">
          Campo en la grilla:{" "}
          <span className="font-medium">{fieldLabel}</span>
        </p>
      )}

      {identifiers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {identifiers.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border overflow-hidden bg-surface"
            >
              <div className="aspect-[4/3] bg-neutral-100">
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photo_url}
                    alt={item.value}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {fieldLabel || "Valor"}
                  </p>
                  <p className="text-sm font-semibold truncate">{item.value}</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 p-1.5 rounded text-muted hover:text-destructive hover:bg-neutral-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted py-8 text-center rounded-lg border border-dashed border-border">
          Aún no hay identificadores. Agrega el primero para usarlo en la grilla.
        </p>
      )}

      {canEdit && !showForm && (
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Agregar identificador
        </Button>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="max-w-md space-y-4 rounded-lg border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Nuevo identificador</h4>
            <button
              type="button"
              onClick={closeForm}
              className="text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {!initialConfig.label && (
            <Input
              label="Nombre del campo"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Placa, Plato, Producto"
              required
            />
          )}

          <Input
            label={fieldLabel || "Valor"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={initialConfig.placeholder || "Ej: 73UCAA"}
            required
          />

          <div className="space-y-2">
            <label className="text-sm text-muted">Foto de referencia</label>
            {photoPreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Vista previa"
                  className="h-32 w-auto max-w-full rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    if (photoPreview?.startsWith("blob:")) {
                      URL.revokeObjectURL(photoPreview);
                    }
                    setPhotoPreview(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface/50 text-muted hover:border-foreground/20 hover:text-foreground">
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}
                <span className="text-xs">Subir foto</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => handlePhoto(e.target.files)}
                />
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
