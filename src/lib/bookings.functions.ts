import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const refSchema = z.object({ ref: z.string().min(4).max(32) });
const lookupSchema = z.object({
  reference: z.string().min(4).max(32),
  email: z.string().email().max(200),
  phone: z.string().min(4).max(40),
});

// Public availability: only room_id, dates and non-cancelled status for future stays.
// No PII, no pricing, no reference. Safe for anonymous polling.
export const getRoomHolds = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date();
  today.setDate(today.getDate() - 1);
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("room_id, check_in, check_out, status")
    .gte("check_out", today.toISOString().slice(0, 10))
    .neq("status", "cancelled");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    room_id: r.room_id,
    check_in: r.check_in,
    check_out: r.check_out,
    status: r.status as string,
  }));
});

// Non-PII booking summary for the confirmation page. Requires the reference (bearer token).
export const getBookingSummary = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => refSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "reference, room_name, check_in, check_out, guests, nights, total, payment_method, status, updated_at",
      )
      .eq("reference", data.ref.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    return row;
  });

// Full lookup requires reference + email + phone. Runs on the server so PII never
// leaks through a public policy or a publicly-executable SECURITY DEFINER function.
export const lookupBookingFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = data.reference.trim().toUpperCase();
    const email = data.email.trim().toLowerCase();
    const phoneDigits = data.phone.replace(/\D/g, "");

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("reference", ref)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) return null;

    const { data: guest, error: gErr } = await supabaseAdmin
      .from("booking_guests")
      .select("*")
      .eq("reference", ref)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!guest) return null;

    const guestPhoneDigits = (guest.phone ?? "").replace(/\D/g, "");
    if (guest.email.toLowerCase() !== email || guestPhoneDigits !== phoneDigits) {
      return null;
    }

    return {
      reference: booking.reference,
      room_id: booking.room_id,
      room_name: booking.room_name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guests: booking.guests,
      nights: booking.nights,
      rate_per_night: Number(booking.rate_per_night),
      addons: booking.addons ?? [],
      total: Number(booking.total),
      payment_method: booking.payment_method,
      status: booking.status,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
    };
  });