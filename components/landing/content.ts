export type TerminalTone = "white" | "muted" | "red" | "yellow" | "cyan" | "green";

export type Severity = "critical" | "high" | "medium";

export const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
] as const;

export const heroStats = [
  { value: "2.74×", label: "more vulns in AI code", accent: true },
  { value: "45%", label: "fail OWASP Top 10", accent: false },
  { value: "74", label: "CVEs traced to AI tools (Q1 '26)", accent: false },
] as const;

export const terminalLines = [
  { text: "$ vibescan https://myapp.vercel.app", tone: "white", delay: 0 },
  { text: "Crawling app surface...", tone: "muted", delay: 600 },
  { text: "Fetching JS bundles (14 chunks)", tone: "muted", delay: 1100 },
  { text: "⚠ CRITICAL  service_role key in main-Bx92.js", tone: "red", delay: 1700 },
  { text: "Probing Supabase tables...", tone: "muted", delay: 2300 },
  { text: "⚠ CRITICAL  RLS off — table: profiles (200 anon)", tone: "red", delay: 2800 },
  { text: "⚠ CRITICAL  RLS off — table: payments (200 anon)", tone: "red", delay: 3100 },
  { text: "Probing API routes...", tone: "muted", delay: 3500 },
  { text: "⚡ HIGH      /api/admin → 200 (no auth)", tone: "yellow", delay: 4000 },
  { text: "Checking security headers...", tone: "muted", delay: 4500 },
  { text: "⚡ HIGH      Missing Content-Security-Policy", tone: "yellow", delay: 4900 },
  { text: "▲ MEDIUM    CORS wildcard on /api/*", tone: "cyan", delay: 5300 },
  { text: "✓ PASS      HTTPS enforced", tone: "green", delay: 5700 },
  { text: "✓ PASS      No .env files exposed", tone: "green", delay: 5900 },
  { text: "", tone: "muted", delay: 6300 },
  { text: "─────────────────────────────────────", tone: "muted", delay: 6400 },
  { text: "3 critical · 2 high · 1 medium · 2 passed", tone: "white", delay: 6500 },
  { text: "AI fix report ready → vibescan.app/r/abc123", tone: "cyan", delay: 6900 },
] as const satisfies ReadonlyArray<{
  text: string;
  tone: TerminalTone;
  delay: number;
}>;

export const tickerItems = [
  { icon: "⚠", level: "CRITICAL", text: "Supabase service role key exposed in JS bundle" },
  { icon: "⚠", level: "CRITICAL", text: "RLS disabled on `users` table" },
  { icon: "⚡", level: "HIGH", text: "Unauthenticated /api/admin route" },
  { icon: "⚡", level: "HIGH", text: "Missing Content-Security-Policy header" },
  { icon: "▲", level: "MEDIUM", text: "CORS wildcard (*) on API" },
  { icon: "▲", level: "MEDIUM", text: "Stripe key visible in client bundle" },
] as const;

export const steps = [
  {
    number: "1",
    title: "Paste your URL",
    description:
      "Drop in your Vercel, Netlify, or custom domain. Any publicly deployed app works.",
  },
  {
    number: "2",
    title: "We scan the surface",
    description:
      "VibeScan crawls your JS bundles, probes API routes, checks RLS policies, and tests security headers.",
  },
  {
    number: "3",
    title: "Get AI-ready fixes",
    description:
      "Each finding includes a markdown fix — paste it into Claude Code and your vuln is patched in one prompt.",
  },
] as const;

export const features = [
  {
    icon: "🔑",
    title: "API Key Exposure",
    description:
      "Scans your compiled JS bundles for Supabase service role keys, Stripe secret keys, and other credentials that should never reach the browser.",
    severity: "critical" as Severity,
  },
  {
    icon: "🗄️",
    title: "Supabase RLS Audit",
    description:
      "Uses your public anon key to probe every table. If unauthenticated requests return data — your entire database is open to anyone.",
    severity: "critical" as Severity,
  },
  {
    icon: "🚪",
    title: "Unauthenticated Routes",
    description:
      "Probes common AI-generated API endpoints like /api/admin, /api/users, /api/debug for missing auth checks.",
    severity: "high" as Severity,
  },
  {
    icon: "🛡️",
    title: "Security Headers",
    description:
      "Checks for missing CSP, X-Frame-Options, HSTS, and CORS misconfigurations that AI tools never configure by default.",
    severity: "high" as Severity,
  },
  {
    icon: "📦",
    title: "Dependency Vulnerabilities",
    description:
      "Detects known CVEs in npm packages that AI-generated package.json files commonly pull in without version pinning.",
    severity: "high" as Severity,
  },
  {
    icon: "🌐",
    title: "CORS & Auth Flow",
    description:
      "Tests for wildcard CORS headers, JWT misconfiguration, and broken auth patterns common in AI-scaffolded Next.js apps.",
    severity: "medium" as Severity,
  },
] as const;

export const reportFindings = [
  {
    dot: "red",
    title: "Supabase service_role key in client bundle",
    description: "Found in: /chunks/main-Bx92kA.js:1:4821",
  },
  {
    dot: "red",
    title: "RLS disabled — table: `profiles`",
    description: "GET /rest/v1/profiles returned 200 (anon)",
  },
  {
    dot: "yellow",
    title: "/api/admin — no auth header required",
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
    name: "Starter",
    amount: "0",
    period: "one free scan, ever",
    featured: false,
    buttonLabel: "Start free",
    features: [
      { text: "1 full scan", included: true },
      { text: "JS bundle analysis", included: true },
      { text: "Security headers check", included: true },
      { text: "Supabase RLS audit", included: false },
      { text: "AI-ready fix export", included: false },
      { text: "Continuous monitoring", included: false },
    ],
  },
  {
    name: "Pro",
    amount: "19",
    period: "per month · unlimited scans",
    featured: true,
    featuredLabel: "MOST POPULAR",
    buttonLabel: "Get Pro →",
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Full JS bundle analysis", included: true },
      { text: "Supabase RLS deep audit", included: true },
      { text: "API route probing", included: true },
      { text: "AI-ready markdown fixes", included: true },
      { text: "Weekly rescan alerts", included: true },
    ],
  },
  {
    name: "One-time",
    amount: "9",
    period: "per scan · no subscription",
    featured: false,
    buttonLabel: "Buy scan",
    features: [
      { text: "Single full scan", included: true },
      { text: "All 6 check categories", included: true },
      { text: "Supabase RLS audit", included: true },
      { text: "AI-ready fix export", included: true },
      { text: "Monitoring & alerts", included: false },
      { text: "Rescan history", included: false },
    ],
  },
] as const;
