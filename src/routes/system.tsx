import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [{ title: "Reservation System — African Royal Villa" }],
  }),
  component: SystemDashboard,
});

type BookingRow = {
  reference: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number;
  created_at: string;
};

function SystemDashboard() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase.from("bookings").select("reference, room_name, check_in, check_out, guests, status, total, created_at").order("created_at", { ascending: false }).limit(20);
      if (!cancelled && !error) setBookings((data ?? []) as BookingRow[]);
      if (!cancelled) setLoading(false);
    };

    void load();

    const channel = supabase.channel("booking-live-feed").on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bookings" },
      (payload) => {
        setBookings((current) => [payload.new as BookingRow, ...current].slice(0, 20));
      },
    ).subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-terracotta">Reservation system</p>
              <h1 className="mt-2 font-serif text-3xl text-espresso">Front desk operations</h1>
              <p className="mt-2 text-sm text-espresso/60">
                Live website bookings stream into the same calendar view instantly.
              </p>
            </div>
            <div className="rounded-full bg-sage/20 px-4 py-2 text-sm font-medium text-espresso">
              Live sync enabled
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { label: "Occupancy", value: "82%" },
              { label: "Arrivals today", value: "6" },
              { label: "Departures", value: "3" },
              { label: "F&B revenue", value: "$4,280" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-espresso/10 bg-cream p-5">
                <div className="text-xs uppercase tracking-[0.3em] text-espresso/40">{item.label}</div>
                <div className="mt-2 font-serif text-3xl text-espresso">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-espresso/10 bg-cream p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-espresso/40">Today at a glance</p>
                  <h2 className="mt-2 font-serif text-2xl text-espresso">Live arrivals and departures</h2>
                </div>
                <div className="rounded-full bg-sage/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-espresso">
                  Live sync
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { title: "Arrival: ARV-8XK2P", detail: "Deluxe Room · 2 guests" },
                  { title: "Departure: ARV-4RQ9M", detail: "Garden Single · breakfast included" },
                  { title: "Website booking received", detail: "Family Room · instant update in the feed" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-espresso/10 bg-white px-4 py-3">
                    <div className="font-medium text-espresso">{item.title}</div>
                    <div className="mt-1 text-sm text-espresso/60">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-espresso/10 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-espresso/40">Operations</p>
              <h2 className="mt-2 font-serif text-2xl text-espresso">Housekeeping &amp; service board</h2>
              <div className="mt-6 space-y-3">
                {[
                  { title: "Room prep", detail: "Garden view · quiet room requested" },
                  { title: "Dining notes", detail: "Allergy flag synced from guest profile" },
                  { title: "Billing", detail: "Deposit pending for one arrival" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-espresso/10 bg-cream px-4 py-3">
                    <div className="font-medium text-espresso">{item.title}</div>
                    <div className="mt-1 text-sm text-espresso/60">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-espresso/10">
            <table className="min-w-full divide-y divide-espresso/10 text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-widest text-espresso/50">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso/10 bg-white">
                {loading ? (
                  <tr><td className="px-4 py-6 text-espresso/60" colSpan={6}>Loading reservations…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td className="px-4 py-6 text-espresso/60" colSpan={6}>No reservations yet.</td></tr>
                ) : bookings.map((booking) => (
                  <tr key={booking.reference} className="hover:bg-cream/70">
                    <td className="px-4 py-3 font-medium text-espresso">{booking.reference}</td>
                    <td className="px-4 py-3">{booking.room_name}</td>
                    <td className="px-4 py-3">{booking.check_in} → {booking.check_out}</td>
                    <td className="px-4 py-3">{booking.guests}</td>
                    <td className="px-4 py-3">{booking.status}</td>
                    <td className="px-4 py-3">${booking.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
