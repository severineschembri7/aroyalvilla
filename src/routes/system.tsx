import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [{ title: "African Royal Villa — System" }],
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

type StaffNavItem = {
  label: string;
  id: string;
  roles?: string[];
};

const systemNavItems: StaffNavItem[] = [
  { label: "Dashboard", id: "dashboard" },
  { label: "Reservations", id: "reservations" },
  { label: "Restaurant & Bar", id: "restaurant" },
  { label: "Billing & Invoicing", id: "billing" },
  { label: "HR & Staff", id: "hr", roles: ["management", "admin"] },
  { label: "Reports", id: "reports", roles: ["management", "admin"] },
];

const appBaseUrl = import.meta.env.VITE_SYSTEM_BASE_URL ?? "";

const approvedStaffRoles = (import.meta.env.VITE_APPROVED_STAFF_ROLES ?? "staff,admin")
  .split(",")
  .map((role) => role.trim().toLowerCase())
  .filter(Boolean);

const approvedStaffEmails = (import.meta.env.VITE_APPROVED_STAFF_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function extractStaffRoles(user: Session["user"] | null | undefined) {
  if (!user) return [];

  return [
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
}

function isApprovedStaff(user: Session["user"] | null | undefined) {
  const roles = extractStaffRoles(user);
  const email = user?.email?.toLowerCase();
  return (
    roles.some((role) => approvedStaffRoles.includes(role)) ||
    Boolean(email && approvedStaffEmails.includes(email))
  );
}

function getManagementStatus(user: Session["user"] | null | undefined) {
  const roles = extractStaffRoles(user);
  return roles.some((role) => role === "management" || role === "admin");
}

function SystemShell({
  children,
  userName,
  userRole,
  isManagement,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  isManagement: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = systemNavItems.filter((item) => {
    if (!item.roles) return true;
    return isManagement;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-950 px-3 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white">
              ARV System
            </div>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">African Royal Villa — System</div>
              <div className="text-slate-500">Staff operations workspace</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`${appBaseUrl ? appBaseUrl : ""}#${item.id}`}
                className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 md:flex">
              <span className="font-semibold">{userName}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-slate-600">
                {userRole}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden"
              aria-label="Toggle navigation"
            >
              <span className="text-lg">☰</span>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 md:hidden">
            <div className="space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
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
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
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

  const staffName = session?.user.user_metadata?.full_name || session?.user.email || "Staff";
  const staffRole = extractStaffRoles(session?.user).join(", ") || "staff";
  const isManagement = getManagementStatus(session?.user);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Initialising staff access…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Staff access</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Sign in to the operations system</h1>
          <p className="mt-3 text-sm text-slate-600">
            Use your Supabase staff account to access the reservation dashboard, reports, and operations tools.
          </p>

          <div className="mt-6 flex rounded-full border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setAuthMessage(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${authMode === "signin" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthMessage(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${authMode === "signup" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleAuthSubmit}>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Email</span>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Password</span>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create staff account"}
            </button>
          </form>

          {authMessage ? (
            <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{authMessage}</p>
          ) : null}

          <p className="mt-5 text-sm text-slate-500">
            Accounts must be approved using your staff allowlist or role policy before the dashboard becomes available.
          </p>
        </div>
      </div>
    );
  }

  if (accessAllowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Access denied</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Account not approved</h1>
          <p className="mt-3 text-sm text-slate-600">
            Your account is signed in but is not yet authorized for the operations system. Contact your manager to approve your staff role or email.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <SystemShell userName={staffName} userRole={staffRole} isManagement={isManagement}>
      <div id="dashboard" className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Today at a glance</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Front desk & reservations</h1>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
                Live sync
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Occupancy", value: "82%" },
                { label: "Arrivals", value: "6" },
                { label: "Departures", value: "3" },
                { label: "F&B revenue", value: "$4,280" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Operations pulse</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Room states & priorities</h2>
            <div className="mt-6 space-y-3">
              {[
                { label: "Room prep", value: "Garden view · quiet" },
                { label: "Dining notes", value: "Allergy flag active" },
                { label: "Billing", value: "Deposit pending" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section id="reservations" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Reservations</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Latest bookings</h2>
            </div>
            <div className="text-sm text-slate-600">Auto-updating feed from website bookings</div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      Loading reservations…
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      No reservations yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.reference} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{booking.reference}</td>
                      <td className="px-4 py-3">{booking.room_name}</td>
                      <td className="px-4 py-3">{booking.check_in} → {booking.check_out}</td>
                      <td className="px-4 py-3">{booking.guests}</td>
                      <td className="px-4 py-3 text-slate-600">{booking.status}</td>
                      <td className="px-4 py-3">${booking.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="restaurant" className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm xl:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Restaurant & Bar</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Service status</h2>
            <div className="mt-6 space-y-3">
              {[
                { label: "Table service", value: "8 active orders" },
                { label: "Kitchen tickets", value: "3 awaiting prep" },
                { label: "Guest alerts", value: "2 dietary flags" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Guest-aware actions</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">Charge to room</h3>
            <p className="mt-2 text-sm text-slate-600">
              Select a booking to add bar or restaurant charges directly to the guest folio.
            </p>
            <button className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Open folio panel
            </button>
          </div>
        </section>

        <section id="billing" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Billing & Invoicing</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Revenue snapshot</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Daily revenue", value: "$8,420" },
              { label: "ADR", value: "$210" },
              { label: "RevPAR", value: "$172" },
              { label: "F&B revenue", value: "$4,280" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {isManagement ? (
          <>
            <section id="hr" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">HR & Staff</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Team roster</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "Martha", role: "Front desk" },
                  { name: "Juma", role: "Food & Beverage" },
                  { name: "Amina", role: "Housekeeping" },
                ].map((member) => (
                  <div key={member.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{member.role}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="reports" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Reports</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Management summaries</h2>
              <div className="mt-6 space-y-4">
                {[
                  { title: "Occupancy trend", detail: "3-day lookahead" },
                  { title: "Revenue mix", detail: "Rooms vs F&B vs extras" },
                  { title: "Staff utilization", detail: "Shift coverage is 94%" },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </SystemShell>
  );
}
