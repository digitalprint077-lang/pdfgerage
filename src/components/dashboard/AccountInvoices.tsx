import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchInvoices, type Invoice } from "../../utils/dashboardApi";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-amber-500/10 text-amber-400",
    awaiting_review: "bg-blue-500/10 text-blue-400",
  };
  const labels: Record<string, string> = {
    completed: "Paid",
    pending: "Pending",
    awaiting_review: "Reviewing",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-[rgb(var(--border))] text-[rgb(var(--muted))]"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AccountInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-12 text-center text-[rgb(var(--muted))]">Loading invoices…</p>;
  }

  if (error) {
    return (
      <section className="cc-dash-card p-6">
        <p className="text-sm text-red-400">{error}</p>
      </section>
    );
  }

  if (!invoices.length) {
    return (
      <section className="cc-dash-card border-dashed p-12 text-center">
        <p className="font-medium text-[rgb(var(--muted))]">No invoices yet</p>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Purchase credits to see your order history here.
        </p>
        <Link to="/pricing" className="mt-4 inline-block text-sm text-brand hover:underline">
          View plans →
        </Link>
      </section>
    );
  }

  return (
    <section className="cc-dash-card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)] text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Plan</th>
            <th className="px-4 py-3 font-medium">Credits</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgb(var(--border)/0.5)]">
          {invoices.map((inv) => (
            <tr key={inv.orderId} className="hover:bg-[rgb(var(--card-hover)/0.5)]">
              <td className="px-4 py-3 font-mono text-xs">{inv.orderId}</td>
              <td className="px-4 py-3 text-[rgb(var(--muted))]">{formatDate(inv.createdAt)}</td>
              <td className="px-4 py-3 capitalize text-[rgb(var(--muted))]">{inv.planType}</td>
              <td className="px-4 py-3 tabular-nums">{inv.credits.toLocaleString()}</td>
              <td className="px-4 py-3 tabular-nums">${inv.amountUsd.toFixed(2)}</td>
              <td className="px-4 py-3">{statusBadge(inv.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
