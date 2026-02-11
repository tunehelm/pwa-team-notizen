import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { QRCodeSVG } from "qrcode.react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { FolderPage } from "./pages/FolderPage";
import { NotePage } from "./pages/NotePage";
import { AppDataProvider } from "./state/AppDataContext";
import { supabase } from "./lib/supabase";

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) console.error(error);
      setSession(data.session ?? null);
      setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      alert(`Logout-Fehler: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Lade…
      </div>
    );
  }

  if (!session) return <LoginPage />;

  // Logged in -> show the app
  return (
    <AppDataProvider userId={session.user.id}>
      {/* Mini-Header nur für den Start: zeigt Login-Status + Logout */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 99999,
          pointerEvents: "auto",
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontFamily: "system-ui",
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.8 }}>{session.user.email ?? "Eingeloggt"}</span>
        <button
          onClick={signOut}
          style={{
            padding: "8px 10px",
            fontSize: 12,
            borderRadius: 8,
            cursor: "pointer",
            background: "#111827",
            color: "white",
            border: "none",
          }}
        >
          Logout
        </button>
      </div>

      <BrowserRouter>
        {import.meta.env.DEV ? <DevQrOverlay /> : null}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/folder/:id" element={<FolderPage />} />
          <Route path="/note/:id" element={<NotePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  );
}

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canSubmit = email.includes("@") && password.length >= 6;

  const submitWithPassword = async () => {
    if (!canSubmit) {
      setMessage({
        type: "error",
        text: "Bitte gueltige E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.",
      });
      return;
    }

    try {
      setMessage(null);
      setSubmitting(true);

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.error(error);
          setMessage({ type: "error", text: `Registrierung fehlgeschlagen: ${error.message}` });
          return;
        }

        if (data.session) {
          setMessage({ type: "success", text: "Registrierung erfolgreich. Du bist eingeloggt." });
        } else {
          setMessage({
            type: "success",
            text: "Registrierung erfolgreich. Bitte E-Mail bestaetigen und danach anmelden.",
          });
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(error);
        setMessage({ type: "error", text: `Anmeldung fehlgeschlagen: ${error.message}` });
      } else {
        setMessage({ type: "success", text: "Anmeldung erfolgreich." });
      }
    } catch (error) {
      console.error(error);
      const text = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage({ type: "error", text: `Technischer Fehler: ${text}` });
    } finally {
      setSubmitting(false);
    }
  };

  const sendMagicLink = async () => {
    if (!email.includes("@")) {
      setMessage({ type: "error", text: "Bitte zuerst eine gueltige E-Mail eingeben." });
      return;
    }

    try {
      setMessage(null);
      setSendingMagicLink(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error(error);
        setMessage({ type: "error", text: `Magic-Link Fehler: ${error.message}` });
      } else {
        setMessage({ type: "success", text: "Magic Link wurde per E-Mail verschickt." });
      }
    } catch (error) {
      console.error(error);
      const text = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage({ type: "error", text: `Technischer Fehler: ${text}` });
    } finally {
      setSendingMagicLink(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 460 }}>
      <h1 style={{ margin: "0 0 10px 0" }}>Team-Notizen</h1>
      <p style={{ margin: "0 0 18px 0", color: "#334155", fontSize: 14 }}>
        Einmal registrieren oder anmelden. Danach bleibst du bis zum Logout eingeloggt.
      </p>
      {message ? (
        <div
          role="status"
          style={{
            margin: "0 0 12px 0",
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
            color: message.type === "error" ? "#991b1b" : "#166534",
            fontSize: 14,
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setMode("signin")}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: mode === "signin" ? "#111827" : "white",
            color: mode === "signin" ? "white" : "#0f172a",
            cursor: "pointer",
          }}
        >
          Anmelden
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: mode === "signup" ? "#111827" : "white",
            color: mode === "signup" ? "white" : "#0f172a",
            cursor: "pointer",
          }}
        >
          Registrieren
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          autoComplete="email"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d0d0d0",
            fontSize: 16,
          }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort (mind. 6 Zeichen)"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d0d0d0",
            fontSize: 16,
          }}
        />

        <button
          type="button"
          onClick={submitWithPassword}
          disabled={submitting || !canSubmit}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 16,
            borderRadius: 8,
            cursor: submitting || !canSubmit ? "default" : "pointer",
            background: submitting || !canSubmit ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
          }}
        >
          {submitting
            ? "Bitte warten…"
            : mode === "signup"
              ? "Registrieren"
              : "Mit Passwort anmelden"}
        </button>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={sendingMagicLink || !email.includes("@")}
          style={{
            width: "100%",
            padding: "10px 14px",
            fontSize: 14,
            borderRadius: 8,
            cursor: sendingMagicLink || !email.includes("@") ? "default" : "pointer",
            background: "white",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
          }}
        >
          {sendingMagicLink ? "Sende Magic Link…" : "Alternativ: Magic Link senden"}
        </button>
      </div>
    </div>
  );
}

function DevQrOverlay() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 99999,
        fontFamily: "system-ui",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          minHeight: 44,
          minWidth: 44,
          padding: "10px 12px",
          borderRadius: 10,
          background: "#111827",
          color: "white",
          border: "none",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Show QR
      </button>

      {open ? (
        <div
          style={{
            marginTop: 8,
            width: 260,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "white",
            padding: 12,
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: "#334155" }}>Aktuelle URL (dev)</p>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <QRCodeSVG value={currentUrl} size={200} />
          </div>
          <button
            type="button"
            onClick={copyUrl}
            style={{
              marginTop: 10,
              minHeight: 44,
              width: "100%",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {copied ? "URL kopiert" : "URL kopieren"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;