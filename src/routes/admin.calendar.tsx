import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAllBookings } from "@/lib/admin.functions";
import { rooms } from "@/lib/rooms";

export const Route = createFileRoute("/admin/calendar")({ ssr: false, component: Calendar });
type Booking = Awaited<ReturnType<typeof listAllBookings>>[number];

const iso = (d: Date) => d.toISOString().slice(0, 10);
function days(n: number) { const out: Date[] = []; const s = new Date(); s.setHours(0,0,0,0);
  for (let i = 0; i < n; i++) { const d = new Date(s); d.setDate(d.getDate() + i); out.push(d); } return out; }

function Calendar() {
  const [rows, setRows] = useState<Booking[]>([]);
  useEffect(() => { let c = false;
    const load = async () => { const d = await listAllBookings(); if (!c) setRows(d as Booking[]); };
    void load(); const t = setInterval(load, 20000); return () => { c = true; clearInterval(t); }; }, []);
  const list = days(21);
  return (<div className="space-y-4">
    <div><h1 className="font-serif text-2xl">Room Calendar</h1>
      <p className="text-sm text-espresso/60">Next 21 days · one row per room category.</p></div>
    <div className="overflow-x-auto rounded-lg border border-espresso/10 bg-white"><table className="min-w-full text-xs">
      <thead className="bg-espresso/5 text-left text-espresso/60"><tr>
        <th className="sticky left-0 z-10 bg-espresso/5 px-3 py-2">Room</th>
        {list.map((d) => (<th key={iso(d)} className="px-1 py-2 text-center">
          <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
          <div className="font-semibold">{d.getDate()}</div></th>))}</tr></thead>
      <tbody>{rooms.map((room) => (<tr key={room.id} className="border-t border-espresso/5">
        <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">
          <div>{room.name}</div><div className="text-espresso/50">×{room.totalUnits}</div></td>
        {list.map((d) => { const day = iso(d);
          const booked = rows.filter((b) => b.room_id === room.id && b.status !== "cancelled" && b.check_in <= day && b.check_out > day).length;
          const load = booked / room.totalUnits;
          const bg = load === 0 ? "bg-cream" : load < 0.5 ? "bg-sage/40" : load < 1 ? "bg-gold/40" : "bg-terracotta/60";
          return (<td key={day} className={`px-1 py-2 text-center ${bg}`} title={`${booked}/${room.totalUnits}`}>{booked || ""}</td>);
        })}</tr>))}</tbody></table></div>
  </div>);
}
