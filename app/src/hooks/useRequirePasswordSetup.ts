import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, hasValidAuthConfig } from "../lib/supabase";

const MIN_PASSWORD_LENGTH = 8;
const LOADING_TIMEOUT_MS = 10_000;

const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "true";

function isPasswordSet(session: Session | null): boolean {
  if (!session?.user) return false;
  const meta = session.user.user_metadata;
  return meta != null && meta.password_set === true;
}

function isSessionInvalidError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: string }).message ?? "").toLowerCase();
  return (
    msg.includes("invalid_jwt") ||
    msg.includes("refresh_token") ||
    msg.includes("session_expired") ||
    msg.includes("auth_session_missing")
  );
}

export function useRequirePasswordSetup(): {
  loading: boolean;
  session: Session | null;
  needsPasswordSetup: boolean;
  authError: string | null;
  clearAuthError: () => void;
} {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const needsPasswordSetup = Boolean(session?.user && !isPasswordSet(session));

  useEffect(() => {
    if (!DEBUG_AUTH || !session?.user) return;
    const passwordSet = isPasswordSet(session);
    const value = session.user.user_metadata?.password_set;
    console.debug("[useRequirePasswordSetup]", {
      "session.user.id": session.user.id,
      "user_metadata.password_set": value,
      needsPasswordSetup: !passwordSet,
    });
  }, [session, needsPasswordSetup]);

  useEffect(() => {
    if (!DEBUG_AUTH) return;
    console.debug("[Auth:guard]", {
      loading,
      hasUser: !!session?.user,
      needsPasswordSetup,
    });
  }, [loading, session, needsPasswordSetup]);

  useEffect(() => {
    if (!hasValidAuthConfig) {
      setLoading(false);
      setAuthError("config");
      return;
    }
    // Ohne gespeicherte Session sofort Anmeldebildschirm zeigen (kein Warten auf getSession).
    const hasStoredSession =
      typeof localStorage !== "undefined" &&
      Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).some(
        (k) => k?.startsWith("sb-") ?? false
      );
    if (!hasStoredSession) {
      setLoading(false);
    }

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finishLoading = (errorType: string | null = null) => {
      if (!isMounted) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = undefined;
      setLoading(false);
      if (errorType) setAuthError(errorType);
    };

    const init = async () => {
      if (DEBUG_AUTH) console.debug("[Auth:init] getSession() start");
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        if (!isMounted) return;
        // Token-Refresh läuft noch (langsames Netz) – Ladescreen beenden, kein Fehler zeigen.
        // onAuthStateChange liefert die Session sobald der Refresh fertig ist.
        console.warn("[Auth] loading timeout – showing login screen, waiting for onAuthStateChange");
        finishLoading(null);
      }, LOADING_TIMEOUT_MS);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sess = sessionData.session ?? null;

        if (DEBUG_AUTH) {
          console.debug("[Auth:init]", { hasSession: !!sess, hasUser: !!sess?.user });
        }

        if (!isMounted) return;

        // Use local session immediately so the app loads without waiting for getUser()
        setSession(sess);
        finishLoading(null);

        // Validate/refresh user in background to get latest user_metadata (e.g. password_set)
        if (sess?.user) {
          const { data: userData } = await supabase.auth.getUser();
          if (!isMounted) return;
          const userFromGetUser = userData?.user;
          if (userFromGetUser) {
            setSession({ ...sess, user: userFromGetUser });
          }
          if (DEBUG_AUTH) {
            console.debug("[Auth:deep]", {
              sessionFromGetSession: sess,
              userFromGetUser: userFromGetUser ?? null,
              localStorageKeys: Object.keys(localStorage).filter((k) => k.includes("sb-")),
            });
          }
        }
      } catch (e) {
        console.error("[Auth:init] init error", e);
        if (isMounted && isSessionInvalidError(e)) {
          await supabase.auth.signOut();
          setSession(null);
        }
        finishLoading(isSessionInvalidError(e) ? "session_invalid" : "init_error");
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      if (newSession?.user) {
        const { data: userData } = await supabase.auth.getUser();
        if (!isMounted) return;
        const user = userData?.user ?? newSession.user;
        setSession({ ...newSession, user });
      } else {
        setSession(newSession ?? null);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return { loading, session, needsPasswordSetup, authError, clearAuthError };
}

export { MIN_PASSWORD_LENGTH };
