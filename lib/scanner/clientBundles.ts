import "server-only";

import { getBundleFilename } from "@/lib/scanner/findings";
import type { ClientBundleAsset, ScannerContext } from "@/lib/scanner/types";
import { ScanFatalError } from "@/lib/scanner/types";

const MAX_PAGES_CRAWLED = 1;
const MAX_ASSET_FETCHES = 12;
const MAX_JAVASCRIPT_BUNDLES = 10;
const MAX_STYLE_ASSETS = 2;
const MAX_BUNDLE_BYTES = 1_000 * 1024;
const MAX_HTML_BYTES = 1_000 * 1024;
const DOCUMENT_REQUEST_TIMEOUT_MS = 12_000;
const BUNDLE_REQUEST_TIMEOUT_MS = 8_000;
const BUNDLE_FETCH_CONCURRENCY = 4;
const EXTRA_ASSET_PATHS = [
  "/_next/static/chunks/pages/_app.js",
  "/_next/static/chunks/pages/index.js",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
] as const;

const INTERNAL_ROUTE_PATTERN =
  /(?:"|')((?:\/api\/|\/)(?:[a-zA-Z0-9_-]+\/?){1,8})(?:"|')/g;
const FETCH_ROUTE_PATTERN =
  /(?:fetch|axios\.(?:get|post|put|patch|delete)|router\.push|href\s*:)\s*\(?\s*(?:"|')([^"'?#]+)(?:[?#][^"']*)?(?:"|')/g;
const SUPABASE_URL_PATTERN =
  /https:\/\/[a-z0-9]{20}\.supabase\.(?:co|in)/gi;

export type ScanSurface = {
  bundles: ClientBundleAsset[];
  comments: string[];
  internalLinks: string[];
  metaContent: string[];
  rawHtml: string;
  routeCandidates: string[];
  scriptUrls: URL[];
  styleUrls: URL[];
  supabaseUrls: string[];
  title: string | null;
};

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown bundle fetch error.";
}

function isFetchableAsset(value: string) {
  return (
    value.includes("/_next/static/") ||
    value.includes("/static/js/") ||
    /\.m?js(?:[?#].*)?$/i.test(value) ||
    /\.css(?:[?#].*)?$/i.test(value)
  );
}

function isJavaScriptAsset(assetUrl: URL) {
  const assetPath = `${assetUrl.pathname}${assetUrl.search}`;

  return (
    assetUrl.pathname.includes("/static/js/") ||
    /\.m?js(?:[?#].*)?$/i.test(assetPath)
  );
}

function isStyleAsset(assetUrl: URL) {
  return /\.css(?:[?#].*)?$/i.test(`${assetUrl.pathname}${assetUrl.search}`);
}

function resolveAssetUrl(src: string, baseUrl: URL) {
  try {
    const resolvedUrl = new URL(src, baseUrl);

    if (resolvedUrl.protocol !== "http:" && resolvedUrl.protocol !== "https:") {
      return null;
    }

    return resolvedUrl;
  } catch {
    return null;
  }
}

function normalizeInternalPath(value: string, targetUrl: URL) {
  if (!value || value.startsWith("#") || value.startsWith("mailto:")) {
    return null;
  }

  try {
    const resolvedUrl = new URL(value, targetUrl);

    if (resolvedUrl.origin !== targetUrl.origin) {
      return null;
    }

    return `${resolvedUrl.pathname}${resolvedUrl.search}`;
  } catch {
    return null;
  }
}

function extractTagUrls(
  html: string,
  targetUrl: URL,
  tagName: "script" | "link",
  attributeName: "src" | "href",
) {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*\\b${attributeName}=(?:"([^"]+)"|'([^']+)'|([^\\s>]+))[^>]*>`,
    "gi",
  );
  const urls = new Map<string, URL>();

  for (const match of html.matchAll(regex)) {
    const value = match[1] ?? match[2] ?? match[3];

    if (!value || !isFetchableAsset(value)) {
      continue;
    }

    const resolvedUrl = resolveAssetUrl(value, targetUrl);

    if (resolvedUrl) {
      urls.set(resolvedUrl.toString(), resolvedUrl);
    }
  }

  return [...urls.values()];
}

function extractNextStaticUrls(html: string, targetUrl: URL) {
  const regex = /(?:["'])(\/_next\/static\/[^"']+\.(?:js|css)[^"']*)(?:["'])/gi;
  const urls = new Map<string, URL>();

  for (const match of html.matchAll(regex)) {
    const assetPath = match[1];

    if (!assetPath) {
      continue;
    }

    const resolvedUrl = resolveAssetUrl(assetPath, targetUrl);

    if (resolvedUrl) {
      urls.set(resolvedUrl.toString(), resolvedUrl);
    }
  }

  return [...urls.values()];
}

function scoreAssetPriority(assetUrl: URL) {
  const filename = getBundleFilename(assetUrl).toLowerCase();

  if (/main-[a-z0-9]+/.test(filename) || filename === "main.js") {
    return 0;
  }

  if (/app-[a-z0-9]+/.test(filename) || filename === "app.js") {
    return 1;
  }

  if (/_app-[a-z0-9]+/.test(filename) || filename === "_app.js") {
    return 2;
  }

  if (/framework-[a-z0-9]+/.test(filename) || filename === "framework.js") {
    return 3;
  }

  if (/index-[a-z0-9]+/.test(filename) || filename === "index.js") {
    return 4;
  }

  if (filename.includes("supabase")) {
    return 5;
  }

  if (filename.includes("auth")) {
    return 6;
  }

  return 7;
}

function prioritizeAssetUrls(assetUrls: URL[]) {
  const prioritizedAssets = [...assetUrls].sort((left, right) => {
      const priorityDelta = scoreAssetPriority(left) - scoreAssetPriority(right);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.pathname.localeCompare(right.pathname);
    });
  const selectedScriptAssets: URL[] = [];
  const selectedStyleAssets: URL[] = [];

  for (const assetUrl of prioritizedAssets) {
    if (
      isJavaScriptAsset(assetUrl) &&
      selectedScriptAssets.length < MAX_JAVASCRIPT_BUNDLES
    ) {
      selectedScriptAssets.push(assetUrl);
    }

    if (
      isStyleAsset(assetUrl) &&
      selectedStyleAssets.length < MAX_STYLE_ASSETS
    ) {
      selectedStyleAssets.push(assetUrl);
    }

    if (
      selectedScriptAssets.length + selectedStyleAssets.length >=
      MAX_ASSET_FETCHES
    ) {
      break;
    }
  }

  return [...selectedScriptAssets, ...selectedStyleAssets].slice(
    0,
    MAX_ASSET_FETCHES,
  );
}

function extractInternalLinks(html: string, targetUrl: URL) {
  const linkRegex = /<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
  const routes = new Set<string>();

  for (const match of html.matchAll(linkRegex)) {
    const hrefValue = match[1] ?? match[2] ?? match[3];
    const normalizedPath = hrefValue
      ? normalizeInternalPath(hrefValue, targetUrl)
      : null;

    if (normalizedPath) {
      routes.add(normalizedPath);
    }
  }

  return [...routes];
}

function extractMetaContent(html: string) {
  const metaRegex = /<meta\b[^>]*\bcontent=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  const values = new Set<string>();

  for (const match of html.matchAll(metaRegex)) {
    const content = (match[1] ?? match[2] ?? "").trim();

    if (content) {
      values.add(content);
    }
  }

  return [...values];
}

function extractComments(html: string) {
  const commentRegex = /<!--([\s\S]*?)-->/g;

  return [...html.matchAll(commentRegex)]
    .map((match) => match[1]?.replace(/\s+/g, " ").trim() ?? "")
    .filter(Boolean);
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractSupabaseUrls(...values: string[]) {
  const urls = new Set<string>();

  for (const value of values) {
    for (const match of value.matchAll(
      new RegExp(SUPABASE_URL_PATTERN.source, SUPABASE_URL_PATTERN.flags),
    )) {
      urls.add(match[0]);
    }
  }

  return [...urls];
}

function looksLikeHtmlDocument(contentType: string | null, text: string) {
  const normalizedType = contentType?.toLowerCase() ?? "";

  if (
    normalizedType.includes("text/html") ||
    normalizedType.includes("application/xhtml+xml")
  ) {
    return true;
  }

  const normalizedSnippet = text.slice(0, 200).trimStart().toLowerCase();

  return (
    normalizedSnippet.startsWith("<!doctype html") ||
    normalizedSnippet.startsWith("<html") ||
    normalizedSnippet.startsWith("<head") ||
    normalizedSnippet.startsWith("<body")
  );
}

function chunkAssets<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function fetchBundleAsset(
  context: ScannerContext,
  assetUrl: URL,
): Promise<ClientBundleAsset | null> {
  console.info("[bundleScanner] before fetch", {
    assetUrl: assetUrl.toString(),
    maxBundleBytes: MAX_BUNDLE_BYTES,
    timeoutMs: BUNDLE_REQUEST_TIMEOUT_MS,
  });

  const assetResponse = await context.fetchText(assetUrl, {
    maxBytes: MAX_BUNDLE_BYTES,
    timeoutMs: BUNDLE_REQUEST_TIMEOUT_MS,
  });
  const contentType = assetResponse.headers.get("content-type");
  const contentLengthHeader = assetResponse.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : null;

  console.info("[bundleScanner] after fetch", {
    assetUrl: assetResponse.url,
    contentLength:
      Number.isFinite(contentLength) && contentLength !== null
        ? contentLength
        : null,
    contentType,
    ok: assetResponse.ok,
    status: assetResponse.status,
    textLength: assetResponse.text.length,
    truncated: assetResponse.truncated,
  });

  if (!assetResponse.ok) {
    return null;
  }

  if (looksLikeHtmlDocument(contentType, assetResponse.text)) {
    console.info("[bundleScanner] skipped HTML fallback asset", {
      assetUrl: assetResponse.url,
      contentType,
    });
    return null;
  }

  return {
    filename: getBundleFilename(assetUrl),
    text: assetResponse.text,
    truncated: assetResponse.truncated,
    url: assetUrl,
  };
}

export function extractRoutesFromText(content: string, targetUrl: URL) {
  const routes = new Set<string>();
  const patterns = [INTERNAL_ROUTE_PATTERN, FETCH_ROUTE_PATTERN];

  for (const pattern of patterns) {
    for (const match of content.matchAll(
      new RegExp(pattern.source, pattern.flags),
    )) {
      const candidate = match[1];
      const normalizedPath = candidate
        ? normalizeInternalPath(candidate, targetUrl)
        : null;

      if (normalizedPath) {
        routes.add(normalizedPath);
      }
    }
  }

  return [...routes];
}

export async function getTargetDocument(context: ScannerContext) {
  return context.memoize("target-document", async () => {
    console.info("[bundleScanner] before fetch", {
      assetUrl: context.targetUrl.toString(),
      maxBundleBytes: MAX_HTML_BYTES,
      timeoutMs: DOCUMENT_REQUEST_TIMEOUT_MS,
    });

    const pageResponse = await context.fetchText(context.targetUrl, {
      maxBytes: MAX_HTML_BYTES,
      timeoutMs: DOCUMENT_REQUEST_TIMEOUT_MS,
    });

    console.info("[bundleScanner] after fetch", {
      assetUrl: pageResponse.url,
      contentLength: pageResponse.headers.get("content-length"),
      contentType: pageResponse.headers.get("content-type"),
      ok: pageResponse.ok,
      status: pageResponse.status,
      textLength: pageResponse.text.length,
      truncated: pageResponse.truncated,
    });

    if (!pageResponse.ok) {
      throw new ScanFatalError(
        `The target URL returned ${pageResponse.status} when the scanner tried to fetch the page.`,
        "unreachable_site",
      );
    }

    return pageResponse;
  });
}

export async function getScanSurface(
  context: ScannerContext,
): Promise<ScanSurface> {
  return context.memoize("scan-surface", async () => {
    console.info("[bundleScanner] getScanSurface entry", {
      maxAssetFetches: MAX_ASSET_FETCHES,
      maxJavaScriptBundles: MAX_JAVASCRIPT_BUNDLES,
      maxPagesCrawled: MAX_PAGES_CRAWLED,
      maxStyleAssets: MAX_STYLE_ASSETS,
      targetUrl: context.targetUrl.toString(),
    });

    const pageResponse = await getTargetDocument(context);
    console.info("[bundleScanner] before HTML parse", {
      htmlLength: pageResponse.text.length,
      targetUrl: context.targetUrl.toString(),
    });
    const scriptUrls = extractTagUrls(pageResponse.text, context.targetUrl, "script", "src");
    const styleUrls = extractTagUrls(pageResponse.text, context.targetUrl, "link", "href");
    const assetUrls = prioritizeAssetUrls([
      ...scriptUrls,
      ...styleUrls,
      ...extractNextStaticUrls(pageResponse.text, context.targetUrl),
      ...EXTRA_ASSET_PATHS.map((assetPath) =>
        new URL(assetPath, context.targetUrl),
      ),
    ]);
    const bundles: ClientBundleAsset[] = [];
    const uniqueAssetUrls = [
      ...new Map(
        assetUrls.map((assetUrl) => [assetUrl.toString(), assetUrl]),
      ).values(),
    ];

    console.info("[bundleScanner] asset candidates prepared", {
      candidateAssetCount: uniqueAssetUrls.length,
      scriptUrlCount: scriptUrls.length,
      styleUrlCount: styleUrls.length,
      targetUrl: context.targetUrl.toString(),
      uniqueAssetUrls: uniqueAssetUrls.map((assetUrl) => assetUrl.toString()),
    });

    const assetBatches = chunkAssets(
      uniqueAssetUrls,
      BUNDLE_FETCH_CONCURRENCY,
    );

    for (const [batchIndex, assetBatch] of assetBatches.entries()) {
      console.info("[bundleScanner] before Promise.all", {
        assetUrls: assetBatch.map((assetUrl) => assetUrl.toString()),
        batchIndex,
        batchSize: assetBatch.length,
        targetUrl: context.targetUrl.toString(),
      });

      const batchResults = await Promise.all(
        assetBatch.map(async (assetUrl) => {
          try {
            return await fetchBundleAsset(context, assetUrl);
          } catch (error) {
            console.warn("[bundleScanner] asset fetch failed", {
              assetUrl: assetUrl.toString(),
              error: getErrorSummary(error),
            });
            return null;
          }
        }),
      );

      console.info("[bundleScanner] after Promise.all", {
        batchIndex,
        fetchedBundleCount: batchResults.filter(Boolean).length,
        targetUrl: context.targetUrl.toString(),
      });

      bundles.push(
        ...batchResults.filter(
          (bundle): bundle is ClientBundleAsset => bundle !== null,
        ),
      );
    }

    const htmlRoutes = extractInternalLinks(pageResponse.text, context.targetUrl);
    const bundleRoutes = bundles.flatMap((bundle) =>
      extractRoutesFromText(bundle.text, context.targetUrl),
    );
    const scanSurface = {
      bundles,
      comments: extractComments(pageResponse.text),
      internalLinks: htmlRoutes,
      metaContent: extractMetaContent(pageResponse.text),
      rawHtml: pageResponse.text,
      routeCandidates: [...new Set([...htmlRoutes, ...bundleRoutes])].sort(),
      scriptUrls,
      styleUrls,
      supabaseUrls: extractSupabaseUrls(
        pageResponse.text,
        ...bundles.map((bundle) => bundle.text),
      ),
      title: extractTitle(pageResponse.text),
    };

    console.info("[bundleScanner] before return", {
      bundleCount: scanSurface.bundles.length,
      commentCount: scanSurface.comments.length,
      internalLinkCount: scanSurface.internalLinks.length,
      routeCandidateCount: scanSurface.routeCandidates.length,
      scriptUrlCount: scanSurface.scriptUrls.length,
      styleUrlCount: scanSurface.styleUrls.length,
      supabaseUrlCount: scanSurface.supabaseUrls.length,
      targetUrl: context.targetUrl.toString(),
    });

    return scanSurface;
  });
}

export async function getClientBundles(
  context: ScannerContext,
): Promise<ClientBundleAsset[]> {
  const surface = await getScanSurface(context);
  return surface.bundles;
}
