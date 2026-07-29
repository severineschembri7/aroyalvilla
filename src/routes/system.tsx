import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentStaffSession, signOutStaff } from "@/lib/ops-store";
import { roleLabel } from "@/lib/permissions";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "African Royal Villa — Operations" }] }),
  component: SystemPage,
});

function SystemPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getCurrentStaffSession>>(null);

  useEffect(() => {
    const s = getCurrentStaffSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    setSession(s);
  }, [navigate]);

  if (!session) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Operations</h1>
            <p className="text-sm text-slate-600">
              {session.fullName} • {roleLabel(session.role)}
            </p>
          </div>
          <button
            onClick={() => {
              signOutStaff();
              navigate({ to: "/login" });
            }}
            className="px-3 py-2 bg-slate-200 rounded text-sm"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Link to="/restaurant" className="rounded border bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold">Restaurant & Bar</div>
            <div className="text-xs text-slate-500">Post orders to guest folios</div>
          </Link>
          <Link to="/staff/new" className="rounded border bg-white p-4 hover:bg-slate-50">
            <div className="font-semibold">Register Staff</div>
            <div className="text-xs text-slate-500">Add a new staff account</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
