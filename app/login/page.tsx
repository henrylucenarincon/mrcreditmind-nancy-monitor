"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, SunMedium } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type ThemeMode = "dark" | "light";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message || "No pudimos iniciar sesión.");
      return;
    }

    router.replace("/select");
    router.refresh();
  }

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "light" ? "light" : "dark");
  }, []);

  function handleToggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("nancy-theme", next);
      return next;
    });
  }

  return (
    <main className="min-h-screen overflow-hidden" style={{ color: "var(--foreground)" }}>
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,161,127,0.12)_0%,transparent_26%),radial-gradient(circle_at_82%_18%,rgba(75,95,130,0.10)_0%,transparent_18%),linear-gradient(135deg,var(--background)_0%,var(--panel)_46%,var(--background)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-gold)]/35 to-transparent" />
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />

        <section
          className="relative w-full max-w-md overflow-hidden rounded-[28px] border backdrop-blur-xl"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "color-mix(in srgb, var(--panel) 88%, transparent)",
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <div className="border-b px-6 py-6 sm:px-8" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-4">
              <Image
                src={theme === "light" ? "/brand/mrcreditmind-logo-dark.svg" : "/brand/mrcreditmind-logo.svg"}
                alt="Mr. CREDITMIND"
                width={220}
                height={40}
                className="h-auto w-[170px] opacity-95 sm:w-[200px]"
                priority
              />

              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label="Cambiar tema"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition hover:bg-white/5"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: "var(--foreground)",
                }}
              >
                {theme === "dark" ? (
                  <SunMedium className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
                ) : (
                  <Moon className="h-4 w-4" style={{ color: "var(--brand-blue)" }} />
                )}
              </button>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-7">
              <p
                className="mb-3 text-[11px] font-medium uppercase tracking-[0.34em]"
                style={{ color: "var(--brand-gold)" }}
              >
                Nancy Monitor
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
                Iniciar sesión
              </h1>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--foreground-soft)" }}>
                Accede al panel interno con tu cuenta autorizada.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2.5 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Email
                </span>
                <span
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--brand-gold)" }} aria-hidden="true">
                    @
                  </span>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: "var(--foreground)" }}
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isLoading}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2.5 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Contraseña
                </span>
                <span
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                >
                  <span className="text-lg leading-none" style={{ color: "var(--brand-gold)" }} aria-hidden="true">
                    *
                  </span>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: "var(--foreground)" }}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    className="rounded-xl px-2 py-1 text-sm font-medium transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ color: "var(--foreground-soft)" }}
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </span>
              </label>

              {error ? (
                <p
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--status-danger-border)",
                    backgroundColor: "var(--status-danger-bg)",
                    color: "var(--status-danger-text)",
                  }}
                >
                  {error}
                </p>
              ) : null}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: "var(--brand-gold)",
                  color: "#141315",
                }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#141315]/40 border-t-transparent"
                    aria-hidden="true"
                  />
                ) : null}
                {isLoading ? "Ingresando..." : "Entrar al panel"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}