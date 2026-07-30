import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin.functions";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  BedDouble,
  BarChart3,
  Share2,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

type SessionState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; email: string }
  | { kind: "ok"; email: string; roles: string[] };

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/reservations", label: "Reservations", icon: CalendarCheck },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/guests", label: "Guests", icon: Users },
  { to: "/admin/housekeeping", label: "Housekeeping", icon: BedDouble },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/channels", label: "Channels", icon: Share2 },
  { to: "/admin/staff", label: "Staff & roles", icon: ShieldCheck, adminOnly: true },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<SessionState>({ kind: "loading" });

  const isLogin = location.pathname === "/admin/login";

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setState({ kind: "unauthenticated" });
        return;
      }
      try {
        const res = await getMyRoles();
        if (cancelled) return;
        const roles = res.roles;
        if (!roles.includes("admin") && !roles.includes("staff")) {
          setState({ kind: "forbidden", email: data.user.email ?? "" });
          return;
        }
        setState({ kind: "ok", email: data.user.email ?? "", roles });
      } catch {
        if (!cancelled) setState({ kind: "forbidden", email: data.user.email ?? "" });
      }
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void check();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (isLogin) {
    return <Outlet />;
  }

  if (state.kind === "loading") {
    return <FullScreen>Loading dashboard…</FullScreen>;
  }
  if (state.kind === "unauthenticated") {
    return (
      <FullScreen>
        <div className="text-center">
          <p className="mb-4">You need to sign in to access the dashboard.</p>
          <button
            className="rounded bg-espresso px-4 py-2 text-cream"
            onClick={() => navigate({ to: "/admin/login" })}
          >
            Go to sign in
          </button>
        </div>
      </FullScreen>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <FullScreen>
        <div className="max-w-md text-center">
          <h2 className="mb-2 font-serif text-2xl text-espresso">Access denied</h2>
          <p className="mb-4 text-sm text-espresso/70">
            {state.email} is signed in but has no staff role. Ask an administrator to grant access.
          </p>
          <button
            className="rounded border border-espresso/30 px-4 py-2 text-sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
          >
            Sign out
          </button>
        </div>
      </FullScreen>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-espresso font-sans">
      <header className="border-b border-espresso/10 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-serif text-lg text-espresso">African Royal Villa · Dashboard</p>
            <p className="text-xs text-espresso/60">{state.email} · {state.roles.join(", ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs underline text-espresso/70">View site</Link>
            <button
              className="rounded border border-espresso/30 px-3 py-1 text-xs"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {NAV.map((n) => {
            const active = n.exact
              ? location.pathname === n.to
              : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`whitespace-nowrap rounded px-3 py-1.5 transition ${
                  active ? "bg-espresso text-cream" : "text-espresso/70 hover:bg-espresso/5"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-espresso">
      {children}
    </div>
  );
}