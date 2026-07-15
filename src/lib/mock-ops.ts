import { rooms, type RoomCategory } from "./rooms";

export type ReservationStatus = "confirmed" | "in-house" | "checked-out" | "cancelled";
export type Channel = "direct" | "booking.com" | "expedia" | "airbnb" | "agent";

export type Reservation = {
  id: string;
  reference: string;
  guestId: string;
  guestName: string;
  roomId: RoomCategory["id"];
  unit: number; // 1..totalUnits
  checkIn: string; // yyyy-mm-dd
  checkOut: string;
  guests: number;
  nights: number;
  ratePerNight: number;
  total: number;
  status: ReservationStatus;
  channel: Channel;
};

export type GuestProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  stays: number;
  lifetimeValue: number;
  vip: boolean;
  notes?: string;
};

export type HousekeepingTask = {
  id: string;
  roomId: RoomCategory["id"];
  unit: number;
  type: "checkout-clean" | "stayover" | "turndown" | "deep-clean" | "inspection";
  assignee: string;
  status: "pending" | "in-progress" | "done";
  priority: "high" | "normal";
  dueBy: string; // HH:mm
};

function seedRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const FIRST = ["Amara", "Jelani", "Zuri", "Kofi", "Nia", "Elena", "James", "Priya", "Marcus", "Sofia", "Leon", "Ines", "Tomas", "Ada", "Yves", "Naomi", "Ravi", "Cara"];
const LAST = ["Okafor", "Mensah", "Kimathi", "Rossi", "Nguyen", "Bergstrom", "Novak", "Adeyemi", "Chen", "Fischer", "Almeida", "Kowal", "Ibrahim", "Silva"];
const COUNTRIES = ["Tanzania", "Kenya", "UK", "USA", "Germany", "Italy", "France", "Netherlands", "Spain", "UAE"];
const CHANNELS: Channel[] = ["direct", "booking.com", "expedia", "airbnb", "agent"];

const rand = seedRand(20260715);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// Build guests
export const guests: GuestProfile[] = Array.from({ length: 36 }, (_, i) => {
  const first = pick(FIRST);
  const last = pick(LAST);
  const stays = 1 + Math.floor(rand() * 6);
  const ltv = stays * (200 + Math.floor(rand() * 500));
  return {
    id: `g-${i + 1}`,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    phone: `+255 7${Math.floor(10 + rand() * 89)} ${Math.floor(100 + rand() * 899)} ${Math.floor(100 + rand() * 899)}`,
    country: pick(COUNTRIES),
    stays,
    lifetimeValue: ltv,
    vip: rand() > 0.85,
    notes: rand() > 0.7 ? "Prefers late check-in. Allergic to nuts." : undefined,
  };
});

// Build reservations across a 30-day window centered on today
const today = new Date();
today.setHours(0, 0, 0, 0);

export const reservations: Reservation[] = (() => {
  const list: Reservation[] = [];
  let n = 0;
  for (let dayOffset = -10; dayOffset < 25; dayOffset++) {
    // 1-3 arrivals per day
    const arrivals = 1 + Math.floor(rand() * 3);
    for (let a = 0; a < arrivals; a++) {
      const room = rooms[Math.floor(rand() * rooms.length)];
      const unit = 1 + Math.floor(rand() * room.totalUnits);
      const nights = 1 + Math.floor(rand() * 5);
      const checkIn = addDays(today, dayOffset);
      const checkOut = addDays(checkIn, nights);
      const guest = guests[Math.floor(rand() * guests.length)];
      const rate = room.rate;
      const total = rate * nights;
      const status: ReservationStatus =
        checkOut < today
          ? "checked-out"
          : checkIn <= today && today < checkOut
            ? "in-house"
            : rand() > 0.94
              ? "cancelled"
              : "confirmed";
      list.push({
        id: `r-${++n}`,
        reference: `ARV-${(1000 + n).toString(36).toUpperCase()}`,
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        roomId: room.id,
        unit,
        checkIn: iso(checkIn),
        checkOut: iso(checkOut),
        guests: Math.min(room.capacity, 1 + Math.floor(rand() * room.capacity)),
        nights,
        ratePerNight: rate,
        total,
        status,
        channel: pick(CHANNELS),
      });
    }
  }
  return list;
})();

export function reservationsOn(dateISO: string) {
  return reservations.filter((r) => r.checkIn <= dateISO && dateISO < r.checkOut);
}
export function arrivalsOn(dateISO: string) {
  return reservations.filter((r) => r.checkIn === dateISO && r.status !== "cancelled");
}
export function departuresOn(dateISO: string) {
  return reservations.filter((r) => r.checkOut === dateISO && r.status !== "cancelled");
}

export const todayISO = iso(today);

export function daysWindow(days = 14, startOffset = 0): string[] {
  return Array.from({ length: days }, (_, i) => iso(addDays(today, startOffset + i)));
}

export function occupancy(dateISO: string): { occupied: number; total: number; pct: number } {
  const total = rooms.reduce((s, r) => s + r.totalUnits, 0);
  const occupied = reservationsOn(dateISO).filter((r) => r.status !== "cancelled").length;
  return { occupied, total, pct: Math.round((occupied / total) * 100) };
}

// Housekeeping tasks for today
export const housekeeping: HousekeepingTask[] = (() => {
  const inhouse = reservationsOn(todayISO).filter((r) => r.status !== "cancelled");
  const departures = departuresOn(todayISO);
  const staff = ["Grace", "Ester", "Neema", "Joyce", "Anna"];
  const list: HousekeepingTask[] = [];
  departures.forEach((r, i) =>
    list.push({
      id: `t-d-${i}`,
      roomId: r.roomId,
      unit: r.unit,
      type: "checkout-clean",
      assignee: staff[i % staff.length],
      status: rand() > 0.6 ? "done" : rand() > 0.5 ? "in-progress" : "pending",
      priority: "high",
      dueBy: "13:00",
    }),
  );
  inhouse.forEach((r, i) => {
    if (rand() > 0.4) {
      list.push({
        id: `t-s-${i}`,
        roomId: r.roomId,
        unit: r.unit,
        type: "stayover",
        assignee: staff[(i + 2) % staff.length],
        status: rand() > 0.5 ? "done" : "pending",
        priority: "normal",
        dueBy: "15:00",
      });
    }
    if (rand() > 0.75) {
      list.push({
        id: `t-t-${i}`,
        roomId: r.roomId,
        unit: r.unit,
        type: "turndown",
        assignee: staff[(i + 4) % staff.length],
        status: "pending",
        priority: "normal",
        dueBy: "19:30",
      });
    }
  });
  return list;
})();

// Reporting series — last 30 days ADR / occupancy / RevPAR
export function reportSeries() {
  const totalUnits = rooms.reduce((s, r) => s + r.totalUnits, 0);
  const days = 30;
  const arr: {
    date: string;
    occupancy: number;
    adr: number;
    revpar: number;
    revenue: number;
  }[] = [];
  for (let i = -days + 1; i <= 0; i++) {
    const d = iso(addDays(today, i));
    const active = reservationsOn(d).filter((r) => r.status !== "cancelled");
    const occ = active.length;
    const revenue = active.reduce((s, r) => s + r.ratePerNight, 0);
    const adr = occ > 0 ? Math.round(revenue / occ) : 0;
    const revpar = Math.round(revenue / totalUnits);
    arr.push({
      date: d,
      occupancy: Math.round((occ / totalUnits) * 100),
      adr,
      revpar,
      revenue,
    });
  }
  return arr;
}

export function channelMix() {
  const map: Record<string, { count: number; revenue: number }> = {};
  reservations
    .filter((r) => r.status !== "cancelled")
    .forEach((r) => {
      map[r.channel] ??= { count: 0, revenue: 0 };
      map[r.channel].count += 1;
      map[r.channel].revenue += r.total;
    });
  return Object.entries(map).map(([channel, v]) => ({ channel, ...v }));
}