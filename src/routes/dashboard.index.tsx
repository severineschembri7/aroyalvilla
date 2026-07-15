import { createFileRoute, Link } from "@tanstack/react-router";
import {
  arrivalsOn,
  departuresOn,
  housekeeping,
  occupancy,
  reservationsOn,
  todayISO,
} from "@/lib/mock-ops";
import { findRoom } from "@/lib/rooms";

export const Route = createFileRoute("/dashboard/")({
  component: TodayView,
});

function TodayView() {
  const arr = arrivalsOn(todayISO);
  const dep = departuresOn(todayISO);
  const occ = occupancy(todayISO);
  const inHouse = reservationsOn(todayISO).filter((r) => r.status !== "cancelled");
  const revenue = inHouse.reduce((s, r) => s + r.ratePerNight, 0);
  const pendingTasks = housekeeping.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-espresso/40 mb-2">
          Today at a glance ·{" "}
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Occupancy" value={`${occ.pct}%`} sub={`${occ.occupied} of ${occ.total} rooms`} />
          <Stat label="Arrivals" value={arr.length} sub="Expected today" />
          <Stat label="Departures" value={dep.length} sub="Check-outs by 11:00" />
          <Stat
            label="Room revenue"
            value={`$${revenue.toLocaleString()}`}
            sub={`${pendingTasks} open HK tasks`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Arrivals" count={arr.length} link="/dashboard/reservations">
          {arr.length === 0 ? (
            <Empty label="No arrivals scheduled." />
          ) : (
            <ul className="divide-y divide-espresso/10">
              {arr.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.guestName}</div>
                    <div className="text-xs text-espresso/60">
                      {findRoom(r.roomId)?.name} #{r.unit} · {r.nights}n · {r.channel}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest bg-sage/30 text-espresso px-2 py-1">
                    {r.reference}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Departures" count={dep.length} link="/dashboard/reservations">
          {dep.length === 0 ? (
            <Empty label="No departures today." />
          ) : (
            <ul className="divide-y divide-espresso/10">
              {dep.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{r.guestName}</div>
                    <div className="text-xs text-espresso/60">
                      {findRoom(r.roomId)?.name} #{r.unit} · ${r.total.toLocaleString()} folio
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest bg-gold/20 text-espresso px-2 py-1">
                    Checkout
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Housekeeping queue" count={pendingTasks} link="/dashboard/housekeeping">
          <ul className="divide-y divide-espresso/10">
            {housekeeping.slice(0, 6).map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">
                    {findRoom(t.roomId)?.name} #{t.unit}
                  </div>
                  <div className="text-xs text-espresso/60 capitalize">
                    {t.type.replace("-", " ")} · {t.assignee} · due {t.dueBy}
                  </div>
                </div>
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="In-house guests" count={inHouse.length} link="/dashboard/guests">
          <ul className="divide-y divide-espresso/10">
            {inHouse.slice(0, 6).map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.guestName}</div>
                  <div className="text-xs text-espresso/60">
                    {findRoom(r.roomId)?.name} #{r.unit} · departs {r.checkOut}
                  </div>
                </div>
                <span className="text-xs text-espresso/50">{r.guests} pax</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white p-5 border border-espresso/10">
      <div className="text-[10px] uppercase tracking-widest text-espresso/40">{label}</div>
      <div className="font-serif text-3xl mt-1">{value}</div>
      {sub ? <div className="text-xs text-espresso/50 mt-1">{sub}</div> : null}
    </div>
  );
}

function Panel({
  title,
  count,
  link,
  children,
}: {
  title: string;
  count: number;
  link: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-espresso/10 p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="font-serif text-lg">{title}</h3>
          <div className="text-[10px] uppercase tracking-widest text-espresso/40">
            {count} total
          </div>
        </div>
        <Link to={link} className="text-xs text-terracotta hover:underline">
          View all →
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-6 text-sm text-espresso/40 text-center">{label}</div>;
}

function StatusPill({ status }: { status: "pending" | "in-progress" | "done" }) {
  const map = {
    pending: "bg-gold/20 text-espresso",
    "in-progress": "bg-terracotta/15 text-terracotta",
    done: "bg-sage/40 text-espresso",
  } as const;
  return (
    <span
      className={`text-[10px] uppercase tracking-widest px-2 py-1 ${map[status]}`}
    >
      {status.replace("-", " ")}
    </span>
  );
}