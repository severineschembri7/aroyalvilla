import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole, roleLabel } from "@/lib/permissions";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "Africa Royal Villa — Operations" }] }),
  component: SystemPage,
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

function SystemPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [reservations, setReservations] = useState<BookingRow[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!currentSession?.user) {
          navigate({ to: "/login" });
          return;
        }

        setSession(currentSession);

        // Get staff profile to verify role and access
        const { data: staffProfile, error: profileError } = await supabase
          .from("staff_profiles")
          .select("role, full_name")
          .eq("user_id", currentSession.user.id)
          .single();

        if (profileError || !staffProfile) {
          setMessage({
            type: "error",
            text: "Staff profile not found. Contact management.",
          });
          setLoading(false);
          return;
        }

        if (staffProfile.role) {
          const normalizedRole = normalizeRole(staffProfile.role);
          setRole(normalizedRole);
          setUserName(staffProfile.full_name || currentSession.user.email?.split("@")[0] || "Staff");
        }

        // Load reservations
        const { data: bookings } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false });

        if (bookings) {
          setReservations(bookings as BookingRow[]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "SIGNED_OUT") {
        navigate({ to: "/login" });
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  // Realtime subscription for bookings updates
  useEffect(() => {
    const channel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          // Insert
          if (payload.eventType === 'INSERT' && newRow) {
            setReservations((prev) => [newRow as BookingRow, ...prev]);
            return;
          }
          // Update
          if (payload.eventType === 'UPDATE' && newRow) {
            setReservations((prev) => prev.map((r) => (r.reference === newRow.reference ? (newRow as BookingRow) : r)));
            return;
          }
          // Delete
          if (payload.eventType === 'DELETE' && oldRow) {
            setReservations((prev) => prev.filter((r) => r.reference !== oldRow.reference));
            return;
          }
        },
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!session || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Access denied.</div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleApproveReservation = async (reference: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("reference", reference);

      if (error) throw error;

      setMessage({ type: "success", text: `Approved ${reference}` });

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (bookings) setReservations(bookings as BookingRow[]);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  const handleCheckIn = async (reference: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "checked_in", updated_at: new Date().toISOString() })
        .eq("reference", reference);

      if (error) throw error;

      setMessage({ type: "success", text: `Checked in` });

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (bookings) setReservations(bookings as BookingRow[]);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  const handleCheckOut = async (reference: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "checked_out", updated_at: new Date().toISOString() })
        .eq("reference", reference);

      if (error) throw error;

      setMessage({ type: "success", text: `Checked out` });

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (bookings) setReservations(bookings as BookingRow[]);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    checked_in: reservations.filter((r) => r.status === "checked_in").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Operations Console</h1>
              <p className="text-xs text-slate-500">Africa Royal Villa</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span>{userName}</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{roleLabel(role)}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-4 p-4 rounded border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 font-medium ${
              activeTab === "dashboard"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`px-4 py-2 font-medium ${
              activeTab === "reservations"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600"
            }`}
          >
            Reservations
          </button>
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded border border-slate-200">
                <div className="text-sm text-slate-600">Total Bookings</div>
                <div className="text-3xl font-bold mt-2">{stats.total}</div>
              </div>
              <div className="bg-white p-6 rounded border border-slate-200">
                <div className="text-sm text-slate-600">Pending Approval</div>
                <div className="text-3xl font-bold mt-2">{stats.pending}</div>
              </div>
              <div className="bg-white p-6 rounded border border-slate-200">
                <div className="text-sm text-slate-600">Checked In</div>
                <div className="text-3xl font-bold mt-2">{stats.checked_in}</div>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 p-6">
              <h3 className="font-semibold mb-4">Recent Reservations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2">Reference</th>
                      <th className="text-left py-2">Room</th>
                      <th className="text-left py-2">Check-in</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.slice(0, 5).map((r) => (
                      <tr key={r.reference} className="border-b">
                        <td className="py-2">{r.reference}</td>
                        <td className="py-2">{r.room_name}</td>
                        <td className="py-2">{r.check_in}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            r.status === "pending" ? "bg-yellow-100" :
                            r.status === "confirmed" ? "bg-blue-100" :
                            r.status === "checked_in" ? "bg-green-100" :
                            "bg-slate-100"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reservations */}
        {activeTab === "reservations" && (
          <div className="bg-white rounded border border-slate-200 p-6">
            <h3 className="font-semibold mb-4">All Reservations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-2">Ref</th>
                    <th className="text-left py-2 px-2">Room</th>
                    <th className="text-left py-2 px-2">Dates</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.reference} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium">{r.reference}</td>
                      <td className="py-2 px-2">{r.room_name}</td>
                      <td className="py-2 px-2 text-xs">{r.check_in} → {r.check_out}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          r.status === "pending" ? "bg-yellow-100" :
                          r.status === "confirmed" ? "bg-blue-100" :
                          r.status === "checked_in" ? "bg-green-100" :
                          "bg-slate-100"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 space-x-2">
                        {r.status === "pending" && (
                          <button
                            onClick={() => handleApproveReservation(r.reference)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                        )}
                        {r.status === "confirmed" && (
                          <button
                            onClick={() => handleCheckIn(r.reference)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Check In
                          </button>
                        )}
                        {r.status === "checked_in" && (
                          <button
                            onClick={() => handleCheckOut(r.reference)}
                            className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
