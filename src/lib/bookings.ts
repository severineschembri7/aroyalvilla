import { supabase } from "@/integrations/supabase/client";
import { lookupBookingFn } from "./bookings.functions";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  requests: string;
};

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
  guest: GuestDetails;
  paymentMethod: "card" | "mobile";
  status: BookingStatus;
  createdAt: string;
};

export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ARV-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export type NewBookingInput = Omit<StoredBooking, "reference" | "status" | "createdAt"> & {
  reference?: string;
};

export async function createBooking(input: NewBookingInput): Promise<StoredBooking> {
  const reference = (input.reference ?? generateReference()).toUpperCase();

  const { error: bErr } = await supabase.from("bookings").insert({
    reference,
    room_id: input.roomId,
    room_name: input.roomName,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests: input.guests,
    nights: input.nights,
    rate_per_night: input.ratePerNight,
    addons: input.addons,
    total: input.total,
    payment_method: input.paymentMethod,
  });
  if (bErr) throw bErr;

  const { error: gErr } = await supabase.from("booking_guests").insert({
    reference,
    first_name: input.guest.firstName,
    last_name: input.guest.lastName,
    email: input.guest.email,
    phone: input.guest.phone,
    country: input.guest.country || null,
    requests: input.guest.requests || null,
  });
  if (gErr) throw gErr;

  return {
    ...input,
    reference,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function lookupBooking(
  reference: string,
  email: string,
  phone: string,
): Promise<StoredBooking | null> {
  const row = await lookupBookingFn({ data: { reference, email, phone } });
  if (!row) return null;
  return {
    reference: row.reference,
    roomId: row.room_id,
    roomName: row.room_name,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    nights: row.nights,
    ratePerNight: Number(row.rate_per_night),
    addons: row.addons ?? [],
    total: Number(row.total),
    paymentMethod: row.payment_method as "card" | "mobile",
    status: row.status as BookingStatus,
    createdAt: row.created_at,
    guest: {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      country: "",
      requests: "",
    },
  };
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
};