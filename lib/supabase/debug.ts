import type { Session, User } from "@supabase/supabase-js";

type CookieEntry = {
  name: string;
  value: string;
};

export function logAuthDebug(
  label: string,
  details: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log(`[auth-debug] ${label}`, details);
}

export function summarizeCookieState(cookies: CookieEntry[]) {
  const authCookies = cookies.filter(({ name }) => name.startsWith("sb-"));

  return {
    authCookieCount: authCookies.length,
    authCookieNames: authCookies.map(({ name }) => name),
    authCookieSizes: authCookies.reduce<Record<string, number>>(
      (sizes, { name, value }) => {
        sizes[name] = value.length;
        return sizes;
      },
      {},
    ),
    hasCodeVerifier: cookies.some(({ name }) => name.endsWith("-code-verifier")),
    totalCookieCount: cookies.length,
  };
}

export function summarizeSession(session: Session | null) {
  if (!session) {
    return {
      accessTokenLength: 0,
      expiresAt: null,
      hasSession: false,
      refreshTokenLength: 0,
      sessionUserId: null,
    };
  }

  return {
    accessTokenLength: session.access_token.length,
    expiresAt: session.expires_at ?? null,
    hasSession: true,
    refreshTokenLength: session.refresh_token.length,
    sessionUserId: session.user?.id ?? null,
  };
}

export function summarizeUser(user: User | null) {
  if (!user) {
    return {
      email: null,
      id: null,
    };
  }

  return {
    email: user.email ?? null,
    id: user.id,
  };
}
