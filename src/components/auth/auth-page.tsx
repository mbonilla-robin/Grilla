"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type AuthStep = "login" | "register";

interface AuthPageProps {
  initialStep: AuthStep;
}

export function AuthPage({ initialStep }: AuthPageProps) {
  return (
    <Suspense>
      <AuthPageContent initialStep={initialStep} />
    </Suspense>
  );
}

function AuthPageContent({ initialStep }: AuthPageProps) {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const resolvedStep: AuthStep =
    modeParam === "login"
      ? "login"
      : modeParam === "register"
        ? "register"
        : initialStep;

  if (resolvedStep === "login") {
    return <LoginStep />;
  }

  return <RegisterStep />;
}

function LoginStep() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message =
        error.message === "Email not confirmed"
          ? "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada."
          : error.message === "Invalid login credentials"
            ? "Credenciales incorrectas"
            : error.message;
      setError(message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthLayout
      variant="login"
      title="Inicia sesión"
      subtitle="Bienvenido de vuelta. Ingresa a tu cuenta."
      footer={
        <p className="text-center text-sm text-muted">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Regístrate aquí
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="auth-pill-input"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="auth-pill-input"
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="auth-pill-btn w-full"
          size="lg"
          loading={loading}
        >
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}

function RegisterStep() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        "Cuenta creada. Desactiva 'Confirm email' en Supabase para entrar automáticamente."
      );
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthLayout
      variant="register"
      title="Crea tu cuenta"
      subtitle="Empieza gratis y configura tu espacio en minutos."
      footer={
        <p className="text-center text-sm text-muted">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Inicia sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            className="auth-pill-input"
            autoComplete="given-name"
            required
          />
          <Input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellido"
            className="auth-pill-input"
            autoComplete="family-name"
            required
          />
        </div>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="auth-pill-input"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          minLength={6}
          className="auth-pill-input"
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="auth-pill-btn w-full"
          size="lg"
          loading={loading}
        >
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
