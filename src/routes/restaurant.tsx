import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRestaurantOrder, listReservations } from "@/lib/staff.functions";

export const Route = createFileRoute("/restaurant")({
  head: () => ({ meta: [{ title: "Restaurant — Operations" }] }),
  component: RestaurantPage,
});

type Reservation = { reference: string; guest_name?: string };

function RestaurantPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [bookingRef, setBookingRef] = useState("");
  const [guestName, setGuestName] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate({ to: "/login" });
        return;
      }

      try {
        const res = await listReservations();
        setReservations((res ?? []) as Reservation[]);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const submitOrder = async () => {
    setMessage(null);
    if (!bookingRef || !guestName || !itemsText || total <= 0) {
      setMessage("Provide booking, guest name, items and total");
      return;
    }

    try {
      await createRestaurantOrder({ bookingReference: bookingRef, guestName, items: itemsText.split(',').map(s => s.trim()), total, kind: 'restaurant' });
      setMessage('Order recorded');
      setBookingRef(''); setGuestName(''); setItemsText(''); setTotal(0);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to record order');
    }
  };

  if (loading) return <div className="p-6">Loading restaurant…</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h2 className="text-xl font-semibold mb-4">Restaurant & Bar Orders</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <h3 className="font-medium mb-2">New Order</h3>
          <select value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} className="w-full p-2 border rounded mb-2">
            <option value="">-- select booking --</option>
            {reservations.map((r) => (
              <option key={r.reference} value={r.reference}>{r.reference} — {r.guest_name}</option>
            ))}
          </select>
          <input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full p-2 border rounded mb-2" />
          <input placeholder="Items (comma separated)" value={itemsText} onChange={(e) => setItemsText(e.target.value)} className="w-full p-2 border rounded mb-2" />
          <input type="number" placeholder="Total" value={total} onChange={(e) => setTotal(Number(e.target.value))} className="w-full p-2 border rounded mb-2" />
          <div className="flex gap-2">
            <button onClick={submitOrder} className="px-3 py-2 bg-green-600 text-white rounded">Record Order</button>
            <button onClick={() => { setBookingRef(''); setGuestName(''); setItemsText(''); setTotal(0); }} className="px-3 py-2 bg-slate-200 rounded">Clear</button>
          </div>
          {message && <div className="mt-2 text-sm text-slate-600">{message}</div>}
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="font-medium mb-2">Open Bookings</h3>
          {reservations.length === 0 && <div className="text-slate-600">No bookings found.</div>}
          <ul className="divide-y">
            {reservations.map((r) => (
              <li key={r.reference} className="py-2 flex justify-between">
                <div>
                  <div className="font-semibold">{r.reference}</div>
                  <div className="text-xs text-slate-500">{r.guest_name}</div>
                </div>
                <div className="text-xs text-slate-400">--</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
