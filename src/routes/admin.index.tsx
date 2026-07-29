import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAllBookings } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({ ssr: false, component: Overview });

type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];

function Overview() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    const load = async () => {
      try { const d = await listAllBookings(); if (!c) setBookings(d as Booking[]); }
      finally { if (!c) setLoading(false); }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => { c = true; clearInterval(t); };
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const arrivals = bookings.filter((b) => b.check_in === today && b.status !== "cancelled");
  const departures = bookings.filter((b) => b.check_out === today && b.status !== "cancelled");
  const inHouse = bookings.filter((b) => b.check_in <= today && b.check_out > today && b.status !== "cancelled");
  const pending = bookings.filter((b) => b.status === "pending");
  const revenue30 = bookings.filter((b) => Date.now() - new Date(b.created_at).getTime() < 30 * 86400000 && b.status !== "cancelled")
    .reduce((s, b) => s + Number(b.total), 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl">Today at a Glance</h1>
        <p className="text-sm text-espresso/60">Live · {loading ? "loading…" : `${bookings.length} reservations`}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Arrivals" value={arrivals.length} />
        <Stat label="Departures" value={departures.length} />
        <Stat label="In house" value={inHouse.length} />
        <Stat label="Pending" value={pending.length} />
        <Stat label="Revenue (30d)" value={`$${revenue30.toLocaleString()}`} />
      </div>
      <Section title="Arrivals today"><BookingTable rows={arrivals} /></Section>
      <Section title="Pending confirmation"><BookingTable rows={pending} /></Section>
      <Section title="Departures today"><BookingTable rows={departures} /></Section>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (<div className="rounded-lg border border-espresso/10 bg-white p-4">
    <p className="text-xs uppercase tracking-wide text-espresso/50">{label}</p>
    <p className="mt-1 font-serif text-2xl">{value}</p></div>);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<section><h2 className="mb-2 font-serif text-lg">{title}</h2>{children}</section>);
}
function BookingTable({ rows }: { rows: Booking[] }) {
  if (!rows.length) return <p className="rounded border border-dashed border-espresso/20 p-3 text-sm text-espresso/50">Nothing here.</p>;
  return (<div className="overflow-x-auto rounded-lg border border-espresso/10 bg-white"><table className="w-full text-sm">
    <thead className="bg-espresso/5 text-left text-xs uppercase text-espresso/60"><tr>
      <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Guest</th><th className="px-3 py-2">Room</th>
      <th className="px-3 py-2">Dates</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th></tr></thead>
    <tbody>{rows.map((b) => (<tr key={b.reference} className="border-t border-espresso/5">
      <td className="px-3 py-2 font-mono text-xs">{b.reference}</td>
      <td className="px-3 py-2">{b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "—"}</td>
      <td className="px-3 py-2">{b.room_name}</td>
      <td className="px-3 py-2 text-xs">{b.check_in} → {b.check_out}</td>
      <td className="px-3 py-2">${Number(b.total).toLocaleString()}</td>
      <td className="px-3 py-2 text-xs uppercase">{b.status}</td></tr>))}</tbody></table></div>);
}
