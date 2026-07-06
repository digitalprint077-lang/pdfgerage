import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import RequireAuth from "../components/RequireAuth";
import { fetchOrder, startCardPayment, submitOrderPayment } from "../utils/billingApi";

function CheckoutContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchOrder>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    document.title = "Checkout — PDF Gerage";
    let cancelled = false;
    setLoading(true);
    fetchOrder(orderId)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setSubmitted(data.status === "awaiting_review" || data.status === "completed");
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      document.title = "PDF Gerage";
    };
  }, [orderId]);

  const handleCardPay = async () => {
    if (!orderId) return;
    setCardLoading(true);
    setError(null);
    try {
      await startCardPayment(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Card checkout failed");
      setCardLoading(false);
    }
  };

  const handleSubmitted = async () => {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitOrderPayment(orderId);
      setSubmitted(true);
      setOrder((prev) => (prev ? { ...prev, status: "awaiting_review" } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SitePageShell title="Checkout">
        <p className="text-sm text-[rgb(var(--muted))]">Loading order…</p>
      </SitePageShell>
    );
  }

  if (error && !order) {
    return (
      <SitePageShell title="Checkout">
        <div className="modern-card max-w-lg p-6">
          <p className="text-sm text-red-400">{error}</p>
          <Link to="/pricing" className="mt-4 inline-block text-sm text-brand hover:underline">
            Back to pricing
          </Link>
        </div>
      </SitePageShell>
    );
  }

  if (!order) return null;

  if (order.status === "completed") {
    return (
      <SitePageShell title="Payment received">
        <div className="modern-card max-w-lg p-6">
          <h1 className="text-xl font-bold">Credits added</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Your {order.credits.toLocaleString()} credits are ready to use.
          </p>
          <Link to="/profile?tab=plan" className="btn-primary mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold">
            View balance
          </Link>
        </div>
      </SitePageShell>
    );
  }

  const bankMethod = order.paymentMethods.find((m) => m.id === "bank");
  const wiseMethod = order.paymentMethods.find((m) => m.id === "wise");
  const hasManualMethods = Boolean(bankMethod || wiseMethod);

  return (
    <SitePageShell title="Complete payment">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="modern-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-brand">Order summary</p>
          <h1 className="mt-2 text-2xl font-bold">${order.amountUsd} USD</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            {order.credits.toLocaleString()} conversion credits ·{" "}
            {order.planType === "subscription" ? "Monthly subscription" : "One-time package"}
          </p>
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">Order reference</p>
            <p className="mt-1 font-mono text-lg font-bold text-brand">{order.orderId}</p>
            <p className="mt-2 text-xs text-[rgb(var(--muted))]">{order.note}</p>
          </div>
        </section>

        {order.cardAvailable ? (
          <section className="modern-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Credit / debit card</h2>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Pay instantly with Visa, Mastercard, or Amex. Credits are added automatically.
                </p>
              </div>
              <button
                type="button"
                disabled={cardLoading}
                onClick={handleCardPay}
                className="btn-primary shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {cardLoading ? "Redirecting…" : "Pay with card"}
              </button>
            </div>
          </section>
        ) : null}

        {bankMethod ? (
          <section className="modern-card p-6">
            <h2 className="text-lg font-semibold">{bankMethod.label}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">{bankMethod.instructions}</p>
            <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.35)] p-4">
              <p className="font-mono text-sm">{bankMethod.value}</p>
              {bankMethod.detail ? (
                <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-[rgb(var(--muted))]">{bankMethod.detail}</pre>
              ) : null}
            </div>
          </section>
        ) : null}

        {wiseMethod ? (
          <section className="modern-card p-6">
            <h2 className="text-lg font-semibold">{wiseMethod.label}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">{wiseMethod.instructions}</p>
            <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.35)] p-4">
              <p className="font-mono text-sm break-all">{wiseMethod.value}</p>
              {wiseMethod.detail ? <p className="mt-2 text-xs text-[rgb(var(--muted))]">{wiseMethod.detail}</p> : null}
            </div>
          </section>
        ) : null}

        {hasManualMethods ? (
          <section className="modern-card p-6">
            {submitted ? (
              <div>
                <h2 className="text-lg font-semibold text-green-600 dark:text-green-400">Payment submitted</h2>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                  We&apos;ll verify your bank or Wise payment and add credits within a few hours.
                </p>
                <Link to="/profile?tab=plan" className="mt-4 inline-block text-sm text-brand hover:underline">
                  Go to profile →
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold">Paid by bank or Wise?</h2>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                  After sending your transfer with reference <strong>{order.orderId}</strong>, click below so we can
                  review it.
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitted}
                  className="btn-secondary mt-4 rounded-xl border border-[rgb(var(--border))] px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "I've sent the payment"}
                </button>
              </div>
            )}
          </section>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <p className="text-center text-xs text-[rgb(var(--muted))]">
          Questions? Email{" "}
          <a href={`mailto:${order.supportEmail}`} className="text-brand hover:underline">
            {order.supportEmail}
          </a>
        </p>
      </div>
    </SitePageShell>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
