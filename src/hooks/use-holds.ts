import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Hold } from "@/lib/rooms";

// Live-syncing list of every booking's (room_id, dates, status).
// No PII is exposed by this table's RLS.
export function useHolds(): { holds: Hold[]; loading: boolean } {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const { data } = await supabase
        .from("bookings")
        .select("room_id, check_in, check_out, status")
        .gte("check_out", today.toISOString().slice(0, 10));
      if (!cancelled && data) {
        setHolds(data as Hold[]);
        setLoading(false);
      }
    };
    void load();

    const channel = supabase
      .channel("bookings-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { holds, loading };
}

// Subscribe to status/details of a single booking reference in real time.
export function useBookingStatus(reference: string | undefined) {
  const [status, setStatus] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("status, updated_at")
        .eq("reference", reference)
        .maybeSingle();
      if (!cancelled && data) {
        setStatus(data.status);
        setUpdatedAt(data.updated_at);
      }
    };
    void load();

    const channel = supabase
      .channel(`booking-${reference}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `reference=eq.${reference}`,
        },
        (payload) => {
          const row = payload.new as { status: string; updated_at: string };
          setStatus(row.status);
          setUpdatedAt(row.updated_at);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [reference]);

  return { status, updatedAt };
}