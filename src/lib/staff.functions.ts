import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createStaffAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["front_desk", "restaurant_bar", "housekeeping", "management"]),
  department: z.string().min(1),
});

const reservationStatusSchema = z.object({
  reference: z.string().min(1),
  status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
  reason: z.string().optional().default(""),
});

const reservationDetailsSchema = z.object({
  reference: z.string().min(1),
  roomName: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().positive(),
  total: z.number().nonnegative(),
});

const roomStatusSchema = z.object({
  roomId: z.string().min(1),
  status: z.enum(["available", "occupied", "dirty", "maintenance"]),
});

const orderSchema = z.object({
  bookingReference: z.string().min(1),
  guestName: z.string().min(1),
  items: z.array(z.string()),
  total: z.number().nonnegative(),
  kind: z.enum(["restaurant", "bar"]),
});

const staffProfileSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  role: z.enum(["front_desk", "restaurant_bar", "housekeeping", "management"]),
  department: z.string().min(1),
  active: z.boolean(),
});

export const listStaffUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  return (data.users ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    role: user.user_metadata?.role || user.app_metadata?.role || "none",
  }));
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => createStaffAccountSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: data.role, full_name: data.fullName },
      app_metadata: { role: data.role },
    });

    if (error) throw error;

    const { error: profileError } = await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: created.user?.id,
        full_name: data.fullName,
        email: data.email,
        role: data.role,
        department: data.department,
        active: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (profileError) throw profileError;

    return { ok: true, user: created.user };
  });

export const listStaffProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("staff_profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const upsertStaffProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => staffProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: data.id,
        full_name: data.fullName,
        role: data.role,
        department: data.department,
        active: data.active,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const updateStaffRole = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), role: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      user_metadata: { role: data.role },
      app_metadata: { role: data.role },
    });
    if (updateError) throw updateError;

    const { error: profileError } = await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: data.id,
        role: data.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw profileError;

    return { ok: true };
  });

export const listReservations = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("reference, room_id, room_name, check_in, check_out, guests, status, total, created_at, payment_method, nights, reason")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const updateReservationStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => reservationStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bookings").update({ status: data.status, reason: data.reason, updated_at: new Date().toISOString() }).eq("reference", data.reference);
    if (error) throw error;
    return { ok: true };
  });

export const updateReservationDetails = createServerFn({ method: "POST" })
  .validator((data: unknown) => reservationDetailsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        room_name: data.roomName,
        check_in: data.checkIn,
        check_out: data.checkOut,
        guests: data.guests,
        total: data.total,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", data.reference);
    if (error) throw error;
    return { ok: true };
  });

export const listRoomStatuses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("room_statuses").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const setRoomStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => roomStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("room_statuses").upsert({
      room_id: data.roomId,
      status: data.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "room_id" });
    if (error) throw error;
    return { ok: true };
  });

export const createRestaurantOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: orderError } = await supabaseAdmin.from("restaurant_orders").insert({
      booking_reference: data.bookingReference,
      guest_name: data.guestName,
      items: data.items,
      status: "open",
      total: data.total,
      kind: data.kind,
      created_at: new Date().toISOString(),
    });
    if (orderError) throw orderError;

    const { error: billingError } = await supabaseAdmin.from("billing_items").insert({
      booking_reference: data.bookingReference,
      description: `${data.kind === "bar" ? "Bar" : "Restaurant"} order`,
      amount: data.total,
      kind: data.kind,
      created_at: new Date().toISOString(),
    });
    if (billingError) throw billingError;
    return { ok: true };
  });

export const listBillingItems = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("billing_items").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const recordPayment = createServerFn({ method: "POST" })
  .validator(z.object({ bookingReference: z.string().min(1), amount: z.number().nonnegative() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("billing_items").insert({
      booking_reference: data.bookingReference,
      description: "Payment received",
      amount: -Math.abs(data.amount),
      kind: "payment",
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  });
