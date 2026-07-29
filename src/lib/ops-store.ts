export type StaffRole = "front_desk" | "restaurant_bar" | "housekeeping" | "management";

export interface StaffProfileRecord {
  user_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  department: string;
  active: boolean;
  password?: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationRecord {
  reference: string;
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  rate_per_night: number;
  addons: string[];
  total: number;
  payment_method: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  reason: string;
  guest_name?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomStatusRecord {
  room_id: string;
  status: "available" | "occupied" | "dirty" | "maintenance";
  notes?: string;
  updated_by?: string;
  updated_at: string;
}

export interface BillingItemRecord {
  id: string;
  booking_reference: string;
  description: string;
  amount: number;
  kind: string;
  created_at: string;
}

export interface RestaurantOrderRecord {
  id: string;
  booking_reference: string;
  guest_name: string;
  items: string[];
  total: number;
  kind: "restaurant" | "bar";
  status: "open" | "preparing" | "ready" | "served" | "closed";
  created_at: string;
}

interface OpsStore {
  staffProfiles: StaffProfileRecord[];
  reservations: ReservationRecord[];
  roomStatuses: RoomStatusRecord[];
  billingItems: BillingItemRecord[];
  restaurantOrders: RestaurantOrderRecord[];
  currentSession: {
    userId: string;
    email: string;
    fullName: string;
    role: StaffRole;
  } | null;
}

const STORAGE_KEY = "aroyalvilla_ops_store_v1";

function buildDefaultStore(): OpsStore {
  return {
    staffProfiles: [],
    reservations: [],
    roomStatuses: [],
    billingItems: [],
    restaurantOrders: [],
    currentSession: null,
  };
}

export function hasStaffProfiles() {
  return readStore().staffProfiles.length > 0;
}

function readStore(): OpsStore {
  if (typeof window === "undefined") {
    return buildDefaultStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const store = buildDefaultStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return store;
    }

    const parsed = JSON.parse(raw) as Partial<OpsStore>;
    const base = buildDefaultStore();
    return {
      ...base,
      ...parsed,
      staffProfiles: parsed.staffProfiles?.length ? parsed.staffProfiles : base.staffProfiles,
      reservations: parsed.reservations?.length ? parsed.reservations : base.reservations,
      roomStatuses: parsed.roomStatuses?.length ? parsed.roomStatuses : base.roomStatuses,
      billingItems: parsed.billingItems?.length ? parsed.billingItems : base.billingItems,
      restaurantOrders: parsed.restaurantOrders?.length ? parsed.restaurantOrders : base.restaurantOrders,
      currentSession: parsed.currentSession ?? null,
    };
  } catch {
    const store = buildDefaultStore();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  }
}

function writeStore(store: OpsStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

export function signInStaff(email: string, password: string) {
  const store = readStore();
  const profile = store.staffProfiles.find((item) => item.email.toLowerCase() === email.toLowerCase().trim());

  if (!profile || !profile.active) {
    return { user: null, error: "Staff account not found or inactive." } as const;
  }

  if (profile.password !== password) {
    return { user: null, error: "Invalid password." } as const;
  }

  const session = {
    userId: profile.user_id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };

  store.currentSession = session;
  writeStore(store);

  return { user: profile, error: null } as const;
}

export function getCurrentStaffSession() {
  return readStore().currentSession;
}

export function signOutStaff() {
  const store = readStore();
  store.currentSession = null;
  writeStore(store);
}

export function createLocalStaffAccount(input: {
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
  department: string;
}) {
  const store = readStore();
  const now = new Date().toISOString();
  const profile: StaffProfileRecord = {
    user_id: `local-${Date.now()}`,
    email: input.email.toLowerCase().trim(),
    full_name: input.fullName.trim(),
    role: input.role,
    department: input.department.trim(),
    active: true,
    password: input.password,
    created_at: now,
    updated_at: now,
  };

  store.staffProfiles = [profile, ...store.staffProfiles.filter((item) => item.email.toLowerCase() !== profile.email.toLowerCase())];
  writeStore(store);
  return profile;
}

export function listStaffProfiles() {
  return readStore().staffProfiles.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listStaffUsers() {
  return listStaffProfiles().map((profile) => ({
    id: profile.user_id,
    email: profile.email,
    createdAt: profile.created_at,
    lastSignInAt: profile.updated_at,
    role: profile.role,
  }));
}

export function updateStaffRole(input: { id: string; role: StaffRole }) {
  const store = readStore();
  const profile = store.staffProfiles.find((item) => item.user_id === input.id);
  if (!profile) return null;

  profile.role = input.role;
  profile.updated_at = new Date().toISOString();

  if (store.currentSession?.userId === input.id) {
    store.currentSession = { ...store.currentSession, role: input.role };
  }

  writeStore(store);
  return profile;
}

export function listReservations() {
  return readStore().reservations.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function updateReservationStatus(input: { reference: string; status: ReservationRecord["status"]; reason?: string }) {
  const store = readStore();
  const reservation = store.reservations.find((item) => item.reference === input.reference);
  if (!reservation) return null;

  reservation.status = input.status;
  reservation.reason = input.reason ?? reservation.reason;
  reservation.updated_at = new Date().toISOString();
  writeStore(store);
  return reservation;
}

export function updateReservationDetails(input: {
  reference: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
}) {
  const store = readStore();
  const reservation = store.reservations.find((item) => item.reference === input.reference);
  if (!reservation) return null;

  reservation.room_name = input.roomName;
  reservation.check_in = input.checkIn;
  reservation.check_out = input.checkOut;
  reservation.guests = input.guests;
  reservation.total = input.total;
  reservation.updated_at = new Date().toISOString();
  writeStore(store);
  return reservation;
}

export function listRoomStatuses() {
  return readStore().roomStatuses.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function setRoomStatus(input: { roomId: string; status: RoomStatusRecord["status"] }) {
  const store = readStore();
  const existing = store.roomStatuses.find((item) => item.room_id === input.roomId);
  const next = {
    room_id: input.roomId,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.roomStatuses = [next, ...store.roomStatuses];
  }

  writeStore(store);
  return next;
}

export function createRestaurantOrder(input: {
  bookingReference: string;
  guestName: string;
  items: string[];
  total: number;
  kind: "restaurant" | "bar";
}) {
  const store = readStore();
  const now = new Date().toISOString();
  const order: RestaurantOrderRecord = {
    id: `order-${Date.now()}`,
    booking_reference: input.bookingReference,
    guest_name: input.guestName,
    items: input.items,
    total: input.total,
    kind: input.kind,
    status: "open",
    created_at: now,
  };

  store.restaurantOrders = [order, ...store.restaurantOrders];
  store.billingItems = [
    {
      id: `bill-${Date.now()}`,
      booking_reference: input.bookingReference,
      description: `${input.kind === "bar" ? "Bar" : "Restaurant"} order`,
      amount: input.total,
      kind: input.kind,
      created_at: now,
    },
    ...store.billingItems,
  ];
  writeStore(store);
  return order;
}

export function listBillingItems() {
  return readStore().billingItems.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function recordPayment(input: { bookingReference: string; amount: number }) {
  const store = readStore();
  const item: BillingItemRecord = {
    id: `pay-${Date.now()}`,
    booking_reference: input.bookingReference,
    description: "Payment received",
    amount: -Math.abs(input.amount),
    kind: "payment",
    created_at: new Date().toISOString(),
  };

  store.billingItems = [item, ...store.billingItems];
  writeStore(store);
  return item;
}

export function listRestaurantOrders() {
  return readStore().restaurantOrders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function updateRestaurantOrderStatus(input: { id: string; status: RestaurantOrderRecord["status"] }) {
  const store = readStore();
  const order = store.restaurantOrders.find((item) => item.id === input.id);
  if (!order) return null;

  order.status = input.status;
  writeStore(store);
  return order;
}

export function addBillingCharge(input: { bookingReference: string; description: string; amount: number; kind: string }) {
  const store = readStore();
  const item: BillingItemRecord = {
    id: `bill-${Date.now()}`,
    booking_reference: input.bookingReference,
    description: input.description.trim(),
    amount: Math.abs(input.amount),
    kind: input.kind.trim() || "charge",
    created_at: new Date().toISOString(),
  };

  store.billingItems = [item, ...store.billingItems];
  writeStore(store);
  return item;
}

export function updateRoomStatus(input: { roomId: string; status: RoomStatusRecord["status"]; notes?: string; updatedBy?: string }) {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.roomStatuses.find((item) => item.room_id === input.roomId);
  const next = {
    room_id: input.roomId.trim(),
    status: input.status,
    notes: input.notes?.trim(),
    updated_by: input.updatedBy,
    updated_at: now,
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    store.roomStatuses = [next, ...store.roomStatuses];
  }

  writeStore(store);
  return next;
}

export function setStaffActive(input: { id: string; active: boolean }) {
  const store = readStore();
  const profile = store.staffProfiles.find((item) => item.user_id === input.id);
  if (!profile) return null;

  profile.active = input.active;
  profile.updated_at = new Date().toISOString();
  if (!input.active && store.currentSession?.userId === input.id) {
    store.currentSession = null;
  }
  writeStore(store);
  return profile;
}
