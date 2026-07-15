import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

const tabs = [
  { to: "/dashboard", label: "Today", exact: true },
  { to: "/dashboard/calendar", label: "Calendar" },
  { to: "/dashboard/reservations", label: "Reservations" },
  { to: "/dashboard/guests", label: "Guests" },
  { to: "/dashboard/housekeeping", label: "Housekeeping" },
  { to: "/dashboard/reports", label: "Reporting" },
  { to: "/dashboard/channels", label: "Channels" },
] as const;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — African Royal Villa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="bg-cream min-h-[calc(100vh-4rem)]">
      <div className="border-b border-espresso/10 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 pt-6">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-terracotta font-semibold">
                Operations
              </div>
              <h1 className="font-serif text-2xl font-medium">Property Dashboard</h1>
            </div>
            <div className="text-xs text-espresso/50">
              African Royal Villa · Karatu · Signed in as Reception
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: t.exact ?? false }}
                className="text-sm px-4 py-3 border-b-2 border-transparent text-espresso/60 hover:text-espresso whitespace-nowrap"
                activeProps={{
                  className:
                    "text-sm px-4 py-3 border-b-2 border-terracotta text-espresso font-medium whitespace-nowrap",
                }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}