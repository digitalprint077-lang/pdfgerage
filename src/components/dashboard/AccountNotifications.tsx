import { useEffect, useState } from "react";
import { fetchSettings, updateSettings, type UserSettings } from "../../utils/dashboardApi";

interface AccountNotificationsProps {
  initial?: UserSettings;
}

const OPTIONS: Array<{
  key: keyof Pick<UserSettings, "notifyUsageAlerts" | "notifyProductUpdates" | "notifyBilling">;
  title: string;
  description: string;
}> = [
  {
    key: "notifyUsageAlerts",
    title: "Usage alerts",
    description: "Email when you are close to your daily conversion limit or credits run low.",
  },
  {
    key: "notifyBilling",
    title: "Billing & receipts",
    description: "Order confirmations, payment receipts, and credit purchase updates.",
  },
  {
    key: "notifyProductUpdates",
    title: "Product updates",
    description: "New features, improvements, and occasional tips for PDF Gerage.",
  },
];

export default function AccountNotifications({ initial }: AccountNotificationsProps) {
  const [settings, setSettings] = useState<UserSettings>(
    initial ?? {
      notifyUsageAlerts: true,
      notifyProductUpdates: true,
      notifyBilling: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setSettings(initial);
  }, [initial]);

  const toggle = async (key: (typeof OPTIONS)[number]["key"]) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await updateSettings({ [key]: next[key] });
      setSettings(saved);
      setMessage("Preferences saved.");
    } catch (err) {
      setSettings(settings);
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="cc-dash-card p-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Choose which emails you want to receive. We never sell your data.
        </p>

        <ul className="mt-6 divide-y divide-[rgb(var(--border))]">
          {OPTIONS.map((opt) => (
            <li key={opt.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium">{opt.title}</p>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">{opt.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings[opt.key]}
                disabled={saving}
                onClick={() => toggle(opt.key)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  settings[opt.key] ? "bg-red-500" : "bg-[rgb(var(--border))]"
                } disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    settings[opt.key] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}
      </section>

      <section className="cc-dash-card p-6">
        <h3 className="font-semibold">Note</h3>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Transactional emails (password reset, security alerts) may still be sent when required for your account
          safety.
        </p>
      </section>
    </div>
  );
}
