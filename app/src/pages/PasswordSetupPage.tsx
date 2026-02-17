import { useState } from "react";
import { supabase } from "../lib/supabase";
import { MIN_PASSWORD_LENGTH } from "../hooks/useRequirePasswordSetup";

export type PasswordSetupPageProps = {
  onDone: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
};

export function PasswordSetupPage({
  onDone, // API compat; success path uses hard redirect
  title = "Passwort einrichten",
  subtitle = "Bitte wähle ein sicheres Passwort mit mindestens 8 Zeichen.",
  buttonLabel = "Passwort setzen & fortfahren",
}: PasswordSetupPageProps) {
  void onDone;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isValidLength = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isValidLength && passwordsMatch && !submitting;

  const handleSubmit = async () => {
    if (!isValidLength) {
      setMessage({ type: "error", text: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Die Passwörter stimmen nicht überein." });
      return;
    }

    setMessage(null);
    setSubmitting(true);

    let timedOut = false;
    const TIMEOUT_MS = 10_000;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setSubmitting(false);
      setMessage({ type: "error", text: "Zeitüberschreitung beim Setzen des Passworts." });
    }, TIMEOUT_MS);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      window.clearTimeout(timeoutId);
      if (timedOut) return;

      if (error) {
        console.error("[PasswordSetupPage] updateUser error", error);
        setMessage({ type: "error", text: error.message });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      console.debug("[PasswordSetupPage] password set success", {
        userId: data?.user?.id,
        session: sessionData.session != null,
      });

      setMessage({ type: "success", text: "Passwort wurde gesetzt. Du wirst weitergeleitet…" });
      // Allow Supabase to persist updated session to localStorage before unload
      await new Promise((r) => setTimeout(r, 150));
      window.location.href = window.location.origin;
    } catch (err) {
      window.clearTimeout(timeoutId);
      if (!timedOut) {
        console.error("[PasswordSetupPage] updateUser exception", err);
        const text = err instanceof Error ? err.message : "Unbekannter Fehler";
        setMessage({ type: "error", text });
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (!timedOut) setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>

        {message ? (
          <div
            role="alert"
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              message.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Neues Passwort (min. 8 Zeichen)"
            autoComplete="new-password"
            aria-invalid={password.length > 0 && !isValidLength}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none dark:focus:border-blue-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort bestätigen"
            autoComplete="new-password"
            aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none dark:focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
              !canSubmit ? "bg-slate-400 dark:bg-slate-600" : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
            }`}
          >
            {submitting ? "Bitte warten…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
