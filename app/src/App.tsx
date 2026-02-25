import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FolderPage } from "./pages/FolderPage";
import { NotePage } from "./pages/NotePage";
import { PasswordSetupPage } from "./pages/PasswordSetupPage";
import { PrivatePage } from "./pages/PrivatePage";
import { SearchPage } from "./pages/SearchPage";
import { TeamHubPage } from "./pages/TeamHubPage";
import { SalesQuizPage } from "./pages/SalesQuizPage";
import { SalesBacklogPage } from "./pages/SalesBacklogPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSalesStatsPage } from "./pages/admin/AdminSalesStatsPage";
import { TrashPage } from "./pages/TrashPage";
import { AppDataProvider } from "./state/AppDataContext";
import { useRequirePasswordSetup } from "./hooks/useRequirePasswordSetup";
import { supabase } from "./lib/supabase";

const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "true";

/** Entfernt alle Supabase-Auth-Einträge aus localStorage, damit ein Neustart ohne hängende Session läuft. */
function clearSupabaseAuthStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sb-")) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function App() {
  const { loading, session, needsPasswordSetup, authError } = useRequirePasswordSetup();

  // Recovery-Flag: aus sessionStorage, aus ?recovery=1 (Callback-Redirect) oder live via Event/Hash.
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    try {
      if (sessionStorage.getItem("auth:pendingRecovery") === "true") return true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("recovery") === "1") return true;
    } catch {
      /* ignore */
    }
    return false;
  });

  // sessionStorage-Flag aufräumen sobald Session da ist
  useEffect(() => {
    if (!session || !isRecoveryMode) return;
    try {
      sessionStorage.removeItem("auth:pendingRecovery");
    } catch {
      /* ignore */
    }
  }, [session, isRecoveryMode]);

  // ?recovery=1 aus URL entfernen, sobald wir es erkannt haben (bleibt nicht in Adresszeile)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("recovery") === "1") {
      params.delete("recovery");
      const search = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (search ? "?" + search : ""));
    }
  }, [isRecoveryMode]);

  // Fallback: Hash enthält type=recovery → Recovery-Modus erzwingen (Passwort setzen), Hash danach entfernen
  useEffect(() => {
    const hash = window.location.hash;
    if (DEBUG_AUTH && hash) {
      const type = hash.includes("type=recovery")
        ? "recovery"
        : hash.includes("type=invite")
          ? "invite"
          : hash.includes("type=magiclink")
            ? "magiclink"
            : hash.includes("type=signup")
              ? "signup"
              : "other";
      console.debug("[Auth:hash]", { hash: hash.slice(0, 80), type });
    }
    const isRecoveryHash = hash.includes("type=recovery") || hash.includes("type=invite");
    if (session && isRecoveryHash) {
      setIsRecoveryMode(true);
      try {
        sessionStorage.setItem("auth:pendingRecovery", "true");
      } catch {
        /* ignore */
      }
      // Hash aus URL entfernen (Tokens nicht in History/Addressbar lassen)
      if (hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [session]);

  // Fallback: PASSWORD_RECOVERY Event (alle Flows)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /** Abmelden auch bei hängendem signOut(): Session lokal löschen und neu laden. */
  const handleSignOutAndClear = () => {
    clearSupabaseAuthStorage();
    void supabase.auth.signOut(); // fire-and-forget, kann bei Timeout hängen
    window.location.reload();
  };

  /** Im Fehlerfall: Session verwerfen und neu laden, damit kein Timeout mehr entsteht. */
  const handleReloadAfterError = () => {
    clearSupabaseAuthStorage();
    window.location.reload();
  };

  // Supabase leitet oft auf Site URL (/) mit Hash weiter, nicht auf /auth/callback. Dann hier umleiten.
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  if (
    pathname !== "/auth/callback" &&
    hash.includes("type=recovery") &&
    (hash.includes("access_token=") || hash.includes("code="))
  ) {
    window.location.replace(window.location.origin + "/auth/callback" + hash);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-app)]">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-[var(--color-text-secondary)]">Wird weitergeleitet…</p>
      </div>
    );
  }

  // Callback zuerst: Nach Klick auf Reset-/Invite-Link darf hier nichts anderes laufen (kein authError/loading).
  if (pathname === "/auth/callback") {
    return <AuthCallbackPage />;
  }

  // Required render priority: authError → loading → no session → recovery → password setup → main app
  if (authError) {
    const message =
      authError === "config"
        ? "Anmeldung nicht konfiguriert (Supabase URL/Key fehlt). Bitte Administrator informieren."
        : authError === "timeout"
          ? "Anmeldung dauert zu lange. Bitte Netzwerk prüfen oder abmelden und erneut versuchen."
          : authError === "session_invalid"
            ? "Sitzung ungültig. Bitte erneut anmelden."
            : "Fehler beim Laden der Anmeldung. Bitte Seite neu laden oder abmelden.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-app)] px-6">
        <p className="text-center text-sm text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleReloadAfterError}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Seite neu laden
          </button>
          <button
            type="button"
            onClick={handleSignOutAndClear}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-[var(--color-text-secondary)]">Lade…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    try {
      const path = window.location.pathname + window.location.search;
      if (path !== "/login") sessionStorage.setItem("auth:returnTo", path);
    } catch {
      // ignore
    }
    return <LoginPage />;
  }

  if (!session.user) {
    try {
      const path = window.location.pathname + window.location.search;
      if (path !== "/login") sessionStorage.setItem("auth:returnTo", path);
    } catch {
      // ignore
    }
    return <LoginPage />;
  }

  if (isRecoveryMode) {
    return <SetNewPasswordPage onDone={() => setIsRecoveryMode(false)} />;
  }

  if (needsPasswordSetup) {
    return (
      <PasswordSetupPage
        title="Willkommen bei SM-TeamNotes!"
        subtitle="Bitte setze ein sicheres Passwort für deinen Account (mindestens 8 Zeichen)."
        buttonLabel="Passwort setzen & starten"
        onDone={() => window.history.replaceState(null, "", window.location.pathname)}
      />
    );
  }

  return (
    <AppDataProvider userId={session.user.id}>
      <BrowserRouter>
        <RedirectToReturn />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/private" element={<PrivatePage />} />
          <Route path="/team" element={<TeamHubPage />} />
          <Route path="/sales-quiz" element={<SalesQuizPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/sales-backlog" element={<SalesBacklogPage />} />
          <Route path="/admin/sales-stats" element={<AdminSalesStatsPage />} />
          <Route path="/folder/:id" element={<FolderPage />} />
          <Route path="/note/:id" element={<NotePage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  );
}

/** Nach Login: gespeicherte returnTo-URL aus sessionStorage lesen und dorthin navigieren. */
function RedirectToReturn() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const returnTo = sessionStorage.getItem("auth:returnTo");
      if (returnTo) {
        sessionStorage.removeItem("auth:returnTo");
        navigate(returnTo, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [navigate]);
  return null;
}

/* ─── Login ──────────────────────────────────────────────── */

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canSubmit = email.includes("@") && (mode === "forgot" || password.length >= 6);

  const resetPassword = async () => {
    if (!email.includes("@")) {
      setMessage({ type: "error", text: "Bitte zuerst eine gültige E-Mail eingeben." });
      return;
    }
    try {
      setMessage(null);
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        setMessage({ type: "error", text: `Fehler: ${error.message}` });
        return;
      }
      setMessage({
        type: "success",
        text: "E-Mail zum Zurücksetzen wurde verschickt. Bitte Postfach prüfen (auch Spam).",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Unbekannter Fehler";
      setMessage({ type: "error", text: `Technischer Fehler: ${text}` });
    } finally {
      setSubmitting(false);
    }
  };

  const signIn = async () => {
    if (!canSubmit) {
      setMessage({
        type: "error",
        text: "Bitte gültige E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.",
      });
      return;
    }

    try {
      setMessage(null);
      setSubmitting(true);

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Zeitüberschreitung – bitte erneut versuchen")), 15_000)
      );
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);

      if (error) {
        setMessage({ type: "error", text: `Anmeldung fehlgeschlagen: ${error.message}` });
      }
    } catch (error) {
      const isLoginTimeout =
        error instanceof Error && error.message === "Zeitüberschreitung – bitte erneut versuchen";
      setMessage({
        type: "error",
        text: isLoginTimeout
          ? "Anmeldung dauert länger als erwartet. Bitte kurz warten oder erneut versuchen."
          : `Technischer Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (mode === "forgot") void resetPassword();
    else void signIn();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">SM-TeamNotes</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Nur für eingeladene Teammitglieder.
        </p>

        {message ? (
          <div
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              message.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          {(["signin", "forgot"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setMessage(null); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-blue-500 text-white"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {m === "signin" ? "Anmelden" : "Passwort vergessen"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none dark:focus:border-blue-500"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none dark:focus:border-blue-500"
            />
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
              submitting || !canSubmit ? "bg-slate-400 dark:bg-slate-600" : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
            }`}
          >
            {submitting
              ? "Bitte warten…"
              : mode === "forgot"
                ? "Link zum Zurücksetzen senden"
                : "Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Password Recovery ──────────────────────────────────── */

function SetNewPasswordPage({ onDone, title, subtitle, buttonLabel }: {
  onDone: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Das Passwort muss mindestens 8 Zeichen haben." });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const TIMEOUT_MS = 30_000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Zeitüberschreitung (30 s). Netzwerk prüfen oder in Supabase unter Authentication → Providers → Email „Secure password change“ deaktivieren und erneut versuchen.")),
        TIMEOUT_MS
      );
    });

    try {
      const { error } = await Promise.race([
        supabase.auth.updateUser({
          password: newPassword,
          data: { password_set: true },
        }),
        timeoutPromise,
      ]);

      if (error) {
        console.error("[SetNewPasswordPage] updateUser error", error);
        setMessage({
          type: "error",
          text: `Fehler: ${error.message}. Bei „Waiting for verification“ in Supabase den Nutzer dort öffnen und E-Mail bestätigen, dann erneut versuchen.`,
        });
        return;
      }
      setMessage({ type: "success", text: "Passwort wurde gesetzt. Du wirst weitergeleitet…" });
      window.setTimeout(() => onDone(), 1500);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[SetNewPasswordPage] exception", err);
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{title || "Neues Passwort setzen"}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {subtitle || "Mindestens 8 Zeichen."}
        </p>

        {message ? (
          <div
            role="status"
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
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Neues Passwort"
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSetPassword()}
            disabled={submitting || newPassword.length < 8}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
              submitting || newPassword.length < 8 ? "bg-slate-400" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {submitting ? "Bitte warten…" : (buttonLabel || "Passwort speichern")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
