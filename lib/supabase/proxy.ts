import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import {
  logAuthDebug,
  summarizeCookieState,
  summarizeSession,
  summarizeUser,
} from "@/lib/supabase/debug";
import type { Database } from "@/types/database";

type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
};

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<SessionUpdateResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const requestHeaders = new Headers(request.headers);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response,
      user: null,
    };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        requestHeaders.set("cookie", request.cookies.toString());

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        logAuthDebug("updateSupabaseSession.setAll", {
          cookieState: summarizeCookieState(request.cookies.getAll()),
          cookiesToSet: cookiesToSet.map(({ name, options, value }) => ({
            maxAge: options.maxAge ?? null,
            name,
            valueLength: value.length,
          })),
          responseHeaders: headers,
        });
      },
    },
  });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  logAuthDebug("updateSupabaseSession", {
    cookieState: summarizeCookieState(request.cookies.getAll()),
    path: request.nextUrl.pathname,
    sessionError: sessionError?.message ?? null,
    sessionState: summarizeSession(session),
    user: summarizeUser(user),
    userError: userError?.message ?? null,
  });

  return {
    response,
    user,
  };
}
