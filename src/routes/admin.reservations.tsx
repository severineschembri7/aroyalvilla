import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listAllBookings, adminUpdateBookingStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reservations")({ ssr: false, component: Reservations });
type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];
const STATUSES = ["pending","confirmed","checked_in","checked_out","cancelled"] as const;

function Reservations() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { const d = await listAllBookings(); setRows(d as Booking[]); };
  useEffect(() => { void load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return rows.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!term) return true;
      return b.reference.toLowerCase().includes(term) || b.room_name.toLowerCase().includes(term)
        || (b.guest?.first_name?.toLowerCase() ?? "").includes(term)
        || (b.guest?.last_name?.toLowerCase() ?? "").includes(term)
        || (b.guest?.email?.toLowerCase() ?? "").includes(term);
    });
  }, [rows, q, status]);
  const change = async (reference: string, next: string) => {
    setBusy(reference);
    try { await adminUpdateBookingStatus({ data: { reference, status: next as any } }); await load(); }
    finally { setBusy(null); }
  };
  return (<div className="space-y-4">
    <div><h1 className="font-serif text-2xl">Reservations</h1>
      <p className="text-sm text-espresso/60">Search, filter, and update the status of any booking.</p></div>
    <div className="flex flex-wrap gap-2">
      <input placeholder="Search reference, guest, room…" value={q} onChange={(e) => setQ(e.target.value)}
        className="flex-1 rounded border border-espresso/20 bg-white px-3 py-2 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value)}
        className="rounded border border-espresso/20 bg-white px-3 py-2 text-sm">
        <option value="all">All statuses</option>
        {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
      </select>
    </div>
    <div className="overflow-x-auto rounded-lg border border-espresso/10 bg-white"><table className="w-full text-sm">
      <thead className="bg-espresso/5 text-left text-xs uppercase text-espresso/60"><tr>
        <th className="px-3 py-2">Ref</th><th className="px-3 py-2">Guest</th><th className="px-3 py-2">Room</th>
        <th className="px-3 py-2">In</th><th className="px-3 py-2">Out</th><th className="px-3 py-2">Total</th>
        <th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
      <tbody>{filtered.map((b) => (<tr key={b.reference} className="border-t border-espresso/5">
        <td className="px-3 py-2 font-mono text-xs">{b.reference}</td>
        <td className="px-3 py-2">{b.guest ? (<><div>{b.guest.first_name} {b.guest.last_name}</div>
          <div className="text-xs text-espresso/50">{b.guest.email}</div></>) : "—"}</td>
        <td className="px-3 py-2">{b.room_name}</td>
        <td className="px-3 py-2 text-xs">{b.check_in}</td>
        <td className="px-3 py-2 text-xs">{b.check_out}</td>
        <td className="px-3 py-2">${Number(b.total).toLocaleString()}</td>
        <td className="px-3 py-2 text-xs uppercase">{b.status}</td>
        <td className="px-3 py-2"><select disabled={busy === b.reference} value={b.status}
          onChange={(e) => change(b.reference, e.target.value)}
          className="rounded border border-espresso/20 bg-white px-2 py-1 text-xs">
          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}</select></td>
      </tr>))}</tbody></table>
      {filtered.length === 0 && (<p className="p-4 text-center text-sm text-espresso/50">No reservations match.</p>)}
    </div>
  </div>);
}
