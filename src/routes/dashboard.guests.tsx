import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { guests, reservations } from "@/lib/mock-ops";

export const Route = createFileRoute("/dashboard/guests")({
  component: GuestsView,
});

function GuestsView() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => {
    const withActivity = guests.map((g) => {
      const stays = reservations.filter((r) => r.guestId === g.id);
      const spend = stays.reduce((s, r) => s + r.total, 0);
      return { ...g, actualStays: stays.length, actualSpend: spend };
    });
    return withActivity
      .filter((g) =>
        q
          ? [g.firstName, g.lastName, g.email, g.country]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => b.actualSpend - a.actualSpend);
  }, [q]);

  const selected = selectedId ? guests.find((g) => g.id === selectedId) : null;
  const selectedStays = selected
    ? reservations.filter((r) => r.guestId === selected.id)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-xl">Guest profiles</h2>
            <p className="text-xs text-espresso/50">{list.length} guests</p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guests…"
            className="px-3 py-2 border border-espresso/20 bg-white text-sm w-64"
          />
        </div>
        <div className="bg-white border border-espresso/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-left text-[10px] uppercase tracking-widest text-espresso/50">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Stays</th>
                <th className="px-4 py-3">Lifetime spend</th>
                <th className="px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`border-t border-espresso/5 cursor-pointer hover:bg-cream/40 ${
                    selectedId === g.id ? "bg-cream/60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {g.firstName} {g.lastName}
                    </div>
                    <div className="text-xs text-espresso/50">{g.email}</div>
                  </td>
                  <td className="px-4 py-3">{g.country}</td>
                  <td className="px-4 py-3">{g.actualStays}</td>
                  <td className="px-4 py-3">${g.actualSpend.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {g.vip ? (
                      <span className="text-[10px] uppercase tracking-widest bg-gold/30 text-espresso px-2 py-1">
                        VIP
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-espresso/40">
                        Standard
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="bg-white border border-espresso/10 p-6 h-fit sticky top-6">
        {!selected ? (
          <div className="text-sm text-espresso/50 text-center py-8">
            Select a guest to view profile
          </div>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-widest text-espresso/40">Profile</div>
            <h3 className="font-serif text-2xl mt-1">
              {selected.firstName} {selected.lastName}
            </h3>
            <div className="mt-1 flex gap-2 text-xs">
              <span className="text-espresso/60">{selected.country}</span>
              {selected.vip && (
                <span className="text-[10px] uppercase tracking-widest bg-gold/30 text-espresso px-2 py-0.5">
                  VIP
                </span>
              )}
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone} />
              <Row
                label="Lifetime"
                value={`$${selected.lifetimeValue.toLocaleString()} · ${selected.stays} stays`}
              />
              {selected.notes && <Row label="Notes" value={selected.notes} />}
            </dl>
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-widest text-espresso/40 mb-2">
                Stay history
              </div>
              <ul className="text-xs divide-y divide-espresso/10">
                {selectedStays.length === 0 && (
                  <li className="py-2 text-espresso/40">No stays on record.</li>
                )}
                {selectedStays.slice(0, 8).map((r) => (
                  <li key={r.id} className="py-2 flex justify-between">
                    <span>
                      {r.checkIn} · {r.nights}n
                    </span>
                    <span className="text-espresso/60">${r.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-espresso/40">{label}</dt>
      <dd className="text-espresso">{value}</dd>
    </div>
  );
}