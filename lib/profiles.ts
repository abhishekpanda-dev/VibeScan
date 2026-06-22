import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuthDebug } from "@/lib/supabase/debug";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type DatabaseClient = SupabaseClient<Database>;

function buildProfileInsert(userId: string, email: string | null | undefined): ProfileInsert {
  return {
    email: email ?? "",
    id: userId,
    scan_credits: 0,
    subscription_status: "free",
    subscription_tier: "none",
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown profile bootstrap error.";
}

function isDuplicateKeyError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : null;

  return code === "23505" || Boolean(message?.toLowerCase().includes("duplicate key"));
}

async function getProfileRecord(
  supabase: DatabaseClient,
  userId: string,
  source: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  logAuthDebug("profiles.getProfileRecord", {
    error: error?.message ?? null,
    foundProfile: Boolean(data),
    source,
    userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function insertProfileRecord(
  supabase: DatabaseClient,
  payload: ProfileInsert,
  source: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .single();

  logAuthDebug("profiles.insertProfileRecord", {
    error: error?.message ?? null,
    insertedProfileId: data?.id ?? null,
    source,
    userId: payload.id,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureProfileRecord(
  supabase: DatabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<ProfileRow> {
  const existingProfile = await getProfileRecord(supabase, userId, "user_scoped_lookup");

  if (existingProfile) {
    return existingProfile;
  }

  const payload = buildProfileInsert(userId, email);
  const creationErrors: string[] = [];

  logAuthDebug("profiles.ensureProfileRecord.missingProfile", {
    email: payload.email,
    userId,
  });

  try {
    return await insertProfileRecord(supabase, payload, "user_scoped_insert");
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const concurrentProfile = await getProfileRecord(
        supabase,
        userId,
        "user_scoped_lookup_after_duplicate",
      );

      if (concurrentProfile) {
        return concurrentProfile;
      }
    }

    creationErrors.push(`user-scoped insert: ${getErrorMessage(error)}`);
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const adminProfile = await getProfileRecord(
      adminSupabase,
      userId,
      "service_role_lookup_before_insert",
    );

    if (adminProfile) {
      return adminProfile;
    }

    return await insertProfileRecord(adminSupabase, payload, "service_role_insert");
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const adminSupabase = createSupabaseAdminClient();
      const concurrentProfile = await getProfileRecord(
        adminSupabase,
        userId,
        "service_role_lookup_after_duplicate",
      );

      if (concurrentProfile) {
        return concurrentProfile;
      }
    }

    creationErrors.push(`service-role insert: ${getErrorMessage(error)}`);
  }

  throw new Error(
    `Could not create a profile row for authenticated user ${userId}. ${creationErrors.join(" | ")}`,
  );
}

export async function ensureAuthenticatedUserProfile(supabase: DatabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    return null;
  }

  return ensureProfileRecord(supabase, user.id, user.email);
}
