import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function getSafeNextPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");

  if (next?.startsWith("/")) {
    return next;
  }

  return "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectTo = request.nextUrl.clone();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirectTo.pathname = getSafeNextPath(request);
      redirectTo.search = "";
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.search = "";
  return NextResponse.redirect(redirectTo);
}
