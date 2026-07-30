import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const refSchema = z.object({ ref: z.string().min(4).max(32) });
const lookupSchema = z.object({
  reference: z.string().min(4).max(32),
  email: z.string().email().max(200),
  phone: z.string().min(4).max(40),
});
const createBookingSchema = z.object({
  roomId: z.string().min(1),
  roomName: z.string().min(1),
  checkIn: z.string().min(4),
  checkOut: z.string().min(4),
  guests: z.number().int().positive(),
  nights: z.number().int().positive(),
  ratePerNight: z.number().nonnegative(),
  addons: z.array(z.string()).default([]),
  total: z.number().nonnegative(),
  guest: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(4),
    country: z.string().optional().default(""),
    requests: z.string().optional().default(""),
  }),
  paymentMethod: z.enum(["card", "mobile"]),
  source: z.enum(["website", "front_desk"]).default("website"),
  reference: z.string().optional(),
});
const statusUpdateSchema = z.object({
  reference: z.string().min(4).max(32),
  status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
});

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ARV-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.toUpperCase();
}

function buildConfirmationPayload(reference: string, booking: Record<string, unknown>) {
  return {
    reference,
    room: booking.room_name,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    guests: booking.guests,
    total: booking.total,
  };
}

// Stubbed email sender. Logs a fully-rendered email preview to the server
// console so bookings and status changes can be observed end-to-end without
// real provider credentials. Swap this for a real transport later.
function logEmailStub(
  kind: "booking_confirmation" | "status_change",
  to: string,
  subject: string,
  body: string,
) {
  const divider = "=".repeat(60);
  // eslint-disable-next-line no-console
  console.log(
    `\n${divider}\n[email:stub] ${kind}\nTo: ${to}\nFrom: African Royal Villa <hello@aroyalvilla.com>\nSubject: ${subject}\n\n${body}\n${divider}\n`,
  );
}

function statusChangeCopy(status: string, reference: string, roomName: string) {
  switch (status) {
    case "confirmed":
      return `Great news — your reservation ${reference} for ${roomName} is now CONFIRMED. We look forward to welcoming you to African Royal Villa.`;
    case "checked_in":
      return `Welcome! Your stay for ${reference} (${roomName}) is now checked in. Karibu sana.`;
    case "checked_out":
      return `Thank you for staying with African Royal Villa. Your reservation ${reference} is checked out. We would love to host you again.`;
    case "cancelled":
      return `Your reservation ${reference} (${roomName}) has been cancelled. If this was unexpected, please reply to this email or WhatsApp us on +255 768 777 428.`;
    default:
      return `Your reservation ${reference} (${roomName}) status was updated to: ${status}.`;
  }
}

async function triggerConfirmation(reference: string, booking: Record<string, unknown>) {
  const payload = buildConfirmationPayload(reference, booking);
  const guestEmail = (booking.guest_email as string) ?? "guest@example.com";
  const roomName = (booking.room_name as string) ?? "your room";
  const checkIn = booking.check_in;
  const checkOut = booking.check_out;
  const total = booking.total;
  logEmailStub(
    "booking_confirmation",
    guestEmail,
    `Booking received: ${reference}`,
    [
      `Asante for booking with African Royal Villa & Campsite.`,
      ``,
      `Reference: ${reference}`,
      `Room:      ${roomName}`,
      `Check-in:  ${checkIn}`,
      `Check-out: ${checkOut}`,
      `Total:     $${total}`,
      ``,
      `Your reservation is currently PENDING and will be confirmed by our`,
      `front desk shortly. Reply to this email or WhatsApp +255 768 777 428`,
      `for anything at all.`,
    ].join("\n"),
  );

  const resendKey = process.env.RESEND_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "African Royal Villa <hello@aroyalvilla.com>",
          to: [booking.guest_email ?? "hello@aroyalvilla.com"],
          subject: `Booking confirmed: ${reference}`,
          html: `<p>Your stay at African Royal Villa is confirmed.</p><p>Reference: ${reference}</p>`,
        }),
      });
    } catch {
      // swallow and leave confirmation state to manual follow-up if provider is not configured.
    }
  }

  if (twilioSid && twilioToken && twilioNumber) {
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioNumber,
          To: `whatsapp:${booking.guest_phone ?? ""}`,
          Body: `Your reservation ${reference} is confirmed at African Royal Villa.`,
        }),
      });
    } catch {
      // swallow in local/dev without credentials
    }
  }

  return payload;
}

// Dashboard/back-office status transitions. Updates the booking row and
// emits a stubbed status-change email so the guest is kept in the loop.
export const updateBookingStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => statusUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = data.reference.toUpperCase();
    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("reference", reference)
      .select("reference, room_name, check_in, check_out, status")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Booking not found");

    const { data: guest } = await supabaseAdmin
      .from("booking_guests")
      .select("first_name, email")
      .eq("reference", reference)
      .maybeSingle();

    const to = guest?.email ?? "guest@example.com";
    const greeting = guest?.first_name ? `Hi ${guest.first_name},` : "Hello,";
    logEmailStub(
      "status_change",
      to,
      `Booking ${reference}: ${data.status.replace("_", " ")}`,
      [greeting, "", statusChangeCopy(data.status, reference, updated.room_name)].join("\n"),
    );

    return { reference, status: updated.status };
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
  .validator((data: unknown) => refSchema.parse(data))
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

// Shared booking creation. This is the only path that can create a booking in the system.
export const createBookingServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => createBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = (data.reference ?? generateReference()).toUpperCase();
    const checkIn = data.checkIn.slice(0, 10);
    const checkOut = data.checkOut.slice(0, 10);

    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from("bookings")
      .select("reference")
      .eq("room_id", data.roomId)
      .neq("status", "cancelled")
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    if (conflictError) throw conflictError;
    if ((conflicts ?? []).length > 0) {
      throw new Error("This room is no longer available for the selected dates.");
    }

    const bookingPayload = {
      reference,
      room_id: data.roomId,
      room_name: data.roomName,
      check_in: checkIn,
      check_out: checkOut,
      guests: data.guests,
      nights: data.nights,
      rate_per_night: data.ratePerNight,
      addons: data.addons,
      total: data.total,
      payment_method: data.paymentMethod,
      status: "pending" as const,
    };

    const { error: bookingError } = await supabaseAdmin.from("bookings").insert(bookingPayload);
    if (bookingError) throw bookingError;

    const { error: guestError } = await supabaseAdmin.from("booking_guests").insert({
      reference,
      first_name: data.guest.firstName,
      last_name: data.guest.lastName,
      email: data.guest.email,
      phone: data.guest.phone,
      country: data.guest.country || null,
      requests: data.guest.requests || null,
    });
    if (guestError) throw guestError;

    await triggerConfirmation(reference, {
      ...bookingPayload,
      guest_email: data.guest.email,
      guest_phone: data.guest.phone,
    });

    return {
      reference,
      roomId: data.roomId,
      roomName: data.roomName,
      checkIn,
      checkOut,
      guests: data.guests,
      nights: data.nights,
      ratePerNight: data.ratePerNight,
      addons: data.addons,
      total: data.total,
      paymentMethod: data.paymentMethod,
      source: data.source,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  });

// Full lookup requires reference + email + phone. Runs on the server so PII never
// leaks through a public policy or a publicly-executable SECURITY DEFINER function.
export const lookupBookingFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => lookupSchema.parse(data))
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
