import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SitePageShell from "../components/SitePageShell";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl } from "../utils/api";

const SUBJECTS = [
  { value: "", label: "Please select a subject" },
  { value: "general", label: "General inquiry" },
  { value: "technical", label: "Technical support" },
  { value: "conversion", label: "Conversion issue" },
  { value: "account", label: "Account & sign-in" },
  { value: "feature", label: "Feature request" },
  { value: "bug", label: "Bug report" },
  { value: "other", label: "Other" },
];

const inputClass = "input-modern";

const labelClass = "mb-1.5 block text-sm font-medium text-[rgb(var(--foreground))]";

export default function ContactPage() {
  const { user } = useAuth();
  const [supportEmail, setSupportEmail] = useState("support@pdfgerage.app");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Contact Us — PDF Gerage";
    return () => {
      document.title = "PDF Gerage";
    };
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/contact/config"))
      .then((r) => r.json())
      .then((d) => {
        if (d.supportEmail) setSupportEmail(d.supportEmail);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name || "");
      setEmail((e) => e || user.email || "");
      setAccount(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          account: account.trim() || "None",
          subject,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSuccess(data.message || "Your message has been sent.");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SitePageShell>
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-[rgb(var(--muted))] transition hover:text-brand"
        >
          ← Back to PDF Gerage
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contact us</h1>
          <p className="mt-4 max-w-3xl text-[rgb(var(--muted))]">
            Please use the contact form below or alternatively email us via{" "}
            <a href={`mailto:${supportEmail}`} className="text-brand hover:underline">
              {supportEmail}
            </a>
            .
          </p>
        </header>

        <div className="modern-card p-6 md:p-8">
          <h2 className="mb-6 text-lg font-semibold">Contact</h2>

          {success ? (
            <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {success}
            </div>
          ) : null}
          {error ? (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label htmlFor="contact-name" className={labelClass}>
                  Your name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className={labelClass}>
                  Your email address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="contact-account" className={`${labelClass} flex items-center gap-1.5`}>
                  Your PDF Gerage account
                  <span
                    className="cursor-help text-gray-400"
                    title="The email you use to sign in to PDF Gerage, if you have an account"
                  >
                    ⓘ
                  </span>
                </label>
                <input
                  id="contact-account"
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="None"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className={labelClass}>
                Subject
              </label>
              <select
                id="contact-subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`${inputClass} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                }}
              >
                {SUBJECTS.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value} disabled={!opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>
                Your message
              </label>
              <textarea
                id="contact-message"
                required
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputClass} resize-y min-h-[180px]`}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  "Sending…"
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SitePageShell>
  );
}
