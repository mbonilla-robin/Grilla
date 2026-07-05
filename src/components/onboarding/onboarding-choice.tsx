"use client";

import { useState } from "react";
import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingForm } from "./onboarding-form";
import { JoinOrganization } from "./join-organization";
import type { Invitation, Organization } from "@/lib/types";

type OnboardingMode = "choose" | "create" | "join";

interface OnboardingChoiceProps {
  pendingInvitations: (Invitation & { organization?: Organization })[];
  userEmail: string;
}

export function OnboardingChoice({
  pendingInvitations,
  userEmail,
}: OnboardingChoiceProps) {
  const [mode, setMode] = useState<OnboardingMode>("choose");

  if (mode === "create") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("choose")}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Volver
        </button>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Configura tu organización</h1>
          <p className="text-sm text-muted">
            Nombre, equipo, pilares, formatos y brand kit en unos minutos
          </p>
        </div>
        <OnboardingForm />
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("choose")}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Volver
        </button>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Únete a una organización</h1>
          <p className="text-sm text-muted">
            Si te invitaron, acepta la invitación aquí
          </p>
        </div>
        <JoinOrganization
          pendingInvitations={pendingInvitations}
          userEmail={userEmail}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">¿Cómo quieres empezar?</h1>
        <p className="text-sm text-muted">
          Elige según tu rol en el equipo
        </p>
      </div>

      <div className="grid gap-3">
        <button
          onClick={() => setMode("create")}
          className={cn(
            "flex items-start gap-4 rounded-lg border border-border bg-surface p-4 text-left",
            "hover:border-foreground/20 hover:bg-background transition-colors"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background">
            <Building2 size={20} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">Crear organización</p>
            <p className="text-xs text-muted mt-1">
              Eres community manager o líder del equipo
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode("join")}
          className={cn(
            "flex items-start gap-4 rounded-lg border border-border bg-surface p-4 text-left",
            "hover:border-foreground/20 hover:bg-background transition-colors"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background">
            <Users size={20} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">Unirme a una organización</p>
            <p className="text-xs text-muted mt-1">
              Eres diseñador, creadora o cliente invitado
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
