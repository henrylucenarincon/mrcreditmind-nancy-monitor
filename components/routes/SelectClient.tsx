"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { MessageSquare, Monitor, Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export function SelectClient() {
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
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
        <section
          className="w-full max-w-2xl overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-5 sm:px-8">
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--foreground)" }}
            >
              {theme === "dark" ? (
                <SunMedium className="h-4 w-4" style={{ color: "var(--brand-gold)" }} />
              ) : (
                <Moon className="h-4 w-4" style={{ color: "var(--brand-blue)" }} />
              )}
            </button>
          </div>

          <div className="px-6 pb-7 pt-2 sm:px-8 sm:pb-8">
            <div className="mb-8 text-center">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.34em]" style={{ color: "var(--brand-gold)" }}>
                Panel de Control
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
                Selecciona una herramienta
              </h1>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--foreground-soft)" }}>
                Elige la herramienta que necesitas usar hoy.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => router.push("/")}
                className="group rounded-2xl border p-6 text-left transition"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "#2a4059";
                  (e.currentTarget as HTMLButtonElement).style.borderLeftWidth = "3px";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--card-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.borderLeftWidth = "1px";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--card)";
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(42,64,89,0.10)" }}>
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
                className="group rounded-2xl border p-6 text-left transition"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "#b8a17f";
                  (e.currentTarget as HTMLButtonElement).style.borderLeftWidth = "3px";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--card-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.borderLeftWidth = "1px";
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--card)";
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(184,161,127,0.12)" }}>
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
