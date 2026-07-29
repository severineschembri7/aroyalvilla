import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listAllBookings } from "@/lib/admin.functions";
import { rooms } from "@/lib/rooms";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export const Route = createFileRoute("/admin/reports")({ ssr: false, component: Reports });
type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];

function Reports() {
  const [rows, setRows] = useState<Booking[]>([]);
  useEffect(() => { let c = false;
    const load = async () => { const d = await listAllBookings(); if (!c) setRows(d as Booking[]); };
    void load(); const t = setInterval(load, 60000); return () => { c = true; clearInterval(t); }; }, []);
  const inv = rooms.reduce((s, r) => s + r.totalUnits, 0);
  const monthly = useMemo(() => {
    const b: Record<string, { month: string; revenue: number; nights: number; bookings: number }> = {};
    for (const r of rows) { if (r.status === "cancelled") continue;
      const m = r.check_in.slice(0, 7);
      const x = b[m] ?? { month: m, revenue: 0, nights: 0, bookings: 0 };
      x.revenue += Number(r.total); x.nights += r.nights; x.bookings += 1; b[m] = x; }
    return Object.values(b).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
      .map((x) => ({ ...x, adr: x.nights ? Math.round(x.revenue / x.nights) : 0, revpar: Math.round(x.revenue / (30 * inv)) }));
  }, [rows, inv]);
  const byRoom = useMemo(() => { const m: Record<string, number> = {};
    for (const b of rows) { if (b.status === "cancelled") continue;
      m[b.room_name] = (m[b.room_name] ?? 0) + Number(b.total); }
    return Object.entries(m).map(([room, revenue]) => ({ room, revenue })); }, [rows]);
  const totalRev = rows.filter((r) => r.status !== "cancelled").reduce((s, b) => s + Number(b.total), 0);
  const totalNights = rows.filter((r) => r.status !== "cancelled").reduce((s, b) => s + b.nights, 0);
  const adr = totalNights ? Math.round(totalRev / totalNights) : 0;
  const occ = Math.round((totalNights / (365 * inv)) * 100);
  return (<div className="space-y-6">
    <div><h1 className="font-serif text-2xl">Reports</h1>
      <p className="text-sm text-espresso/60">ADR, RevPAR, occupancy and revenue by room.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Total revenue" value={`$${totalRev.toLocaleString()}`} />
      <Stat label="Room nights" value={totalNights} />
      <Stat label="ADR" value={`$${adr}`} />
      <Stat label="Occupancy (est.)" value={`${occ}%`} />
    </div>
    <Panel title="Revenue · last 6 months">
      <BarChart data={monthly}><XAxis dataKey="month" stroke="#3B2A22" /><YAxis stroke="#3B2A22" /><Tooltip /><Bar dataKey="revenue" fill="#B85042" /></BarChart>
    </Panel>
    <Panel title="ADR & RevPAR trend">
      <LineChart data={monthly}><XAxis dataKey="month" stroke="#3B2A22" /><YAxis stroke="#3B2A22" /><Tooltip />
        <Line type="monotone" dataKey="adr" stroke="#C99A4A" name="ADR" />
        <Line type="monotone" dataKey="revpar" stroke="#A7BEAE" name="RevPAR" /></LineChart>
    </Panel>
    <Panel title="Revenue by room category">
      <BarChart data={byRoom}><XAxis dataKey="room" stroke="#3B2A22" /><YAxis stroke="#3B2A22" /><Tooltip /><Bar dataKey="revenue" fill="#A7BEAE" /></BarChart>
    </Panel>
  </div>);
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (<div className="rounded-lg border border-espresso/10 bg-white p-4">
    <p className="text-xs uppercase tracking-wide text-espresso/50">{label}</p>
    <p className="mt-1 font-serif text-2xl">{value}</p></div>);
}
function Panel({ title, children }: { title: string; children: React.ReactElement }) {
  return (<div className="rounded-lg border border-espresso/10 bg-white p-4">
    <p className="mb-2 font-serif text-lg">{title}</p>
    <div className="h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>);
}
