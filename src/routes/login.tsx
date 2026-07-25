import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole } from "@/lib/permissions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "African Royal Villa — Staff Login" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Get user role from staff_profiles
          const { data: staffProfile, error: profileError } = await supabase
            .from("staff_profiles")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          if (!profileError && staffProfile) {
            const normalizedRole = normalizeRole(staffProfile.role);
            navigate({ to: "/system" });
            return;
          }
        }
      } catch (err) {
        // Silently fail - proceed to login
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        setError(authError.message || "Failed to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (!data.session?.user) {
        setError("Authentication failed. No user data returned.");
        setLoading(false);
        return;
      }

      // Verify staff profile exists
      const { data: staffProfile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("role, active")
        .eq("user_id", data.session.user.id)
        .single();

      if (profileError || !staffProfile) {
        setError("Staff account not found. Please contact management.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!staffProfile.active) {
        setError("This staff account has been deactivated. Please contact management.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Successfully authenticated - redirect to system
      navigate({ to: "/system" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="text-sm uppercase tracking-widest text-slate-500 mb-2">
              African Royal Villa
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Operations Console
            </h1>
            <p className="text-sm text-slate-600">
              Staff access only
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">
              <strong>Staff access only.</strong> If you don't have credentials, please contact management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
