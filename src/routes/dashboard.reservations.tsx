import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { reservations, type ReservationStatus } from "@/lib/mock-ops";
import { findRoom } from "@/lib/rooms";

export const Route = createFileRoute("/dashboard/reservations")({
  component: ReservationsView,
});

const statuses: (ReservationStatus | "all")[] = [
  "all",
  "confirmed",
  "in-house",
  "checked-out",
  "cancelled",
];

function ReservationsView() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReservationStatus | "all">("all");

  const list = useMemo(() => {
    return reservations
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) =>
        q
          ? [r.guestName, r.reference, r.roomId]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [q, status]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl">Reservations</h2>
          <p className="text-xs text-espresso/50">{list.length} bookings</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guest or ref…"
            className="px-3 py-2 border border-espresso/20 bg-white text-sm w-56"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReservationStatus | "all")}
            className="px-3 py-2 border border-espresso/20 bg-white text-sm capitalize"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-espresso/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/60 text-left text-[10px] uppercase tracking-widest text-espresso/50">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Nights</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-espresso/5 hover:bg-cream/40">
                <td className="px-4 py-3 font-mono text-xs">{r.reference}</td>
                <td className="px-4 py-3">{r.guestName}</td>
                <td className="px-4 py-3">
                  {findRoom(r.roomId)?.name} <span className="text-espresso/50">#{r.unit}</span>
                </td>
                <td className="px-4 py-3 text-xs text-espresso/70">
                  {r.checkIn} → {r.checkOut}
                </td>
                <td className="px-4 py-3">{r.nights}</td>
                <td className="px-4 py-3 capitalize text-xs">{r.channel}</td>
                <td className="px-4 py-3">${r.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-espresso/40 text-sm">
                  No reservations match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, string> = {
    confirmed: "bg-sage/50 text-espresso",
    "in-house": "bg-terracotta text-cream",
    "checked-out": "bg-espresso/20 text-espresso",
    cancelled: "bg-gold/30 text-espresso line-through",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-widest px-2 py-1 ${map[status]} whitespace-nowrap`}
    >
      {status.replace("-", " ")}
    </span>
  );
}