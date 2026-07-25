import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole } from "@/lib/permissions";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Operations" }] }),
  component: CalendarPage,
});

type Booking = {
  reference: string;
  room_name?: string;
  check_in: string;
  check_out: string;
  guests?: number;
  status?: string;
  guest_name?: string;
};

function CalendarPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate({ to: "/login" });
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("reference,room_name,check_in,check_out,guests,status,guest_name")
        .order("check_in", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setBookings((data ?? []) as Booking[]);
      setLoading(false);
    };

    init();
  }, [navigate]);

  if (loading) return <div className="p-6">Loading calendar…</div>;

  // Group by check_in date
  const groups: Record<string, Booking[]> = {};
  for (const b of bookings) {
    const date = b.check_in?.split("T")[0] ?? "unknown";
    if (!groups[date]) groups[date] = [];
    groups[date].push(b);
  }

  const dates = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h2 className="text-xl font-semibold mb-4">Calendar (Upcoming Check-ins)</h2>
      {dates.length === 0 && <div className="text-slate-600">No upcoming bookings.</div>}
      <div className="space-y-4">
        {dates.map((d) => (
          <div key={d} className="bg-white rounded border p-4">
            <div className="font-medium mb-2">{d}</div>
            <ul className="space-y-2">
              {groups[d].map((b) => (
                <li key={b.reference} className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{b.room_name ?? "—"} • {b.reference}</div>
                    <div className="text-xs text-slate-500">{b.guest_name ?? "Guest"} • {b.guests ?? 1} guests</div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs ${b.status === "pending" ? "bg-yellow-100" : b.status === "confirmed" ? "bg-blue-100" : b.status === "checked_in" ? "bg-green-100" : "bg-slate-100"}`}>
                      {b.status ?? "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
