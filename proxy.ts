import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  if (user) {
    return response;
  }

  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(authUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scan/:path*",
    "/report/:path*",
    "/pricing/checkout",
  ],
};
