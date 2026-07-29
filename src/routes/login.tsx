import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Africa Royal Villa — Staff Login" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        navigate({ to: "/system" });
        return;
      }
      setIsChecking(false);
    }

    void checkSession();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message || "Invalid staff email or password.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("user_id, active")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.active === false) {
      await supabase.auth.signOut();
      setError("This login is not linked to an active staff profile. Please contact management.");
      setLoading(false);
      return;
    }

    navigate({ to: "/system" });
    setLoading(false);
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8 text-center">
            <div className="text-sm uppercase tracking-widest text-slate-500 mb-2">Africa Royal Villa</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Staff Operations Console</h1>
            <p className="text-sm text-slate-600">Front desk and staff access only</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50" />
            </div>
            <button type="submit" disabled={loading} className="w-full mt-6 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-lg transition disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600"><strong>Staff access only.</strong> Use the staff account created in Supabase by management.</p>
            <p className="text-xs text-slate-600">
              <strong>Staff access only.</strong> Use your assigned property account. First-time setup is available from the operations console when no staff accounts exist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
