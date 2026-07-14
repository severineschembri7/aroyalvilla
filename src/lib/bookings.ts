export type StoredBooking = {
  reference: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  ratePerNight: number;
  addons: string[];
  total: number;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    requests: string;
  };
  paymentMethod: "card" | "mobile";
  createdAt: string;
};

const KEY = "arv-bookings";

export function saveBooking(b: StoredBooking) {
  if (typeof window === "undefined") return;
  const list = readBookings();
  list.push(b);
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function readBookings(): StoredBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredBooking[]) : [];
  } catch {
    return [];
  }
}

export function findBooking(ref: string): StoredBooking | undefined {
  return readBookings().find((b) => b.reference === ref);
}

export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ARV-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}