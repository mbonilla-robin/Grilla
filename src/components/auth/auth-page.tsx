"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type AuthStep = "login" | "register";

interface AuthPageProps {
  initialStep: AuthStep;
}

const AUTH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} tardó demasiado. Revisa tu conexión e inténtalo de nuevo.`));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function clearBrowserAuthResidue() {
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage access errors
  }
}

function friendlyAuthError(message: string) {
  if (message === "Email not confirmed") {
    return "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.";
  }
  if (message === "Invalid login credentials") {
    return "Credenciales incorrectas";
  }
  if (message === "Failed to fetch" || message.toLowerCase().includes("fetch")) {
    return "No se pudo conectar con el servidor de autenticación. Revisa tu conexión e inténtalo de nuevo.";
  }
  return message;
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
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Drop stale cookies/local session without waiting on a hung refresh.
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
      ]);
      clearBrowserAuthResidue();

      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        "El inicio de sesión"
      );

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        setLoading(false);
        return;
      }

      // Full navigation so auth cookies are sent on the next request.
      window.location.assign(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      setError(friendlyAuthError(message));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      variant="login"
      title="Inicia sesión"
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
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        }),
        AUTH_TIMEOUT_MS,
        "El registro"
      );

      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        setLoading(false);
        return;
      }

      if (!data.session) {
        const { error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS,
          "El inicio de sesión"
        );

        if (signInError) {
          setError(
            "Cuenta creada. Desactiva 'Confirm email' en Supabase para entrar automáticamente."
          );
          setLoading(false);
          return;
        }
      }

      window.location.assign(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cuenta";
      setError(friendlyAuthError(message));
      setLoading(false);
    }
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
