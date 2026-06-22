import { type NextRequest } from "next/server";
import { completeAuthCallback } from "@/lib/auth/callback-route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  return completeAuthCallback(request, createSupabaseServerClient);
}
