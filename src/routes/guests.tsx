import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentStaffSession, listReservations } from "@/lib/ops-store";

export const Route = createFileRoute("/guests")({
  head: () => ({ meta: [{ title: "Guests — Operations" }] }),
  component: GuestsPage,
});

type Guest = {
  id?: string;
  booking_reference?: string;
  guest_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
};

function GuestsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const session = getCurrentStaffSession();
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    const reservations = listReservations() as any[];
    setGuests(reservations.map((item) => ({
      id: item.reference,
      booking_reference: item.reference,
      guest_name: item.guest_name,
      email: item.email,
      phone: item.phone,
      created_at: item.created_at,
    })));
    setLoading(false);
  }, [navigate]);

  const filtered = guests.filter((g) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (g.guest_name ?? "").toLowerCase().includes(q) || (g.email ?? "").toLowerCase().includes(q) || (g.booking_reference ?? "").toLowerCase().includes(q);
  });

  if (loading) return <div className="p-6">Loading guests…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h2 className="text-xl font-semibold mb-4">Guest Directory</h2>
      <div className="mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or booking" className="w-full p-2 border rounded" />
      </div>
      <div className="bg-white rounded border p-4">
        {filtered.length === 0 && <div className="text-slate-600">No guests found.</div>}
        <ul className="divide-y">
          {filtered.map((g, idx) => (
            <li key={g.id ?? idx} className="py-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{g.guest_name ?? "Guest"} <span className="text-xs text-slate-500">{g.booking_reference ?? ""}</span></div>
                  <div className="text-xs text-slate-500">{g.email ?? ""} • {g.phone ?? ""}</div>
                </div>
                <div className="text-xs text-slate-400">{g.created_at ? new Date(g.created_at).toLocaleString() : ""}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
