import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { deleteAccount } from "../../utils/dashboardApi";

interface AccountDeleteProps {
  email: string;
  hasPassword: boolean;
}

export default function AccountDelete({ email, hasPassword }: AccountDeleteProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(emailConfirm, hasPassword ? password : undefined);
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="cc-dash-card border-red-500/30 p-6">
        <h2 className="text-lg font-semibold text-red-400">Delete account</h2>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Permanently remove your account and all associated data. This action cannot be undone.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[rgb(var(--muted))]">
          <li>Your profile and sign-in credentials</li>
          <li>Conversion history and activity logs</li>
          <li>Remaining conversion credits</li>
          <li>Order and invoice records</li>
        </ul>

        <form onSubmit={handleDelete} className="mt-6 space-y-4">
          <div>
            <label htmlFor="delete-email" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
              Type your email to confirm
            </label>
            <input
              id="delete-email"
              type="email"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              placeholder={email}
              required
              className="input-modern"
            />
          </div>
          {hasPassword ? (
            <div>
              <label htmlFor="delete-password" className="mb-1.5 block text-sm font-medium text-[rgb(var(--muted))]">
                Password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-modern"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={deleting || emailConfirm.toLowerCase() !== email.toLowerCase()}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete my account permanently"}
          </button>
        </form>
      </section>
    </div>
  );
}
