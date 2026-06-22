import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logAuthDebug, summarizeCookieState } from "@/lib/supabase/debug";
import type { Database } from "@/types/database";

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();
  const requestCookies = cookieStore.getAll();

  logAuthDebug("createSupabaseServerClient", {
    cookieState: summarizeCookieState(requestCookies),
  });

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });

          logAuthDebug("createSupabaseServerClient.setAll", {
            cookieState: summarizeCookieState(cookieStore.getAll()),
            cookiesToSet: cookiesToSet.map(({ name, options, value }) => ({
              maxAge: options.maxAge ?? null,
              name,
              valueLength: value.length,
            })),
          });
        } catch {
          // Server Components cannot always write cookies. Proxy handles refreshes.
        }
      },
    },
  });
}
