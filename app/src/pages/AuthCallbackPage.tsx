import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Status = "processing" | "error";

/**
 * Dedicated auth callback page for Supabase PKCE + implicit flows.
 * Exchanges ?code=… for a session, persists recovery flag, then redirects to /.
 */
export function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>("processing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const hashHasToken =
          window.location.hash.includes("access_token") ||
          window.location.hash.includes("type=");

        if (!code && !hashHasToken) {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg(
              "Kein gültiger Auth-Link erkannt. Bitte den Link erneut anfordern."
            );
          }
          return;
        }

        if (code) {
          let isRecovery = false;
          const { data: listener } = supabase.auth.onAuthStateChange(
            (event) => {
              if (event === "PASSWORD_RECOVERY") isRecovery = true;
            }
          );

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          listener.subscription.unsubscribe();
          if (cancelled) return;

          if (error) {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) {
              window.history.replaceState({}, document.title, "/");
              window.location.replace("/");
              return;
            }
            setStatus("error");
            setErrorMsg(error.message);
            return;
          }

          if (isRecovery) {
            try {
              sessionStorage.setItem("auth:pendingRecovery", "true");
            } catch {
              /* ignore */
            }
          }
        }

        // Hash-based implicit flow: Supabase auto-detects via detectSessionInUrl.
        // Poll briefly until the session is established.
        if (hashHasToken && !code) {
          for (let attempt = 0; attempt < 15; attempt++) {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session) break;
            await new Promise<void>((r) => setTimeout(r, 300));
          }
        }

        if (cancelled) return;
        window.history.replaceState({}, document.title, "/");
        window.location.replace("/");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Unbekannter Fehler bei der Anmeldung."
        );
      }
    }

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-app)] px-6">
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {errorMsg ?? "Unbekannter Fehler"}
        </p>
        <a
          href="/"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          Zurück zur Anmeldung
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Verarbeite Login-Link…
        </p>
      </div>
    </div>
  );
}
