export type PlanId = "free" | "package" | "subscription" | "enterprise";

export interface PlanColumn {
  id: PlanId;
  name: string;
  description: string;
  priceDisplay: string | "custom" | "slider";
  cta: string;
  ctaHref: string;
  ctaVariant: "outline" | "primary" | "light";
}

export const PLAN_COLUMNS: PlanColumn[] = [
  {
    id: "free",
    name: "Free",
    description: "For personal use, testing and hobby projects.",
    priceDisplay: "$0",
    cta: "Sign Up",
    ctaHref: "/signup",
    ctaVariant: "outline",
  },
  {
    id: "package",
    name: "Package",
    description: "One-time payment. Credits never expire.",
    priceDisplay: "slider",
    cta: "Buy Now",
    ctaHref: "/signup",
    ctaVariant: "primary",
  },
  {
    id: "subscription",
    name: "Subscription",
    description: "Monthly credits at our best rates.",
    priceDisplay: "slider",
    cta: "Subscribe",
    ctaHref: "/signup",
    ctaVariant: "primary",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom plans for large-scale workloads.",
    priceDisplay: "custom",
    cta: "Contact Sales",
    ctaHref: "/contact",
    ctaVariant: "light",
  },
];

/** Credit volume tiers — slider from 500 to 1,000,000 */
export const VOLUME_CREDIT_TIERS = [
  500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
];

const PACKAGE_RATE = 0.02;
const SUBSCRIPTION_RATE = 0.017;

export function packagePriceForCredits(credits: number): number {
  return Math.max(10, Math.round(credits * PACKAGE_RATE));
}

export function subscriptionPriceForCredits(credits: number): number {
  return Math.round(credits * SUBSCRIPTION_RATE);
}

export function formatCredits(n: number): string {
  return n.toLocaleString();
}

/** @deprecated use VOLUME_CREDIT_TIERS */
export const PACKAGE_CREDIT_OPTIONS = VOLUME_CREDIT_TIERS.map((credits) => ({
  credits,
  price: packagePriceForCredits(credits),
}));

/** @deprecated use VOLUME_CREDIT_TIERS */
export const SUBSCRIPTION_CREDIT_OPTIONS = VOLUME_CREDIT_TIERS.filter((c) => c >= 1000).map((credits) => ({
  credits,
  price: subscriptionPriceForCredits(credits),
}));

export type CellValue = string | boolean | "dash" | "slider-package" | "slider-subscription";

export interface FeatureRow {
  label: string;
  hint?: string;
  free: CellValue;
  package: CellValue;
  subscription: CellValue;
  enterprise: CellValue;
  isSection?: boolean;
}

export const CREDIT_ROWS: FeatureRow[] = [
  {
    label: "Conversion Credits",
    free: "15 / day",
    package: "slider-package",
    subscription: "slider-subscription",
    enterprise: "Custom",
  },
  {
    label: "Cost per Credit",
    free: "Free",
    package: "$0.02",
    subscription: "—",
    enterprise: "Custom",
  },
  {
    label: "Credit Expiry",
    free: "Daily reset",
    package: "Never",
    subscription: "Monthly reset",
    enterprise: "Custom",
  },
];

export const FEATURE_ROWS: FeatureRow[] = [
  {
    label: "Features",
    free: "",
    package: "",
    subscription: "",
    enterprise: "",
    isSection: true,
  },
  {
    label: "All conversion tools",
    free: true,
    package: true,
    subscription: true,
    enterprise: true,
  },
  {
    label: "Secure cloud processing",
    hint: "Encrypted transfer & auto-delete",
    free: true,
    package: true,
    subscription: true,
    enterprise: true,
  },
  {
    label: "Processing priority",
    free: "Low",
    package: "High",
    subscription: "High",
    enterprise: "High",
  },
  {
    label: "Max file size",
    hint: "Per upload",
    free: "100 MB",
    package: "Unlimited",
    subscription: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Max processing time",
    hint: "Per job",
    free: "5 minutes",
    package: "Unlimited",
    subscription: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Concurrent tasks",
    free: "5",
    package: "Unlimited",
    subscription: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    label: "Activity dashboard",
    free: false,
    package: true,
    subscription: true,
    enterprise: true,
  },
  {
    label: "Dedicated capacity",
    free: "dash",
    package: "dash",
    subscription: "dash",
    enterprise: "Optional",
  },
  {
    label: "Install custom fonts",
    free: "dash",
    package: "dash",
    subscription: "dash",
    enterprise: true,
  },
];

export interface CreditTypeRow {
  type: string;
  baseCredits: number;
}

export const CREDIT_TYPE_ROWS: CreditTypeRow[] = [
  { type: "General", baseCredits: 1 },
  { type: "Office to PDF", baseCredits: 2 },
  { type: "PDF to Office", baseCredits: 4 },
  { type: "OCR", baseCredits: 2 },
  { type: "Translate", baseCredits: 2 },
];

/** Base cost plus one credit per extra minute beyond the first. */
export function creditsForJob(baseCredits: number, minutes: number): number {
  const m = Math.max(1, Math.ceil(minutes));
  return baseCredits + Math.max(0, m - 1);
}

export const PRICING_FAQ = [
  {
    q: "What is a conversion credit?",
    a: "One credit equals one successful job — convert, merge, compress, OCR, translate, or archive. Failed jobs do not consume credits.",
  },
  {
    q: "How does the Free plan work?",
    a: "You get 15 free conversions per day without a credit card. Create an account to unlock your dashboard and track usage.",
  },
  {
    q: "What's the difference between Package and Subscription?",
    a: "Package is a one-time purchase — credits never expire. Subscription gives you a fresh batch of credits every month at a lower per-credit rate.",
  },
  {
    q: "Where are my files processed?",
    a: "On PDF Gerage secure cloud servers. Files are encrypted in transit, processed for your job, and deleted automatically afterward.",
  },
];
