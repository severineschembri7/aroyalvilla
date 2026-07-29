import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listAllBookings } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/guests")({ ssr: false, component: Guests });
type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];
type Profile = { email: string; name: string; phone: string; country: string | null; bookings: Booking[]; totalSpend: number };

function Guests() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { let c = false;
    const load = async () => { const d = await listAllBookings(); if (!c) setRows(d as Booking[]); };
    void load(); const t = setInterval(load, 30000); return () => { c = true; clearInterval(t); }; }, []);
  const profiles = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const b of rows) { const g = b.guest; if (!g?.email) continue;
      const key = g.email.toLowerCase();
      const p: Profile = map.get(key) ?? { email: g.email, name: `${g.first_name} ${g.last_name}`, phone: g.phone ?? "", country: g.country ?? null, bookings: [], totalSpend: 0 };
      p.bookings.push(b); if (b.status !== "cancelled") p.totalSpend += Number(b.total); map.set(key, p);
    }
    return [...map.values()].sort((a, b) => b.bookings.length - a.bookings.length);
  }, [rows]);
  const filtered = profiles.filter((p) => { const t = q.toLowerCase(); if (!t) return true;
    return p.name.toLowerCase().includes(t) || p.email.toLowerCase().includes(t) || p.phone.includes(t); });
  return (<div className="space-y-4">
    <div><h1 className="font-serif text-2xl">Guest Profiles</h1>
      <p className="text-sm text-espresso/60">Grouped by email · lifetime spend + history.</p></div>
    <input placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)}
      className="w-full rounded border border-espresso/20 bg-white px-3 py-2 text-sm" />
    <div className="grid gap-3 md:grid-cols-2">{filtered.map((p) => (
      <div key={p.email} className="rounded-lg border border-espresso/10 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-serif text-lg">{p.name}</p>
            <p className="text-xs text-espresso/60">{p.email} · {p.phone}</p>
            {p.country && <p className="text-xs text-espresso/50">{p.country}</p>}</div>
          <div className="text-right"><p className="font-serif text-xl">${p.totalSpend.toLocaleString()}</p>
            <p className="text-xs text-espresso/50">{p.bookings.length} booking{p.bookings.length === 1 ? "" : "s"}</p></div>
        </div>
        <ul className="mt-3 space-y-1 text-xs">{p.bookings.slice(0, 5).map((b) => (
          <li key={b.reference} className="flex flex-wrap justify-between gap-2">
            <span className="font-mono">{b.reference}</span><span>{b.room_name}</span>
            <span className="text-espresso/50">{b.check_in} → {b.check_out}</span>
            <span className="uppercase text-espresso/60">{b.status}</span></li>))}</ul>
      </div>))}
      {filtered.length === 0 && (<p className="text-sm text-espresso/50">No guests match.</p>)}
    </div>
  </div>);
}
