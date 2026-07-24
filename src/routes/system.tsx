import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [{ title: "Reservation System — African Royal Villa" }],
  }),
  component: SystemDashboard,
});

type BookingRow = {
  reference: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number;
  created_at: string;
};

type AuthMode = "signin" | "signup";

const approvedStaffRoles = (import.meta.env.VITE_APPROVED_STAFF_ROLES ?? "staff,admin")
  .split(",")
  .map((role) => role.trim().toLowerCase())
  .filter(Boolean);

const approvedStaffEmails = (import.meta.env.VITE_APPROVED_STAFF_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isApprovedStaff(user: Session["user"] | null | undefined) {
  if (!user) return false;

  const roles = [
    user.user_metadata?.role,
    user.user_metadata?.roles,
    user.app_metadata?.role,
    user.app_metadata?.roles,
  ]
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase());
      return [String(value).toLowerCase()];
    })
    .filter(Boolean);

  const email = user.email?.toLowerCase();
  const hasApprovedRole = roles.some((role) => approvedStaffRoles.includes(role));
  const hasApprovedEmail = Boolean(email && approvedStaffEmails.includes(email));

  return hasApprovedRole || hasApprovedEmail;
}

function SystemDashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialiseSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
      setAccessAllowed(currentSession?.user ? isApprovedStaff(currentSession.user) : false);
      setAuthReady(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setAccessAllowed(currentSession?.user ? isApprovedStaff(currentSession.user) : false);
      setAuthReady(true);
    });

    void initialiseSession();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setAccessAllowed(false);
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isApprovedStaff(session.user)) {
      setAccessAllowed(false);
      setBookings([]);
      setLoading(false);
      return;
    }

    setAccessAllowed(true);

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("reference, room_name, check_in, check_out, guests, status, total, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled && !error) setBookings((data ?? []) as BookingRow[]);
      if (!cancelled) setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("booking-live-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          setBookings((current) => [payload.new as BookingRow, ...current].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [authReady, session]);

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage("Signed in successfully. You can now manage reservations.");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              role: "staff",
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          setAuthMessage("Account created. You are now signed in.");
        } else {
          setAuthMessage("Account created. Check your email for the confirmation link before signing in.");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setAuthMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAccessAllowed(false);
    setAuthMessage("You have been signed out.");
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6">
        <div className="rounded-3xl border border-espresso/10 bg-white p-8 text-sm text-espresso/70 shadow-sm">
          Initialising staff access…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-terracotta">Staff access</p>
          <h1 className="mt-3 font-serif text-3xl text-espresso">Sign in to the reservation dashboard</h1>
          <p className="mt-3 text-sm text-espresso/70">
            Use a real Supabase Auth account with an approved staff role or email to access live bookings, arrivals, and guest operations.
          </p>

          <div className="mt-6 flex rounded-full border border-espresso/10 bg-cream p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setAuthMessage(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${authMode === "signin" ? "bg-terracotta text-cream" : "text-espresso/70"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthMessage(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${authMode === "signup" ? "bg-terracotta text-cream" : "text-espresso/70"}`}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleAuthSubmit}>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Email</span>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Password</span>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
              />
            </label>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-espresso px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create staff account"}
            </button>
          </form>

          {authMessage ? <p className="mt-4 rounded-xl bg-sage/20 px-4 py-3 text-sm text-espresso">{authMessage}</p> : null}

          <p className="mt-5 text-sm text-espresso/60">
            Access is granted only to accounts with the approved staff role or an approved email address. Configure VITE_APPROVED_STAFF_ROLES and VITE_APPROVED_STAFF_EMAILS in your environment to manage access.
          </p>
        </div>
      </div>
    );
  }

  if (accessAllowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-terracotta">Access denied</p>
          <h1 className="mt-3 font-serif text-3xl text-espresso">This account is not approved for staff operations</h1>
          <p className="mt-3 text-sm text-espresso/70">
            Your Supabase account is signed in, but it does not currently have an approved staff role or email. Ask the operations lead to approve the account before trying again.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 w-full rounded-lg bg-espresso px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-terracotta"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-terracotta">Reservation system</p>
              <h1 className="mt-2 font-serif text-3xl text-espresso">Front desk operations</h1>
              <p className="mt-2 text-sm text-espresso/60">
                Live website bookings stream into the same calendar view instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-sage/20 px-4 py-2 text-sm font-medium text-espresso">
                Live sync enabled
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-espresso/10 px-4 py-2 text-sm font-medium text-espresso transition hover:bg-cream"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { label: "Occupancy", value: "82%" },
              { label: "Arrivals today", value: "6" },
              { label: "Departures", value: "3" },
              { label: "F&B revenue", value: "$4,280" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-espresso/10 bg-cream p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-espresso/40">{item.label}</div>
                <div className="mt-2 font-serif text-3xl text-espresso">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-espresso/10 bg-cream p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-espresso/40">Today at a glance</p>
                  <h2 className="mt-2 font-serif text-2xl text-espresso">Live arrivals and departures</h2>
                </div>
                <div className="rounded-full bg-sage/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-espresso">
                  Live sync
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { title: "Arrival: ARV-8XK2P", detail: "Deluxe Room · 2 guests" },
                  { title: "Departure: ARV-4RQ9M", detail: "Garden Single · breakfast included" },
                  { title: "Website booking received", detail: "Family Room · instant update in the feed" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-espresso/10 bg-white px-4 py-3">
                    <div className="font-medium text-espresso">{item.title}</div>
                    <div className="mt-1 text-sm text-espresso/60">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-espresso/10 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-espresso/40">Operations</p>
              <h2 className="mt-2 font-serif text-2xl text-espresso">Housekeeping &amp; service board</h2>
              <div className="mt-6 space-y-3">
                {[
                  { title: "Room prep", detail: "Garden view · quiet room requested" },
                  { title: "Dining notes", detail: "Allergy flag synced from guest profile" },
                  { title: "Billing", detail: "Deposit pending for one arrival" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-espresso/10 bg-cream px-4 py-3">
                    <div className="font-medium text-espresso">{item.title}</div>
                    <div className="mt-1 text-sm text-espresso/60">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-espresso/10">
            <table className="min-w-full divide-y divide-espresso/10 text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-widest text-espresso/50">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso/10 bg-white">
                {loading ? (
                  <tr><td className="px-4 py-6 text-espresso/60" colSpan={6}>Loading reservations…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td className="px-4 py-6 text-espresso/60" colSpan={6}>No reservations yet.</td></tr>
                ) : bookings.map((booking) => (
                  <tr key={booking.reference} className="hover:bg-cream/70">
                    <td className="px-4 py-3 font-medium text-espresso">{booking.reference}</td>
                    <td className="px-4 py-3">{booking.room_name}</td>
                    <td className="px-4 py-3">{booking.check_in} → {booking.check_out}</td>
                    <td className="px-4 py-3">{booking.guests}</td>
                    <td className="px-4 py-3">{booking.status}</td>
                    <td className="px-4 py-3">${booking.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
