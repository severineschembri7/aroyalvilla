import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin/login` },
        });
        if (error) throw error;
        setInfo("Account created. You can sign in now.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 text-espresso">
      <div className="w-full max-w-md rounded-lg border border-espresso/10 bg-white p-6 shadow-sm">
        <h1 className="mb-1 font-serif text-2xl">Staff sign in</h1>
        <p className="mb-5 text-sm text-espresso/70">African Royal Villa · Reservation dashboard</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-espresso/70">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-espresso/20 bg-white px-3 py-2" autoComplete="email" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-espresso/70">Password</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-espresso/20 bg-white px-3 py-2"
              autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </label>
          {error && <p className="text-sm text-terracotta">{error}</p>}
          {info && <p className="text-sm text-sage">{info}</p>}
          <button type="submit" disabled={busy} className="w-full rounded bg-espresso px-4 py-2 text-cream disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-espresso/60">
          {mode === "signin" ? (
            <button className="underline" onClick={() => setMode("signup")}>Create staff account</button>
          ) : (
            <button className="underline" onClick={() => setMode("signin")}>Have an account? Sign in</button>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-espresso/50">
          Only accounts granted a staff role can access the dashboard.
        </p>
      </div>
    </div>
  );
}