import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createBookingServer } from "@/lib/bookings.functions";
import { hasPermission, navItemsForRole, normalizeRole, roleLabel } from "@/lib/permissions";
import {
  createStaffAccount,
  createRestaurantOrder,
  listBillingItems,
  listReservations,
  listRoomStatuses,
  listStaffProfiles,
  recordPayment,
  setRoomStatus,
  updateReservationDetails,
  updateReservationStatus,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "African Royal Villa — System" }] }),
  component: SystemDashboard,
});

type BookingRow = {
  reference: string;
  room_id?: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total: number;
  created_at: string;
  payment_method?: string;
  nights?: number;
  reason?: string;
};

type RoomStatusRow = {
  room_id: string;
  status: string;
  updated_at: string;
};

type StaffProfileRow = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
};

type BillingItemRow = {
  booking_reference: string;
  description: string;
  amount: number;
  kind: string;
  created_at: string;
};

type PageKey =
  | "dashboard"
  | "reservations"
  | "calendar"
  | "guests"
  | "reservations/new"
  | "restaurant"
  | "bar"
  | "billing"
  | "hr"
  | "staff/new";

type AuthMode = "signin" | "signup";

const pageTitle: Record<PageKey, string> = {
  dashboard: "Dashboard",
  reservations: "Reservations",
  calendar: "Calendar",
  guests: "Guests",
  "reservations/new": "New Reservation",
  restaurant: "Restaurant",
  bar: "Bar",
  billing: "Billing",
  hr: "HR",
  "staff/new": "Create Staff",
};

const allowedStaffRoles = (import.meta.env.VITE_APPROVED_STAFF_ROLES ?? "front_desk,management")
  .split(",")
  .map((role) => role.trim().toLowerCase())
  .filter(Boolean);

const approvedStaffEmails = (import.meta.env.VITE_APPROVED_STAFF_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function extractStaffRoles(user: Session["user"] | null | undefined) {
  if (!user) return [];
  const values = [
    user.user_metadata?.role,
    user.user_metadata?.roles,
    user.app_metadata?.role,
    user.app_metadata?.roles,
  ];
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase());
      return [String(value).toLowerCase()];
    })
    .filter(Boolean);
}

function isApprovedStaff(user: Session["user"] | null | undefined) {
  const roles = extractStaffRoles(user);
  const email = user?.email?.toLowerCase();
  return roles.some((role) => allowedStaffRoles.includes(role)) || Boolean(email && approvedStaffEmails.includes(email));
}

function getRole(user: Session["user"] | null | undefined) {
  const roles = extractStaffRoles(user);
  const normalized = roles.find((role) => normalizeRole(role));
  return normalized || "staff";
}

function SystemShell({
  children,
  activePage,
  setActivePage,
  role,
}: {
  children: ReactNode;
  activePage: PageKey;
  setActivePage: (page: PageKey) => void;
  role: string;
}) {
  const items = navItemsForRole(role);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">African Royal Villa</p>
            <h1 className="text-xl font-semibold text-slate-900">Operations Console</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key as PageKey)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${activePage === item.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function SystemDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomStatuses, setRoomStatuses] = useState<RoomStatusRow[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfileRow[]>([]);
  const [billingItems, setBillingItems] = useState<BillingItemRow[]>([]);
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; email: string | null; role: string }>>([]);
  const [staffUserLoading, setStaffUserLoading] = useState(false);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [reservationsFilter, setReservationsFilter] = useState("all");
  const [reservationSearch, setReservationSearch] = useState("");
  const [editingBooking, setEditingBooking] = useState<BookingRow | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [newReservationForm, setNewReservationForm] = useState({
    roomName: "Garden View",
    checkIn: "",
    checkOut: "",
    guests: "2",
    total: "250",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
  });
  const [staffForm, setStaffForm] = useState({ email: "", password: "", fullName: "", role: "front_desk", department: "Front Desk" });
  const [restaurantForm, setRestaurantForm] = useState({ bookingReference: "", guestName: "", item: "", total: "120", kind: "restaurant" as "restaurant" | "bar" });
  const [paymentForm, setPaymentForm] = useState({ bookingReference: "", amount: "100" });
  const [roomStatusForm, setRoomStatusForm] = useState({ roomId: "garden-view", status: "available" as "available" | "occupied" | "dirty" | "maintenance" });

  const role = getRole(session?.user);
  const roleDisplay = roleLabel(role);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && (hash as PageKey)) setActivePage(hash as PageKey);
  }, []);

  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]);

  useEffect(() => {
    let mounted = true;
    const initialiseSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
      setAccessAllowed(currentSession?.user ? isApprovedStaff(currentSession.user) : false);
      setAuthReady(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setAccessAllowed(currentSession?.user ? isApprovedStaff(currentSession.user) : false);
      setAuthReady(true);
    });

    void initialiseSession();
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    if (!isApprovedStaff(session.user)) return;

    const roleValue = getRole(session.user);
    void supabase.from("staff_profiles").upsert(
      {
        user_id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email || "Staff",
        email: session.user.email,
        role: roleValue,
        department: roleValue === "management" ? "Management" : "Operations",
        active: true,
      },
      { onConflict: "user_id" },
    );
  }, [authReady, session]);

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setAccessAllowed(false);
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!isApprovedStaff(session.user)) {
      setAccessAllowed(false);
      setBookings([]);
      setLoading(false);
      return;
    }

    setAccessAllowed(true);
    let cancelled = false;

    const load = async () => {
      const [reservations, roomRows, profileRows, billingRows] = await Promise.all([
        listReservations({}),
        listRoomStatuses({}),
        listStaffProfiles({}),
        listBillingItems({}),
      ]);
      if (!cancelled) {
        setBookings(reservations as BookingRow[]);
        setRoomStatuses(roomRows as RoomStatusRow[]);
        setStaffProfiles(profileRows as StaffProfileRow[]);
        setBillingItems(billingRows as BillingItemRow[]);
      }
      if (!cancelled) setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [authReady, session]);

  const loadStaffUsers = async () => {
    setStaffUserLoading(true);
    try {
      const users = await listStaffUsers({});
      setStaffUsers(users as Array<{ id: string; email: string | null; role: string }>);
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to load staff users");
    } finally {
      setStaffUserLoading(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
      if (error) throw error;
      setAuthMessage("Signed in successfully.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAccessAllowed(false);
    setAuthMessage("Signed out.");
  };

  const refreshData = async () => {
    setLoading(true);
    const [reservations, roomRows, profileRows, billingRows] = await Promise.all([
      listReservations({}),
      listRoomStatuses({}),
      listStaffProfiles({}),
      listBillingItems({}),
    ]);
    setBookings(reservations as BookingRow[]);
    setRoomStatuses(roomRows as RoomStatusRow[]);
    setStaffProfiles(profileRows as StaffProfileRow[]);
    setBillingItems(billingRows as BillingItemRow[]);
    setLoading(false);
  };

  const handleStatusChange = async (reference: string, status: string) => {
    setActivityMessage(null);
    try {
      await updateReservationStatus({ data: { reference, status: status as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled", reason: statusReason } });
      await refreshData();
      setActivityMessage(`Booking ${reference} moved to ${status}.`);
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Update failed");
    }
  };

  const handleCreateReservation = async (event: FormEvent) => {
    event.preventDefault();
    setActivityMessage(null);
    try {
      const booking = await createBookingServer({
        data: {
          roomId: newReservationForm.roomName.toLowerCase().replace(/\s+/g, "-"),
          roomName: newReservationForm.roomName,
          checkIn: newReservationForm.checkIn,
          checkOut: newReservationForm.checkOut,
          guests: Number(newReservationForm.guests),
          nights: Math.max(1, Math.round((new Date(newReservationForm.checkOut).getTime() - new Date(newReservationForm.checkIn).getTime()) / 86400000)),
          ratePerNight: Number(newReservationForm.total) / Math.max(1, Math.round((new Date(newReservationForm.checkOut).getTime() - new Date(newReservationForm.checkIn).getTime()) / 86400000)),
          addons: [],
          total: Number(newReservationForm.total),
          guest: {
            firstName: newReservationForm.guestName.split(" ")[0] || "Guest",
            lastName: newReservationForm.guestName.split(" ").slice(1).join(" ") || "Guest",
            email: newReservationForm.guestEmail || "guest@example.com",
            phone: newReservationForm.guestPhone || "0000000000",
            country: "",
            requests: "",
          },
          paymentMethod: "card",
          source: "front_desk",
        },
      });
      setActivityMessage(`Reservation created: ${booking.reference}`);
      await refreshData();
      setNewReservationForm({ roomName: "Garden View", checkIn: "", checkOut: "", guests: "2", total: "250", guestName: "", guestEmail: "", guestPhone: "" });
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to create reservation");
    }
  };

  const handleCreateStaff = async (event: FormEvent) => {
    event.preventDefault();
    setActivityMessage(null);
    try {
      await createStaffAccount({ data: { ...staffForm, role: staffForm.role as "front_desk" | "restaurant_bar" | "housekeeping" | "management" } });
      setActivityMessage(`Created staff account for ${staffForm.email}.`);
      setStaffForm({ email: "", password: "", fullName: "", role: "front_desk", department: "Front Desk" });
      await loadStaffUsers();
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to create staff account");
    }
  };

  const handleCreateOrder = async (event: FormEvent) => {
    event.preventDefault();
    setActivityMessage(null);
    try {
      await createRestaurantOrder({ data: { bookingReference: restaurantForm.bookingReference, guestName: restaurantForm.guestName, items: [restaurantForm.item], total: Number(restaurantForm.total), kind: restaurantForm.kind } });
      setActivityMessage("Order saved and charged to the folio.");
      await refreshData();
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to create order");
    }
  };

  const handleRecordPayment = async (event: FormEvent) => {
    event.preventDefault();
    setActivityMessage(null);
    try {
      await recordPayment({ data: { bookingReference: paymentForm.bookingReference, amount: Number(paymentForm.amount) } });
      setActivityMessage("Payment recorded.");
      await refreshData();
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to record payment");
    }
  };

  const handleSaveRoomStatus = async (event: FormEvent) => {
    event.preventDefault();
    setActivityMessage(null);
    try {
      await setRoomStatus({ data: { roomId: roomStatusForm.roomId, status: roomStatusForm.status } });
      await refreshData();
      setActivityMessage(`Room ${roomStatusForm.roomId} marked ${roomStatusForm.status}.`);
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to update room status");
    }
  };

  const handleSaveBookingEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingBooking) return;
    setActivityMessage(null);
    try {
      await updateReservationDetails({ data: { reference: editingBooking.reference, roomName: editingBooking.room_name, checkIn: editingBooking.check_in, checkOut: editingBooking.check_out, guests: editingBooking.guests, total: editingBooking.total } });
      await refreshData();
      setEditingBooking(null);
      setActivityMessage("Reservation updated.");
    } catch (error) {
      setActivityMessage(error instanceof Error ? error.message : "Unable to edit reservation");
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus = reservationsFilter === "all" ? true : booking.status === reservationsFilter;
      const matchesSearch = `${booking.reference} ${booking.room_name}`.toLowerCase().includes(reservationSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [bookings, reservationsFilter, reservationSearch]);

  const occupancy = Math.min(100, Math.round((bookings.filter((row) => row.status === "checked_in").length / Math.max(1, bookings.length)) * 100));

  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Initialising system…</div></div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Staff login</h1>
          <p className="mt-3 text-sm text-slate-600">Sign in to the reservation console with your staff account.</p>
          <form className="mt-6 space-y-4" onSubmit={handleAuthSubmit}>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Email</span>
              <input type="email" required value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Password</span>
              <input type="password" required value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </label>
            <button disabled={authLoading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{authLoading ? "Signing in…" : "Sign in"}</button>
          </form>
          {authMessage ? <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{authMessage}</p> : null}
        </div>
      </div>
    );
  }

  if (accessAllowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Access denied</h1>
          <p className="mt-3 text-sm text-slate-600">Your account is signed in but not yet approved for the staff system.</p>
          <button type="button" onClick={handleSignOut} className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <SystemShell activePage={activePage} setActivePage={setActivePage} role={role}>
      {activityMessage ? <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{activityMessage}</div> : null}
      {activePage === "dashboard" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Occupancy", value: `${occupancy}%` },
              { label: "Arrivals today", value: bookings.filter((item) => item.status === "confirmed").length.toString() },
              { label: "Checked in", value: bookings.filter((item) => item.status === "checked_in").length.toString() },
              { label: "F&B charges", value: `$${billingItems.reduce((sum, item) => sum + (item.amount > 0 ? item.amount : 0), 0).toFixed(0)}` },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Today at a glance</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Live operations summary</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">{roleDisplay}</div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold text-slate-900">Upcoming stays</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {bookings.slice(0, 4).map((booking) => (
                    <li key={booking.reference} className="flex justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                      <span>{booking.reference} · {booking.room_name}</span>
                      <span>{booking.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold text-slate-900">Room status</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {roomStatuses.slice(0, 4).map((room) => (
                    <li key={room.room_id} className="flex justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                      <span>{room.room_id}</span>
                      <span>{room.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activePage === "reservations" ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Reservations</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Live reservation list</h2>
              </div>
              <div className="flex gap-3">
                <input value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} placeholder="Search reservation" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                <select value={reservationsFilter} onChange={(event) => setReservationsFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked in</option>
                  <option value="checked_out">Checked out</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? <tr><td colSpan={6} className="px-4 py-6 text-slate-500">Loading reservations…</td></tr> : filteredBookings.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-slate-500">No reservations yet.</td></tr> : filteredBookings.map((booking) => (
                    <tr key={booking.reference} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{booking.reference}</td>
                      <td className="px-4 py-3">{booking.room_name}</td>
                      <td className="px-4 py-3">{booking.check_in} → {booking.check_out}</td>
                      <td className="px-4 py-3">{booking.guests}</td>
                      <td className="px-4 py-3">{booking.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {hasPermission(role, "approve_reservation") && booking.status === "pending" ? <button onClick={() => handleStatusChange(booking.reference, "confirmed")} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Approve</button> : null}
                          {hasPermission(role, "check_in") && booking.status === "confirmed" ? <button onClick={() => handleStatusChange(booking.reference, "checked_in")} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Check in</button> : null}
                          {hasPermission(role, "check_out") && booking.status === "checked_in" ? <button onClick={() => handleStatusChange(booking.reference, "checked_out")} className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white">Check out</button> : null}
                          {hasPermission(role, "edit_reservation") ? <button onClick={() => setEditingBooking(booking)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Edit</button> : null}
                          {hasPermission(role, "cancel_reservation") ? <button onClick={() => handleStatusChange(booking.reference, "cancelled")} className="rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-700">Cancel</button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {editingBooking ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Edit reservation</h3>
              <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSaveBookingEdit}>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Room</span>
                  <input value={editingBooking.room_name} onChange={(event) => setEditingBooking((current) => current ? { ...current, room_name: event.target.value } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guests</span>
                  <input type="number" value={editingBooking.guests} onChange={(event) => setEditingBooking((current) => current ? { ...current, guests: Number(event.target.value) } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Check in</span>
                  <input value={editingBooking.check_in} onChange={(event) => setEditingBooking((current) => current ? { ...current, check_in: event.target.value } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Check out</span>
                  <input value={editingBooking.check_out} onChange={(event) => setEditingBooking((current) => current ? { ...current, check_out: event.target.value } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Reason</span>
                  <textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
                </label>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save changes</button>
                  <button type="button" onClick={() => setEditingBooking(null)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      {activePage === "calendar" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Calendar</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Room availability view</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {bookings.slice(0, 6).map((booking) => (
              <div key={booking.reference} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{booking.room_name}</p>
                <p className="mt-1 text-sm text-slate-600">{booking.check_in} → {booking.check_out}</p>
                <p className="mt-1 text-sm text-slate-500">{booking.status}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activePage === "guests" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Guests</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Guest directory</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {staffProfiles.length === 0 ? <p className="text-sm text-slate-500">No guest profiles recorded.</p> : staffProfiles.map((profile) => (
              <div key={profile.user_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{profile.full_name}</p>
                <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
                <p className="mt-1 text-sm text-slate-500">{profile.role}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activePage === "reservations/new" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">New reservation</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Create a walk-in or phone booking</h2>
          <form onSubmit={handleCreateReservation} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Room</span>
              <input value={newReservationForm.roomName} onChange={(event) => setNewReservationForm((current) => ({ ...current, roomName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guests</span>
              <input type="number" value={newReservationForm.guests} onChange={(event) => setNewReservationForm((current) => ({ ...current, guests: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Check in</span>
              <input type="date" value={newReservationForm.checkIn} onChange={(event) => setNewReservationForm((current) => ({ ...current, checkIn: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Check out</span>
              <input type="date" value={newReservationForm.checkOut} onChange={(event) => setNewReservationForm((current) => ({ ...current, checkOut: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guest name</span>
              <input value={newReservationForm.guestName} onChange={(event) => setNewReservationForm((current) => ({ ...current, guestName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guest email</span>
              <input type="email" value={newReservationForm.guestEmail} onChange={(event) => setNewReservationForm((current) => ({ ...current, guestEmail: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guest phone</span>
              <input value={newReservationForm.guestPhone} onChange={(event) => setNewReservationForm((current) => ({ ...current, guestPhone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Total</span>
              <input type="number" value={newReservationForm.total} onChange={(event) => setNewReservationForm((current) => ({ ...current, total: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Create reservation</button>
            </div>
          </form>
        </div>
      ) : null}

      {activePage === "restaurant" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Restaurant</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Take a restaurant order</h2>
          <form onSubmit={handleCreateOrder} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Booking reference</span>
              <input value={restaurantForm.bookingReference} onChange={(event) => setRestaurantForm((current) => ({ ...current, bookingReference: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guest name</span>
              <input value={restaurantForm.guestName} onChange={(event) => setRestaurantForm((current) => ({ ...current, guestName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Item</span>
              <input value={restaurantForm.item} onChange={(event) => setRestaurantForm((current) => ({ ...current, item: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Total</span>
              <input type="number" value={restaurantForm.total} onChange={(event) => setRestaurantForm((current) => ({ ...current, total: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save order</button>
            </div>
          </form>
        </div>
      ) : null}

      {activePage === "bar" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Bar</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Take a bar order</h2>
          <form onSubmit={handleCreateOrder} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Booking reference</span>
              <input value={restaurantForm.bookingReference} onChange={(event) => setRestaurantForm((current) => ({ ...current, bookingReference: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Guest name</span>
              <input value={restaurantForm.guestName} onChange={(event) => setRestaurantForm((current) => ({ ...current, guestName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Item</span>
              <input value={restaurantForm.item} onChange={(event) => setRestaurantForm((current) => ({ ...current, item: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Total</span>
              <input type="number" value={restaurantForm.total} onChange={(event) => setRestaurantForm((current) => ({ ...current, total: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save bar order</button>
            </div>
          </form>
        </div>
      ) : null}

      {activePage === "billing" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Billing</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Guest folio</h2>
            </div>
            <button onClick={() => setActivePage("staff/new")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Create staff</button>
          </div>
          <form onSubmit={handleRecordPayment} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Booking reference</span>
              <input value={paymentForm.bookingReference} onChange={(event) => setPaymentForm((current) => ({ ...current, bookingReference: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Amount</span>
              <input type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Record payment</button>
            </div>
          </form>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Kind</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {billingItems.map((item) => <tr key={`${item.booking_reference}-${item.created_at}`}><td className="px-4 py-3">{item.booking_reference}</td><td className="px-4 py-3">{item.description}</td><td className="px-4 py-3">{item.amount}</td><td className="px-4 py-3">{item.kind}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activePage === "hr" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">HR</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Staff directory</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {staffProfiles.map((profile) => (
              <div key={profile.user_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{profile.full_name}</p>
                <p className="mt-1 text-sm text-slate-600">{profile.department}</p>
                <p className="mt-1 text-sm text-slate-500">{profile.role}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activePage === "staff/new" ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Staff registration</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Create a staff account</h2>
          <form onSubmit={handleCreateStaff} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Full name</span>
              <input value={staffForm.fullName} onChange={(event) => setStaffForm((current) => ({ ...current, fullName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Email</span>
              <input type="email" value={staffForm.email} onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Password</span>
              <input type="password" value={staffForm.password} onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Role</span>
              <select value={staffForm.role} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value, department: event.target.value === "restaurant_bar" ? "F&B" : event.target.value === "housekeeping" ? "Housekeeping" : event.target.value === "management" ? "Management" : "Front Desk" }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <option value="front_desk">Front Desk</option>
                <option value="restaurant_bar">Restaurant & Bar</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="management">Management</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-500">Department</span>
              <input value={staffForm.department} onChange={(event) => setStaffForm((current) => ({ ...current, department: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Create account</button>
            </div>
          </form>
        </div>
      ) : null}
    </SystemShell>
  );
}
