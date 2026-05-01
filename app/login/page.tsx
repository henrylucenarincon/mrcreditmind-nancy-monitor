"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0E0E10] text-[#F0EBE5]">
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,161,127,0.14)_0%,transparent_28%),radial-gradient(circle_at_85%_20%,rgba(75,95,130,0.14)_0%,transparent_24%),linear-gradient(135deg,#0E0E10_0%,#161416_48%,#0E0E10_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B8A17F]/40 to-transparent" />
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#B8A17F]/10 blur-3xl" />

        <section className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/8 bg-[#141315]/88 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/6 px-6 py-5 sm:px-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#B8A17F]/35 bg-[#1B1A1C] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                <Image
                  src="/brand/nancy-mark.png"
                  alt="Nancy Monitor"
                  fill
                  className="object-cover"
                  sizes="56px"
                  priority
                />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-[#B8A17F]">
                  Nancy Monitor
                </p>
                <p className="mt-1 text-sm text-[#DCD1BF]/72">
                  Acceso privado del equipo interno
                </p>
              </div>
            </div>

            <Image
              src="/brand/mrcreditmind-logo.svg"
              alt="Mr. CREDITMIND"
              width={220}
              height={40}
              className="h-auto w-[180px] opacity-95 sm:w-[210px]"
              priority
            />
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-7">
              <h1 className="text-3xl font-semibold tracking-tight text-[#F0EBE5] sm:text-[2rem]">
                Iniciar sesión
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#DCD1BF]/72">
                Accede al panel de monitoreo de conversaciones con tu cuenta autorizada.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2.5 block text-sm font-medium text-[#E6DFD1]">
                  Email
                </span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0D0D0F] px-4 py-3.5 text-[#F0EBE5] transition focus-within:border-[#B8A17F]/55 focus-within:bg-[#111114]">
                  <span className="text-sm font-medium text-[#B8A17F]" aria-hidden="true">
                    @
                  </span>
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#DCD1BF]/34"
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
                <span className="mb-2.5 block text-sm font-medium text-[#E6DFD1]">
                  Contraseña
                </span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0D0D0F] px-4 py-3.5 text-[#F0EBE5] transition focus-within:border-[#B8A17F]/55 focus-within:bg-[#111114]">
                  <span className="text-lg leading-none text-[#B8A17F]" aria-hidden="true">
                    *
                  </span>
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#DCD1BF]/34"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    className="rounded-xl px-2 py-1 text-sm font-medium text-[#DCD1BF]/72 transition hover:bg-white/5 hover:text-[#F0EBE5] disabled:cursor-not-allowed disabled:opacity-50"
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
                <p className="rounded-2xl border border-[#B8A17F]/25 bg-[#B8A17F]/10 px-4 py-3 text-sm text-[#F0EBE5]">
                  {error}
                </p>
              ) : null}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B8A17F] px-4 py-3.5 text-sm font-semibold text-[#141315] transition hover:bg-[#D2BEA0] disabled:cursor-not-allowed disabled:bg-[#5C554A] disabled:text-[#E6DFD1]/60"
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