import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const RECOVERY_FLAG = "auth:pendingRecovery";

/**
 * Verarbeitet Redirect nach E-Mail-Link (Passwort-Reset, Einladung, Magic Link).
 * Liest ?code= (PKCE) oder verlässt sich auf detectSessionInUrl für Hash,
 * setzt ggf. Recovery-Flag und leitet auf / weiter.
 */
export function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hash = window.location.hash;
      const isRecovery =
        hash.includes("type=recovery") || params.get("type") === "recovery";
      const isInvite =
        hash.includes("type=invite") || params.get("type") === "invite";

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setStatus("error");
            setErrorMessage(error.message);
            return;
          }
          if (isRecovery || isInvite) {
            try {
              sessionStorage.setItem(RECOVERY_FLAG, "true");
            } catch {
              /* ignore */
            }
          }
          window.location.replace(window.location.origin + "/");
          return;
        }

        // Hash-Flow: Supabase parst den Hash (detectSessionInUrl) und feuert onAuthStateChange.
        // Listener statt getSession() vermeidet "The operation was aborted".
        const done = () => {
          if (cancelled) return;
          if (isRecovery || isInvite) {
            try {
              sessionStorage.setItem(RECOVERY_FLAG, "true");
            } catch {
              /* ignore */
            }
            // Query-Parameter als Fallback, falls sessionStorage beim Redirect verloren geht
            window.location.replace(window.location.origin + "/?recovery=1");
            return;
          }
          window.location.replace(window.location.origin + "/");
        };

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) done();
        });

        const t = window.setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) done();
          }).catch(() => { /* ignore */ });
        }, 1200);

        const fail = window.setTimeout(() => {
          if (cancelled) return;
          sub.subscription.unsubscribe();
          window.clearTimeout(t);
          setStatus("error");
          setErrorMessage("Session konnte nicht hergestellt werden. Link evtl. abgelaufen – bitte erneut anfordern.");
        }, 8000);

        cleanup = () => {
          window.clearTimeout(t);
          window.clearTimeout(fail);
          sub.subscription.unsubscribe();
        };
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
      }
    };

    void run();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg-app)] px-6">
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          {errorMessage}
        </p>
        <a
          href="/"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          Zur Startseite
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg-app)]">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm text-[var(--color-text-secondary)]">
        Wird weitergeleitet…
      </p>
    </div>
  );
}
