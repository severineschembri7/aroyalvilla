import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  addBillingCharge,
  createLocalStaffAccount,
  createRestaurantOrder,
  getCurrentStaffSession,
  hasStaffProfiles,
  listBillingItems,
  listReservations,
  listRestaurantOrders,
  listRoomStatuses,
  listStaffProfiles,
  signInStaff,
  signOutStaff,
  updateReservationStatus,
  updateRestaurantOrderStatus,
  updateRoomStatus,
  setStaffActive,
  updateStaffRole,
  type RestaurantOrderRecord,
  type RoomStatusRecord,
  type StaffProfileRecord,
  type StaffRole,
} from "@/lib/ops-store";
import { hasPermission, navItemsForRole, normalizeRole, roleLabel } from "@/lib/permissions";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "Africa Royal Villa — Operations" }] }),
  component: SystemPage,
});

type BookingRow = {
  reference: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  total: number;
  reason?: string;
  guest_name?: string;
  email?: string;
  phone?: string;
  created_at: string;
};

type BillingItem = { id: string; booking_reference: string; description: string; amount: number; kind: string; created_at: string };
type Session = { userId: string; email: string; fullName: string; role: StaffRole };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function SystemPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reservations, setReservations] = useState<BookingRow[]>([]);
  const [rooms, setRooms] = useState<RoomStatusRecord[]>([]);
  const [billing, setBilling] = useState<BillingItem[]>([]);
  const [orders, setOrders] = useState<RestaurantOrderRecord[]>([]);
  const [staff, setStaff] = useState<StaffProfileRecord[]>([]);
  const [initialStaff, setInitialStaff] = useState({ fullName: "", email: "", password: "", department: "Management" });
  const [roomForm, setRoomForm] = useState({ roomId: "", status: "available" as RoomStatusRecord["status"], notes: "" });
  const [orderForm, setOrderForm] = useState({ bookingReference: "", guestName: "", kind: "restaurant" as "restaurant" | "bar", items: "", total: 0 });
  const [chargeForm, setChargeForm] = useState({ bookingReference: "", description: "", amount: 0, kind: "service" });

  const refresh = () => {
    setReservations(listReservations() as BookingRow[]);
    setRooms(listRoomStatuses());
    setBilling(listBillingItems() as BillingItem[]);
    setOrders(listRestaurantOrders());
    setStaff(listStaffProfiles());
  };

  useEffect(() => {
    const currentSession = getCurrentStaffSession();
    if (!currentSession) {
      setLoading(false);
      return;
    }
    setSession(currentSession);
    refresh();
    setLoading(false);
  }, []);

  const role = normalizeRole(session?.role);
  const firstRun = !session && !hasStaffProfiles();
  const navItems = navItemsForRole(role);
  const stats = useMemo(() => ({
    arrivals: reservations.filter((r) => r.status === "confirmed").length,
    pending: reservations.filter((r) => r.status === "pending").length,
    inHouse: reservations.filter((r) => r.status === "checked_in").length,
    roomsReady: rooms.filter((r) => r.status === "available").length,
    openOrders: orders.filter((o) => !["served", "closed"].includes(o.status)).length,
    openBalance: billing.reduce((sum, item) => sum + item.amount, 0),
  }), [billing, orders, reservations, rooms]);

  if (loading) return <PageCenter>Loading operations workspace…</PageCenter>;

  if (firstRun) {
    return (
      <AuthPanel title="Initialize Staff Operations" subtitle="Create the first management account for this property. No sample accounts or dummy hotel data are installed.">
        <input className="field" placeholder="Full name" value={initialStaff.fullName} onChange={(e) => setInitialStaff({ ...initialStaff, fullName: e.target.value })} />
        <input className="field" type="email" placeholder="Work email" value={initialStaff.email} onChange={(e) => setInitialStaff({ ...initialStaff, email: e.target.value })} />
        <input className="field" type="password" placeholder="Temporary password" value={initialStaff.password} onChange={(e) => setInitialStaff({ ...initialStaff, password: e.target.value })} />
        <button className="primary" onClick={() => {
          if (!initialStaff.fullName || !initialStaff.email || initialStaff.password.length < 8) return setMessage({ type: "error", text: "Enter a name, email, and password of at least 8 characters." });
          const profile = createLocalStaffAccount({ ...initialStaff, role: "management" });
          signInStaff(profile.email, initialStaff.password);
          setSession({ userId: profile.user_id, email: profile.email, fullName: profile.full_name, role: profile.role });
          refresh();
        }}>Create management account</button>
        {message && <Notice {...message} />}
      </AuthPanel>
    );
  }

  if (!session || !role) {
    navigate({ to: "/login" });
    return <PageCenter>Redirecting to staff login…</PageCenter>;
  }

  const statusAction = (reference: string, status: BookingRow["status"], text: string) => {
    const updated = updateReservationStatus({ reference, status });
    if (!updated) return setMessage({ type: "error", text: "Unable to update reservation." });
    refresh();
    setMessage({ type: "success", text });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div><h1 className="text-lg font-semibold">Africa Royal Villa Operations</h1><p className="text-xs text-slate-500">Reservation, rooms, folio, F&B, staff command center</p></div>
          <div className="flex items-center gap-3 text-sm"><span>{session.fullName}</span><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{roleLabel(role)}</span><button onClick={() => { signOutStaff(); navigate({ to: "/login" }); }} className="text-slate-600 hover:text-slate-900">Sign Out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {message && <Notice {...message} />}
        <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {navItems.map((item) => <button key={item.key} onClick={() => setActiveTab(item.key)} className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === item.key ? "bg-slate-950 text-white" : "bg-white text-slate-700"}`}>{item.label}</button>)}
        </nav>

        {activeTab === "dashboard" && <Section title="Daily Control Board"><div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"><Kpi label="Arrivals" value={stats.arrivals} /><Kpi label="Pending" value={stats.pending} /><Kpi label="In house" value={stats.inHouse} /><Kpi label="Rooms ready" value={stats.roomsReady} /><Kpi label="Open F&B" value={stats.openOrders} /><Kpi label="Open balance" value={money.format(stats.openBalance)} /></div><EmptyAware show={!reservations.length && !rooms.length} text="Live hotel records will appear here as reservations and room statuses are created." /></Section>}

        {activeTab === "reservations" && hasPermission(role, "view_reservations") && <Section title="Reservations"><Table headers={["Ref", "Guest", "Room", "Stay", "Status", "Total", "Actions"]}>{reservations.map((r) => <tr key={r.reference} className="border-b"><td className="p-2 font-medium">{r.reference}</td><td className="p-2">{r.guest_name || "—"}<div className="text-xs text-slate-500">{r.email || ""} {r.phone || ""}</div></td><td className="p-2">{r.room_name}</td><td className="p-2 text-xs">{r.check_in} → {r.check_out}</td><td className="p-2"><Status>{r.status}</Status></td><td className="p-2 text-right">{money.format(r.total || 0)}</td><td className="space-x-2 p-2">{r.status === "pending" && hasPermission(role, "approve_reservation") && <Small onClick={() => statusAction(r.reference, "confirmed", `Approved ${r.reference}`)}>Approve</Small>}{r.status === "confirmed" && hasPermission(role, "check_in") && <Small onClick={() => statusAction(r.reference, "checked_in", `Checked in ${r.reference}`)}>Check in</Small>}{r.status === "checked_in" && hasPermission(role, "check_out") && <Small onClick={() => statusAction(r.reference, "checked_out", `Checked out ${r.reference}`)}>Check out</Small>}</td></tr>)}</Table><EmptyAware show={!reservations.length} text="No reservations are currently available from the connected reservation records." /></Section>}

        {activeTab === "calendar" && <Section title="Arrival & Stay Calendar"><div className="grid gap-3">{reservations.map((r) => <div key={r.reference} className="rounded border bg-white p-4"><div className="font-semibold">{r.check_in} arrival • {r.room_name}</div><div className="text-sm text-slate-600">{r.reference} • {r.guest_name || "Guest"} • departs {r.check_out}</div></div>)}</div><EmptyAware show={!reservations.length} text="No dated reservations to schedule." /></Section>}

        {activeTab === "guests" && <Section title="Guest Profiles"><Table headers={["Guest", "Contact", "Booking", "Status"]}>{reservations.map((r) => <tr key={r.reference} className="border-b"><td className="p-2 font-medium">{r.guest_name || "—"}</td><td className="p-2 text-sm">{r.email || "—"}<div className="text-xs text-slate-500">{r.phone || ""}</div></td><td className="p-2">{r.reference}</td><td className="p-2"><Status>{r.status}</Status></td></tr>)}</Table><EmptyAware show={!reservations.length} text="Guest profiles populate from reservation records." /></Section>}

        {activeTab === "restaurant" && hasPermission(role, "take_orders") && <Section title="Restaurant & Bar POS"><FormGrid><select className="field" value={orderForm.bookingReference} onChange={(e) => { const selected = reservations.find((r) => r.reference === e.target.value); setOrderForm({ ...orderForm, bookingReference: e.target.value, guestName: selected?.guest_name || orderForm.guestName }); }}><option value="">Select in-house booking</option>{reservations.filter((r) => r.status === "checked_in" || r.status === "confirmed").map((r) => <option key={r.reference} value={r.reference}>{r.reference} — {r.guest_name || "Guest"}</option>)}</select><input className="field" placeholder="Guest name" value={orderForm.guestName} onChange={(e) => setOrderForm({ ...orderForm, guestName: e.target.value })} /><select className="field" value={orderForm.kind} onChange={(e) => setOrderForm({ ...orderForm, kind: e.target.value as "restaurant" | "bar" })}><option value="restaurant">Restaurant</option><option value="bar">Bar</option></select><input className="field" placeholder="Items separated by commas" value={orderForm.items} onChange={(e) => setOrderForm({ ...orderForm, items: e.target.value })} /><input className="field" type="number" placeholder="Total" value={orderForm.total} onChange={(e) => setOrderForm({ ...orderForm, total: Number(e.target.value) })} /><button className="primary" onClick={() => { if (!orderForm.bookingReference || !orderForm.guestName || !orderForm.items || orderForm.total <= 0) return setMessage({ type: "error", text: "Complete the order before posting." }); createRestaurantOrder({ ...orderForm, items: orderForm.items.split(",").map((item) => item.trim()).filter(Boolean) }); setOrderForm({ bookingReference: "", guestName: "", kind: "restaurant", items: "", total: 0 }); refresh(); setMessage({ type: "success", text: "Order posted to guest folio." }); }}>Post order</button></FormGrid><Table headers={["Order", "Guest", "Items", "Status", "Total", "Action"]}>{orders.map((o) => <tr key={o.id} className="border-b"><td className="p-2">{o.kind}</td><td className="p-2">{o.guest_name}<div className="text-xs text-slate-500">{o.booking_reference}</div></td><td className="p-2 text-sm">{o.items.join(", ")}</td><td className="p-2"><Status>{o.status}</Status></td><td className="p-2 text-right">{money.format(o.total)}</td><td className="p-2"><select className="field" value={o.status} onChange={(e) => { updateRestaurantOrderStatus({ id: o.id, status: e.target.value as RestaurantOrderRecord["status"] }); refresh(); }}><option value="open">Open</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="served">Served</option><option value="closed">Closed</option></select></td></tr>)}</Table></Section>}

        {activeTab === "billing" && hasPermission(role, "view_billing") && <Section title="Folios & Billing"><FormGrid><input className="field" placeholder="Booking reference" value={chargeForm.bookingReference} onChange={(e) => setChargeForm({ ...chargeForm, bookingReference: e.target.value })} /><input className="field" placeholder="Description" value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} /><input className="field" placeholder="Kind" value={chargeForm.kind} onChange={(e) => setChargeForm({ ...chargeForm, kind: e.target.value })} /><input className="field" type="number" placeholder="Amount" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: Number(e.target.value) })} /><button className="primary" onClick={() => { if (!chargeForm.bookingReference || !chargeForm.description || chargeForm.amount <= 0) return setMessage({ type: "error", text: "Complete charge details." }); addBillingCharge(chargeForm); setChargeForm({ bookingReference: "", description: "", amount: 0, kind: "service" }); refresh(); setMessage({ type: "success", text: "Charge posted." }); }}>Post charge</button></FormGrid><Table headers={["Booking", "Description", "Kind", "Amount", "Date"]}>{billing.map((b) => <tr key={b.id} className="border-b"><td className="p-2 font-medium">{b.booking_reference}</td><td className="p-2">{b.description}</td><td className="p-2">{b.kind}</td><td className="p-2 text-right">{money.format(b.amount)}</td><td className="p-2 text-xs">{new Date(b.created_at).toLocaleString()}</td></tr>)}</Table><EmptyAware show={!billing.length} text="No folio activity has been posted." /></Section>}

        {activeTab === "hr" && hasPermission(role, "view_hr") && <Section title="Staff Administration"><Table headers={["Name", "Email", "Role", "Department", "Active"]}>{staff.map((s) => <tr key={s.user_id} className="border-b"><td className="p-2 font-medium">{s.full_name}</td><td className="p-2">{s.email}</td><td className="p-2"><select className="field" value={s.role} onChange={(e) => { updateStaffRole({ id: s.user_id, role: e.target.value as StaffRole }); refresh(); }}><option value="front_desk">Front Desk</option><option value="restaurant_bar">Restaurant & Bar</option><option value="housekeeping">Housekeeping</option><option value="management">Management</option></select></td><td className="p-2">{s.department}</td><td className="p-2"><button className="rounded bg-slate-200 px-3 py-1 text-xs" onClick={() => { setStaffActive({ id: s.user_id, active: !s.active }); refresh(); }}>{s.active ? "Active" : "Inactive"}</button></td></tr>)}</Table></Section>}

        {activeTab === "staff/new" && hasPermission(role, "manage_staff") && <StaffCreate onDone={() => { refresh(); setActiveTab("hr"); }} />}

        {(activeTab === "bar" || activeTab === "reservations/new") && <Section title="Module"><p className="text-sm text-slate-600">Use Restaurant for bar orders and the public booking flow for new guest reservations. This console is wired for live operational records, not sample data.</p></Section>}

        {hasPermission(role, "update_room_status") && <Section title="Housekeeping Room Board"><FormGrid><input className="field" placeholder="Room identifier or name" value={roomForm.roomId} onChange={(e) => setRoomForm({ ...roomForm, roomId: e.target.value })} /><select className="field" value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatusRecord["status"] })}><option value="available">Available / inspected</option><option value="occupied">Occupied</option><option value="dirty">Dirty</option><option value="maintenance">Maintenance</option></select><input className="field" placeholder="Notes" value={roomForm.notes} onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })} /><button className="primary" onClick={() => { if (!roomForm.roomId) return setMessage({ type: "error", text: "Enter a room identifier." }); updateRoomStatus({ ...roomForm, updatedBy: session.userId }); setRoomForm({ roomId: "", status: "available", notes: "" }); refresh(); }}>Update room</button></FormGrid><Table headers={["Room", "Status", "Notes", "Updated"]}>{rooms.map((r) => <tr key={r.room_id} className="border-b"><td className="p-2 font-medium">{r.room_id}</td><td className="p-2"><Status>{r.status}</Status></td><td className="p-2">{r.notes || "—"}</td><td className="p-2 text-xs">{new Date(r.updated_at).toLocaleString()}</td></tr>)}</Table></Section>}
      </main>
    </div>
  );
}

function StaffCreate({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "front_desk" as StaffRole, department: "" });
  return <Section title="Create Staff Account"><FormGrid><input className="field" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /><input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input className="field" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><input className="field" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /><select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}><option value="front_desk">Front Desk</option><option value="restaurant_bar">Restaurant & Bar</option><option value="housekeeping">Housekeeping</option><option value="management">Management</option></select><button className="primary" onClick={() => { createLocalStaffAccount(form); onDone(); }}>Create account</button></FormGrid></Section>;
}
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>; }
function Kpi({ label, value }: { label: string; value: ReactNode }) { return <div className="rounded-xl border bg-slate-50 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{headers.map((h) => <th key={h} className="p-2 text-left font-semibold">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Status({ children }: { children: ReactNode }) { return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">{String(children).replaceAll("_", " ")}</span>; }
function Small(props: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} className="rounded bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-700" />; }
function FormGrid({ children }: { children: ReactNode }) { return <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">{children}</div>; }
function Notice({ type, text }: { type: "success" | "error"; text: string }) { return <div className={`mb-4 rounded border p-3 text-sm ${type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{text}</div>; }
function EmptyAware({ show, text }: { show: boolean; text: string }) { return show ? <div className="rounded border border-dashed bg-slate-50 p-6 text-sm text-slate-600">{text}</div> : null; }
function PageCenter({ children }: { children: ReactNode }) { return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">{children}</div>; }
function AuthPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4"><div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl"><p className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-500">Africa Royal Villa</p><h1 className="text-2xl font-bold">{title}</h1><p className="mb-6 mt-2 text-sm text-slate-600">{subtitle}</p><div className="space-y-3">{children}</div></div></div>; }
