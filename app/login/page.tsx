"use client";

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
    <main className="min-h-screen bg-[#050505] text-zinc-100">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#27272a_0%,transparent_32%),linear-gradient(135deg,#050505_0%,#111111_46%,#050505_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-500/40 to-transparent" />

        <section className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/85 p-8 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              Nancy Monitor
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Iniciar sesión
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Accede al panel privado con tu cuenta autorizada.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Email
              </span>
              <span className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 transition focus-within:border-zinc-500">
                <span className="text-sm font-medium text-zinc-500" aria-hidden="true">
                  @
                </span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
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
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Contraseña
              </span>
              <span className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 transition focus-within:border-zinc-500">
                <span className="text-lg leading-none text-zinc-500" aria-hidden="true">
                  *
                </span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent"
                  aria-hidden="true"
                />
              ) : null}
              {isLoading ? "Ingresando..." : "Entrar al panel"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
