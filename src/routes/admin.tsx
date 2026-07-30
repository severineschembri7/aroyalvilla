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

  const isAdmin = state.roles.includes("admin");
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);
  const initials = (state.email[0] ?? "A").toUpperCase();

  const navLinks = (
    <>
      {items.map((n) => {
        const active = n.exact
          ? location.pathname === n.to
          : location.pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
              active
                ? "bg-espresso text-cream shadow-sm"
                : "text-espresso/70 hover:bg-espresso/5 hover:text-espresso"
            }`}
          >
            <Icon className="size-4" />
            {n.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-cream font-sans text-espresso lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-espresso/10 bg-white/70 px-4 py-6 lg:flex">
        <Link to="/admin" className="px-2">
          <p className="font-serif text-xl italic leading-tight">African Royal Villa</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-espresso/40">
            Operations
          </p>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">{navLinks}</nav>
        <div className="mt-6 rounded-2xl border border-espresso/10 bg-cream p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-terracotta text-sm font-semibold text-cream">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{state.email}</p>
              <p className="text-[10px] uppercase tracking-widest text-espresso/50">
                {state.roles.join(" · ")}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              to="/"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-espresso/15 py-1.5 text-[11px] text-espresso/70 hover:bg-white"
            >
              <ExternalLink className="size-3" /> Site
            </Link>
            <button
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-espresso/15 py-1.5 text-[11px] text-espresso/70 hover:bg-white"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="size-3" /> Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-espresso/10 bg-cream/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="font-serif text-base italic">African Royal Villa</p>
              <p className="truncate text-[10px] uppercase tracking-widest text-espresso/50">
                {state.roles.join(" · ")}
              </p>
            </div>
            <button
              className="flex items-center gap-1 rounded-lg border border-espresso/20 px-3 py-1.5 text-xs"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="size-3" /> Sign out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{navLinks}</nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
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