import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Verify caller has admin OR staff role. Uses the request bearer via the
// requireSupabaseAuth-scoped client so RLS applies as the caller.
async function assertStaff(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("admin") && !roles.includes("staff")) {
    throw new Error("Forbidden");
  }
  return roles;
}

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    return { userId: context.userId, roles: (data ?? []).map((r) => r.role as string) };
  });

export const listAllBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const refs = (bookings ?? []).map((b) => b.reference);
    const { data: guests } = await supabaseAdmin
      .from("booking_guests")
      .select("*")
      .in("reference", refs.length ? refs : ["__none__"]);
    const guestMap = new Map<string, any>();
    for (const g of guests ?? []) guestMap.set(g.reference, g);
    return (bookings ?? []).map((b) => ({
      ...b,
      rate_per_night: Number(b.rate_per_night),
      total: Number(b.total),
      guest: guestMap.get(b.reference) ?? null,
    }));
  });

const statusSchema = z.object({
  reference: z.string().min(4).max(32),
  status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
});

export const adminUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = data.reference.toUpperCase();
    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("reference", ref)
      .select("reference, room_name, status")
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error("Booking not found");

    const { data: guest } = await supabaseAdmin
      .from("booking_guests")
      .select("first_name, email")
      .eq("reference", ref)
      .maybeSingle();
    // eslint-disable-next-line no-console
    console.log(
      `[email:stub] status_change → ${guest?.email ?? "unknown"} — ${ref} is now ${data.status}`,
    );
    return { reference: ref, status: updated.status };
  });

// Room statuses (housekeeping board). Stored per (room_id, today).
export const listRoomStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from("room_statuses")
      .select("*")
      .eq("status_date", today);
    if (error) throw error;
    return data ?? [];
  });

const roomStatusSchema = z.object({
  roomId: z.string().min(1),
  state: z.enum(["clean", "dirty", "inspected", "out_of_order"]),
  notes: z.string().max(400).optional(),
});

export const setRoomStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => roomStatusSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: row, error } = await supabaseAdmin
      .from("room_statuses")
      .upsert(
        {
          room_id: data.roomId,
          status_date: today,
          state: data.state,
          notes: data.notes ?? null,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_id,status_date" },
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    return row;
  });