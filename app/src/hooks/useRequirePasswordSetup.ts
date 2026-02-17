import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

/** Only treat as "password set" when server explicitly has user_metadata.password_set === true */
function isPasswordSet(session: Session | null): boolean {
  if (!session?.user) return false;
  const meta = session.user.user_metadata;
  return meta != null && meta.password_set === true;
}

export function useRequirePasswordSetup(): {
  loading: boolean;
  session: Session | null;
  needsPasswordSetup: boolean;
} {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const needsPasswordSetup = Boolean(session?.user && !isPasswordSet(session));

  // Debug: verify session, metadata and guard result (remove or gate behind dev in production)
  useEffect(() => {
    if (!session?.user) return;
    const passwordSet = isPasswordSet(session);
    const value = session.user.user_metadata?.password_set;
    console.debug("[useRequirePasswordSetup]", {
      "session.user.id": session.user.id,
      "user_metadata.password_set": value,
      needsPasswordSetup: !passwordSet,
    });
  }, [session, needsPasswordSetup]);

  useEffect(() => {
    console.debug("[Auth:guard]", {
      loading,
      hasUser: !!session?.user,
      needsPasswordSetup,
    });
  }, [loading, session, needsPasswordSetup]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sess = sessionData.session ?? null;

        console.debug("[Auth:init]", {
          hasSession: !!sess,
          hasUser: !!sess?.user,
        });

        if (!isMounted) return;

        let userFromGetUser: Session["user"] | null | undefined;
        if (sess?.user) {
          const { data: userData } = await supabase.auth.getUser();
          if (!isMounted) return;
          userFromGetUser = userData?.user;
          if (userFromGetUser) {
            setSession({ ...sess, user: userFromGetUser });
          } else {
            setSession(sess);
          }
        } else {
          setSession(null);
        }

        console.debug("[Auth:deep]", {
          sessionFromGetSession: sess,
          userFromGetUser: userFromGetUser ?? null,
          localStorageKeys: Object.keys(localStorage).filter((k) => k.includes("sb-")),
        });
      } catch (e) {
        console.error("[Auth:init] init error", e);
      } finally {
        if (isMounted) {
          console.debug("[Auth:init] setLoading(false)");
          setLoading(false);
        }
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
      subscription.unsubscribe();
    };
  }, []);

  return { loading, session, needsPasswordSetup };
}

export { MIN_PASSWORD_LENGTH };
