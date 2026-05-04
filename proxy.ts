import { updateSession } from "@/lib/supabase-middleware";
import type { NextRequest, NextResponse } from "next/server";

const internalCacheControl =
  "private, no-store, no-cache, max-age=0, must-revalidate";
const internalRoutePaths = new Set(["/", "/login", "/select", "/copilot", "/ops"]);
const internalRoutePrefixes = ["/copilot/", "/ops/"];

function isInternalRoute(pathname: string) {
  return (
    internalRoutePaths.has(pathname) ||
    internalRoutePrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

function setInternalNoStoreHeaders(request: NextRequest, response: NextResponse) {
  if (!isInternalRoute(request.nextUrl.pathname)) {
    return response;
  }

  response.headers.set("Cache-Control", internalCacheControl);
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Surrogate-Control", "no-store");

  return response;
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  return setInternalNoStoreHeaders(request, response);
}

export const config = {
  matcher: ["/", "/login", "/select", "/copilot", "/copilot/:path*", "/ops", "/ops/:path*"],
};
