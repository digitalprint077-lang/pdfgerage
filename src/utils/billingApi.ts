import { apiUrl } from "./api";

export interface PaymentMethod {
  id: string;
  label: string;
  value: string;
  detail?: string | null;
  instructions?: string;
}

export interface OrderDetails {
  orderId: string;
  status: string;
  credits: number;
  planType: string;
  amountUsd: number;
  cardAvailable: boolean;
  paymentMethods: PaymentMethod[];
  note: string;
  supportEmail: string;
}

export async function startCheckout(plan: "package" | "subscription", credits: number): Promise<void> {
  const res = await fetch(apiUrl("/api/billing/checkout"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, credits }),
  });
  const data = (await res.json().catch(() => ({}))) as OrderDetails & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not start checkout");
  }
  if (data.orderId) {
    window.location.assign(`/checkout/${data.orderId}`);
    return;
  }
  throw new Error("Checkout order missing");
}

export async function startCardPayment(orderId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/billing/order/${encodeURIComponent(orderId)}/card`), {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not start card payment");
  if (data.url) {
    window.location.assign(data.url);
    return;
  }
  throw new Error("Card checkout URL missing");
}

export async function fetchOrder(orderId: string): Promise<OrderDetails> {
  const res = await fetch(apiUrl(`/api/billing/order/${encodeURIComponent(orderId)}`), {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load order");
  return data as OrderDetails;
}

export async function submitOrderPayment(orderId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/billing/order/${encodeURIComponent(orderId)}/submitted`), {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not submit payment");
}

export async function fetchBillingConfig(): Promise<{ mode: string; card: boolean; bank: boolean; wise: boolean }> {
  const res = await fetch(apiUrl("/api/billing/config"));
  const data = await res.json().catch(() => ({}));
  return {
    mode: data.mode || "none",
    card: Boolean(data.card),
    bank: Boolean(data.bank),
    wise: Boolean(data.wise),
  };
}
