import "server-only";

import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import type { Database } from "@/types/database";

const allowedEmailOtpTypes: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function buildAuthRedirect(
  request: NextRequest,
  nextPath: string,
  errorMessage: string,
) {
  const redirectUrl = new URL("/auth", request.url);
  redirectUrl.searchParams.set("error", errorMessage);
  redirectUrl.searchParams.set("next", nextPath);

  return redirectUrl;
}

function parseNestedUrl(
  value: string | null,
  requestUrl: URL,
): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, requestUrl);
  } catch {
    return null;
  }
}

function getSearchScopes(request: NextRequest) {
  const scopes: URL[] = [new URL(request.nextUrl.toString())];
  const confirmationUrl = parseNestedUrl(
    request.nextUrl.searchParams.get("confirmation_url"),
    request.nextUrl,
  );
  const redirectTo = parseNestedUrl(
    request.nextUrl.searchParams.get("redirect_to"),
    request.nextUrl,
  );

  if (confirmationUrl) {
    scopes.push(confirmationUrl);
  }

  if (redirectTo) {
    scopes.push(redirectTo);
  }

  return scopes;
}

function getFirstSearchParam(
  request: NextRequest,
  key: string,
) {
  for (const scope of getSearchScopes(request)) {
    const value = scope.searchParams.get(key);

    if (value) {
      return value;
    }
  }

  return null;
}

function getCandidateTypes(typeParam: string | null) {
  const types: EmailOtpType[] = [];

  if (typeParam && allowedEmailOtpTypes.includes(typeParam as EmailOtpType)) {
    types.push(typeParam as EmailOtpType);
  }

  if (typeParam === "magiclink" || typeParam === "signup") {
    types.push("email");
  }

  if (!typeParam) {
    types.push("email");
  }

  return types.filter(
    (type, index, allTypes) => allTypes.indexOf(type) === index,
  );
}

type VerifyCandidate =
  | {
      mode: "token";
      params: {
        email: string;
        token: string;
        type: EmailOtpType;
      };
    }
  | {
      mode: "token_hash";
      params: {
        token_hash: string;
        type: EmailOtpType;
      };
    };

function createVerifyCandidates(request: NextRequest) {
  const email = getFirstSearchParam(request, "email");
  const token = getFirstSearchParam(request, "token");
  const tokenHash = getFirstSearchParam(request, "token_hash");
  const candidateTypes = getCandidateTypes(getFirstSearchParam(request, "type"));
  const candidates: VerifyCandidate[] = [];

  for (const type of candidateTypes) {
    if (tokenHash) {
      candidates.push({
        mode: "token_hash",
        params: {
          token_hash: tokenHash,
          type,
        },
      });
    }

    if (token && email) {
      candidates.push({
        mode: "token",
        params: {
          email,
          token,
          type,
        },
      });
    }

    if (token) {
      candidates.push({
        mode: "token_hash",
        params: {
          token_hash: token,
          type,
        },
      });
    }
  }

  return candidates.filter((candidate, index, allCandidates) => {
    const candidateKey = JSON.stringify(candidate);
    return (
      index ===
      allCandidates.findIndex(
        (nestedCandidate) => JSON.stringify(nestedCandidate) === candidateKey,
      )
    );
  });
}

async function verifyOtpCandidates(
  supabase: SupabaseClient<Database>,
  candidates: VerifyCandidate[],
) {
  let lastError: string | null = null;

  for (const candidate of candidates) {
    const { error } =
      candidate.mode === "token"
        ? await supabase.auth.verifyOtp(candidate.params)
        : await supabase.auth.verifyOtp(candidate.params);

    if (!error) {
      return {
        error: null,
      };
    }

    lastError = error.message;
  }

  return {
    error: lastError ?? "The magic link could not be verified.",
  };
}

export async function completeAuthCallback(
  request: NextRequest,
  createSupabaseServerClient: () => Promise<SupabaseClient<Database>>,
) {
  const nextPath = getSafeRedirectPath(getFirstSearchParam(request, "next"));
  const providerError =
    getFirstSearchParam(request, "error_description") ??
    getFirstSearchParam(request, "error");

  if (providerError) {
    return NextResponse.redirect(
      buildAuthRedirect(request, nextPath, providerError),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const code = getFirstSearchParam(request, "code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          buildAuthRedirect(
            request,
            nextPath,
            "The sign-in callback could not be completed.",
          ),
        );
      }

      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    const accessToken = getFirstSearchParam(request, "access_token");
    const refreshToken = getFirstSearchParam(request, "refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return NextResponse.redirect(
          buildAuthRedirect(
            request,
            nextPath,
            "The sign-in session could not be restored.",
          ),
        );
      }

      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    const verifyCandidates = createVerifyCandidates(request);

    if (verifyCandidates.length > 0) {
      const { error } = await verifyOtpCandidates(supabase, verifyCandidates);

      if (error) {
        return NextResponse.redirect(
          buildAuthRedirect(
            request,
            nextPath,
            "The magic link could not be verified.",
          ),
        );
      }

      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    return NextResponse.redirect(
      buildAuthRedirect(
        request,
        nextPath,
        "The sign-in link is invalid or expired.",
      ),
    );
  } catch {
    return NextResponse.redirect(
      buildAuthRedirect(
        request,
        nextPath,
        "Supabase is not configured yet. Add your environment variables and try again.",
      ),
    );
  }
}
