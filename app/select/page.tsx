"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { MessageSquare, Monitor, Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export default function SelectPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("light");

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

        <section className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border backdrop-blur-xl" style={{ borderColor: "var(--border-soft)", backgroundColor: "color-mix(in srgb, var(--panel) 88%, transparent)", boxShadow: "var(--shadow-panel)" }}>
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
                style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.03)", color: "var(--foreground)" }}
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
            <div className="mb-8 text-center">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.34em]" style={{ color: "var(--brand-gold)" }}>
                Panel de Control
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
                ¿Dónde quieres ir?
              </h1>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--foreground-soft)" }}>
                Selecciona la herramienta que necesitas usar hoy.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => router.push("/")}
                className="group relative overflow-hidden rounded-2xl border p-6 text-left transition hover:bg-white/5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-blue-soft)" }}>
                    <Monitor className="h-6 w-6" style={{ color: "var(--brand-blue)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
                      Nancy Monitor
                    </h3>
                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                      Monitorea conversaciones y leads en tiempo real
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push("/copilot")}
                className="group relative overflow-hidden rounded-2xl border p-6 text-left transition hover:bg-white/5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--brand-gold)", opacity: 0.1 }}>
                    <MessageSquare className="h-6 w-6" style={{ color: "var(--brand-gold)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
                      Nancy Copilot
                    </h3>
                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                      Asistente inteligente para análisis y soporte
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}