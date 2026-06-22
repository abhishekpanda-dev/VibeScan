import { createMarkdownReport, createPdfReport } from "@/lib/report-export";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnedScanReport } from "@/lib/scan-data";

export const dynamic = "force-dynamic";

function createUnauthorizedResponse() {
  return new Response("Unauthorized", {
    status: 401,
  });
}

function createNotFoundResponse() {
  return new Response("Report not found", {
    status: 404,
  });
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/reports/[scanId]/export">,
) {
  const { scanId } = await ctx.params;
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return createUnauthorizedResponse();
  }

  const report = await getOwnedScanReport(supabase, scanId, {
    userId: user.id,
  });

  if (!report) {
    return createNotFoundResponse();
  }

  if (format === "pdf") {
    const pdfBytes = await createPdfReport(report);

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="report.pdf"',
        "Content-Type": "application/pdf",
      },
    });
  }

  const markdown = createMarkdownReport(report);

  return new Response(markdown, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="report.md"',
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
