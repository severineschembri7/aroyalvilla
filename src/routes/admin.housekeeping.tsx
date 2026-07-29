import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAllBookings, listRoomStatuses, setRoomStatus } from "@/lib/admin.functions";
import { rooms } from "@/lib/rooms";

export const Route = createFileRoute("/admin/housekeeping")({ ssr: false, component: Housekeeping });
type Status = { room_id: string; state: string; notes: string | null };
type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];
const STATES = ["dirty","clean","inspected","out_of_order"] as const;
const COLORS: Record<string, string> = {
  dirty: "bg-terracotta/20 border-terracotta/40",
  clean: "bg-sage/30 border-sage/60",
  inspected: "bg-gold/30 border-gold/60",
  out_of_order: "bg-espresso/20 border-espresso/40",
};

function Housekeeping() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { const [s, b] = await Promise.all([listRoomStatuses(), listAllBookings()]);
    setStatuses(s as Status[]); setBookings(b as Booking[]); };
  useEffect(() => { void load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const today = new Date().toISOString().slice(0, 10);
  const change = async (roomId: string, state: (typeof STATES)[number]) => {
    setBusy(roomId); try { await setRoomStatus({ data: { roomId, state } }); await load(); } finally { setBusy(null); } };
  return (<div className="space-y-4">
    <div><h1 className="font-serif text-2xl">Housekeeping</h1>
      <p className="text-sm text-espresso/60">Tap a room to update its status for today.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => {
      const st = statuses.find((s) => s.room_id === room.id);
      const state = st?.state ?? "dirty";
      const departure = bookings.find((b) => b.room_id === room.id && b.check_out === today && b.status !== "cancelled");
      const arrival = bookings.find((b) => b.room_id === room.id && b.check_in === today && b.status !== "cancelled");
      return (<div key={room.id} className={`rounded-lg border-2 p-4 ${COLORS[state]}`}>
        <div className="flex items-baseline justify-between"><p className="font-serif text-lg">{room.name}</p>
          <span className="text-xs uppercase tracking-wide">{state.replace("_", " ")}</span></div>
        <p className="mt-1 text-xs text-espresso/60">×{room.totalUnits} units</p>
        {departure && (<p className="mt-2 text-xs">Departure: {departure.guest?.last_name ?? departure.reference}</p>)}
        {arrival && (<p className="text-xs">Arrival: {arrival.guest?.last_name ?? arrival.reference}</p>)}
        <div className="mt-3 grid grid-cols-2 gap-1">{STATES.map((s) => (
          <button key={s} disabled={busy === room.id} onClick={() => change(room.id, s)}
            className={`rounded px-2 py-1 text-xs ${state === s ? "bg-espresso text-cream" : "bg-white/70 text-espresso"}`}>
            {s.replace("_", " ")}</button>))}</div>
      </div>);
    })}</div>
  </div>);
}
