import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { listStaffUsers, updateStaffRole } from "@/lib/staff.functions";

export const Route = createFileRoute("/system/staff")({
  head: () => ({
    meta: [{ title: "AfricanRoyal Villa — System" }],
  }),
  component: SystemDashboard,
});

type StaffUser = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  role: string;
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
  { label: "Staff", id: "staff", roles: ["management", "admin"] },
];

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
  children: ReactNode;
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
              <div className="font-semibold">AfricanRoyal Villa — System</div>
              <div className="text-slate-500">Staff operations workspace</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
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
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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
    if (!authReady || !session) return;
    if (!isApprovedStaff(session.user)) return;
    if (!getManagementStatus(session.user)) return;

    setStaffLoading(true);
    void listStaffUsers()
      .then((data) => setStaffUsers(data))
      .catch(() => {})
      .finally(() => setStaffLoading(false));
  }, [authReady, session]);

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

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdateStatus(null);
    try {
      await updateStaffRole({ data: { id: userId, role: role as "none" | "staff" | "management" | "admin" } });
      setStaffUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? { ...user, role }
            : user,
        ),
      );
      setUpdateStatus("Role updated.");
    } catch (error) {
      setUpdateStatus(error instanceof Error ? error.message : "Failed to update role.");
    }
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
        <section id="staff" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Staff management</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Approve staff and assign roles</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
              Management only
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {staffLoading ? (
              <p className="text-sm text-slate-500">Loading staff users…</p>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Last login</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffUsers.map((user) => (
                      <tr key={user.id}> 
                        <td className="px-4 py-3">{user.email ?? "Unknown"}</td>
                        <td className="px-4 py-3">{user.role}</td>
                        <td className="px-4 py-3">{user.lastSignInAt ?? "Never"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(event) => handleRoleChange(user.id, event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                          >
                            <option value="none">None</option>
                            <option value="staff">Staff</option>
                            <option value="management">Management</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {updateStatus ? (
            <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{updateStatus}</p>
          ) : null}
        </section>
      </div>
    </SystemShell>
  );
}
