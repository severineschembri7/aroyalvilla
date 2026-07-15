import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { rooms } from "@/lib/rooms";
import { daysWindow, reservations, todayISO } from "@/lib/mock-ops";

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarView,
});

function CalendarView() {
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState(14);
  const dates = daysWindow(days, offset);

  const units: { roomId: string; unit: number; label: string }[] = [];
  rooms.forEach((r) => {
    for (let u = 1; u <= r.totalUnits; u++) {
      units.push({ roomId: r.id, unit: u, label: `${r.name} #${u}` });
    }
  });

  const cellW = 44;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl">Room calendar</h2>
          <p className="text-xs text-espresso/50">
            {dates[0]} → {dates[dates.length - 1]} · {units.length} units
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setOffset(offset - 7)}
            className="px-3 py-2 border border-espresso/20 hover:bg-espresso hover:text-cream"
          >
            ← Prev week
          </button>
          <button
            onClick={() => setOffset(0)}
            className="px-3 py-2 border border-espresso/20 hover:bg-espresso hover:text-cream"
          >
            Today
          </button>
          <button
            onClick={() => setOffset(offset + 7)}
            className="px-3 py-2 border border-espresso/20 hover:bg-espresso hover:text-cream"
          >
            Next week →
          </button>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-espresso/20 bg-white"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-espresso/10 overflow-x-auto">
        <div style={{ minWidth: 220 + dates.length * cellW }}>
          <div className="flex border-b border-espresso/10 sticky top-0 bg-white z-10">
            <div className="w-[220px] shrink-0 px-4 py-2 text-[10px] uppercase tracking-widest text-espresso/40 border-r border-espresso/10">
              Unit
            </div>
            {dates.map((d) => {
              const dt = new Date(d);
              const isToday = d === todayISO;
              const dow = dt.toLocaleDateString("en-GB", { weekday: "short" });
              return (
                <div
                  key={d}
                  style={{ width: cellW }}
                  className={`shrink-0 text-center py-2 text-[10px] uppercase tracking-widest border-r border-espresso/5 ${
                    isToday ? "bg-terracotta/10 text-terracotta font-semibold" : "text-espresso/50"
                  }`}
                >
                  <div>{dow}</div>
                  <div className="font-serif text-sm text-espresso">{dt.getDate()}</div>
                </div>
              );
            })}
          </div>

          {units.map((u) => {
            const rowRes = reservations.filter(
              (r) => r.roomId === u.roomId && r.unit === u.unit && r.status !== "cancelled",
            );
            return (
              <div key={u.label} className="flex border-b border-espresso/5 relative">
                <div className="w-[220px] shrink-0 px-4 py-3 text-xs font-medium border-r border-espresso/10 bg-cream/40">
                  {u.label}
                </div>
                <div className="relative flex" style={{ width: dates.length * cellW }}>
                  {dates.map((d) => (
                    <div
                      key={d}
                      style={{ width: cellW }}
                      className={`h-12 border-r border-espresso/5 ${
                        d === todayISO ? "bg-terracotta/5" : ""
                      }`}
                    />
                  ))}
                  {rowRes.map((r) => {
                    const startIdx = dates.findIndex((d) => d >= r.checkIn);
                    const endIdx = dates.findIndex((d) => d >= r.checkOut);
                    if (startIdx === -1) return null;
                    const left = Math.max(0, startIdx) * cellW;
                    const rightIdx = endIdx === -1 ? dates.length : endIdx;
                    const width = Math.max(cellW * 0.5, (rightIdx - startIdx) * cellW - 4);
                    if (width <= 0) return null;
                    const color =
                      r.status === "in-house"
                        ? "bg-terracotta text-cream"
                        : r.status === "checked-out"
                          ? "bg-espresso/30 text-cream"
                          : "bg-sage text-espresso";
                    return (
                      <div
                        key={r.id}
                        title={`${r.guestName} · ${r.checkIn} → ${r.checkOut}`}
                        style={{ left: left + 2, width }}
                        className={`absolute top-1.5 h-9 rounded-sm px-2 text-[11px] leading-9 truncate ${color} shadow-sm`}
                      >
                        {r.guestName}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-espresso/60">
        <Legend color="bg-sage" label="Confirmed" />
        <Legend color="bg-terracotta" label="In-house" />
        <Legend color="bg-espresso/30" label="Checked out" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block w-4 h-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}