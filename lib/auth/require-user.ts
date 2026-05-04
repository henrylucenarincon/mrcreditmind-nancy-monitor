import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export type AuthenticatedUserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  email: string | null;
};

export class AuthRequiredError extends Error {
  status = 401 as const;

  constructor(message = "No autenticado.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "No autenticado." }, { status: 401 });
}

export async function requireUser(): Promise<AuthenticatedUserContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthRequiredError();
  }

  return {
    supabase,
    user,
    email: user.email ?? null,
  };
}
