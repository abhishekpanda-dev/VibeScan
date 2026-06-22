export type TerminalTone = "white" | "muted" | "red" | "yellow" | "cyan" | "green";

export type Severity = "critical" | "high" | "medium";

export type HeroTrustIndicator = {
  description: string;
  icon: "report" | "ai" | "speed";
  title: string;
};

export type FeatureCard = {
  description: string;
  icon: string;
  severity: Severity;
  title: string;
};

export type PricingPlan = {
  billingLabel: string;
  ctaAuthHref: string;
  ctaGuestHref: string;
  ctaLabel: string;
  description: string;
  featured: boolean;
  featuredLabel?: string;
  features: readonly string[];
  id: "onetime" | "pro";
  name: string;
  originalPrice?: string;
  price: string;
  savingsLabel?: string;
};

export const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
] as const;

export const heroStats = [
  { value: "90 sec", label: "average first-pass report", accent: true },
  { value: "PDF", label: "share-ready export included", accent: false },
  { value: "AI fixes", label: "suggested remediation guidance", accent: false },
] as const;

export const heroTrustIndicators = [
  {
    description: "Professional findings with clear severity and shareable output.",
    icon: "report",
    title: "Security Reports",
  },
  {
    description: "Actionable suggestions to help your team resolve issues faster.",
    icon: "ai",
    title: "AI Remediation",
  },
  {
    description: "Run a full pass against a deployed URL in minutes, not days.",
    icon: "speed",
    title: "Fast Scanning",
  },
] as const satisfies ReadonlyArray<HeroTrustIndicator>;

export const terminalLines = [
  { text: "$ vibescan https://myapp.vercel.app", tone: "white", delay: 0 },
  { text: "Crawling app surface...", tone: "muted", delay: 600 },
  { text: "Fetching JS bundles (14 chunks)", tone: "muted", delay: 1100 },
  { text: "! CRITICAL  service_role key in main-Bx92.js", tone: "red", delay: 1700 },
  { text: "Probing Supabase tables...", tone: "muted", delay: 2300 },
  { text: "! CRITICAL  RLS off - table: profiles (200 anon)", tone: "red", delay: 2800 },
  { text: "! CRITICAL  RLS off - table: payments (200 anon)", tone: "red", delay: 3100 },
  { text: "Probing API routes...", tone: "muted", delay: 3500 },
  { text: "> HIGH      /api/admin -> 200 (no auth)", tone: "yellow", delay: 4000 },
  { text: "Checking security headers...", tone: "muted", delay: 4500 },
  { text: "> HIGH      Missing Content-Security-Policy", tone: "yellow", delay: 4900 },
  { text: "^ MEDIUM    CORS wildcard on /api/*", tone: "cyan", delay: 5300 },
  { text: "+ PASS      HTTPS enforced", tone: "green", delay: 5700 },
  { text: "+ PASS      No .env files exposed", tone: "green", delay: 5900 },
  { text: "", tone: "muted", delay: 6300 },
  { text: "-------------------------------------", tone: "muted", delay: 6400 },
  { text: "3 critical | 2 high | 1 medium | 2 passed", tone: "white", delay: 6500 },
  { text: "AI fix report ready -> vibescan.app/r/abc123", tone: "cyan", delay: 6900 },
] as const satisfies ReadonlyArray<{
  text: string;
  tone: TerminalTone;
  delay: number;
}>;

export const tickerItems = [
  { icon: "[!]", level: "CRITICAL", text: "Supabase service role key exposed in JS bundle" },
  { icon: "[!]", level: "CRITICAL", text: "RLS disabled on `users` table" },
  { icon: "[>]", level: "HIGH", text: "Unauthenticated /api/admin route" },
  { icon: "[>]", level: "HIGH", text: "Missing Content-Security-Policy header" },
  { icon: "[^]", level: "MEDIUM", text: "CORS wildcard (*) on API" },
  { icon: "[^]", level: "MEDIUM", text: "Stripe key visible in client bundle" },
] as const;

export const steps = [
  {
    number: "1",
    title: "Enter URL",
    description:
      "Paste the public URL of your deployed application to kick off the scan workflow.",
  },
  {
    number: "2",
    title: "Run Scan",
    description:
      "Launch a full pass across bundles, routes, headers, and the app surface you expose publicly.",
  },
  {
    number: "3",
    title: "Review Findings",
    description:
      "See a prioritized report with severity, impact, and the exact issues that need attention.",
  },
  {
    number: "4",
    title: "Fix Vulnerabilities",
    description:
      "Use the remediation guidance to patch issues quickly, then rescan with confidence.",
  },
] as const;

export const features = [
  {
    icon: "KEY",
    title: "Credential Exposure",
    description:
      "Scans your compiled JS bundles for Supabase service role keys, Stripe secret keys, and other credentials that should never reach the browser.",
    severity: "critical" as Severity,
  },
  {
    icon: "RLS",
    title: "Supabase RLS Audit",
    description:
      "Uses your public anon key to probe every table. If unauthenticated requests return data, your database is open to anyone.",
    severity: "critical" as Severity,
  },
  {
    icon: "API",
    title: "Unauthenticated Routes",
    description:
      "Probes common AI-generated API endpoints like /api/admin, /api/users, /api/debug for missing auth checks.",
    severity: "high" as Severity,
  },
  {
    icon: "HDR",
    title: "Security Headers",
    description:
      "Checks for missing CSP, X-Frame-Options, HSTS, and CORS misconfigurations that AI tools never configure by default.",
    severity: "high" as Severity,
  },
  {
    icon: "PKG",
    title: "Dependency Vulnerabilities",
    description:
      "Detects known CVEs in npm packages that AI-generated package.json files commonly pull in without version pinning.",
    severity: "high" as Severity,
  },
  {
    icon: "AUTH",
    title: "CORS & Auth Flow",
    description:
      "Tests for wildcard CORS headers, JWT misconfiguration, and broken auth patterns common in AI-scaffolded Next.js apps.",
    severity: "medium" as Severity,
  },
] as const satisfies ReadonlyArray<FeatureCard>;

export const reportFindings = [
  {
    dot: "red",
    title: "Supabase service_role key in client bundle",
    description: "Found in: /chunks/main-Bx92kA.js:1:4821",
  },
  {
    dot: "red",
    title: "RLS disabled - table: `profiles`",
    description: "GET /rest/v1/profiles returned 200 (anon)",
  },
  {
    dot: "yellow",
    title: "/api/admin - no auth header required",
    description: "GET returned 200 with user data",
  },
  {
    dot: "cyan",
    title: "Missing Content-Security-Policy",
    description: "No CSP header in response",
  },
] as const;

export const pricingPlans = [
  {
    id: "onetime",
    name: "One-Time Security Scan",
    price: "$5",
    originalPrice: "$9",
    savingsLabel: "44% OFF",
    billingLabel: "one-time purchase",
    description:
      "A quick, professional security pass for launches, audits, and client handoffs.",
    featured: false,
    featuredLabel: undefined,
    ctaLabel: "Start One-Time Scan",
    ctaGuestHref: "/auth?next=/scan",
    ctaAuthHref: "/scan",
    features: [
      "Full security scan",
      "Professional report",
      "AI remediation suggestions",
      "PDF export",
      "One-time use",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    originalPrice: undefined,
    savingsLabel: undefined,
    billingLabel: "per month",
    description:
      "Unlimited scanning and deeper coverage for teams shipping AI products every week.",
    featured: true,
    featuredLabel: "Most Popular",
    ctaLabel: "Choose Pro",
    ctaGuestHref: "/auth?next=/dashboard",
    ctaAuthHref: "/dashboard",
    features: [
      "Unlimited scans",
      "Advanced security checks",
      "AI remediation",
      "Scan history",
      "Priority processing",
      "Future updates",
    ],
  },
] as const satisfies ReadonlyArray<PricingPlan>;
