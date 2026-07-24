import { useEffect, useState } from "react";
import type { Hold } from "@/lib/rooms";
import { getRoomHolds, getBookingSummary } from "@/lib/bookings.functions";

// Live-syncing list of every booking's (room_id, dates, status).
// No PII is exposed by this table's RLS.
export function useHolds(): { holds: Hold[]; loading: boolean } {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getRoomHolds();
        if (!cancelled) {
          setHolds(data as Hold[]);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const interval = setInterval(load, 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { holds, loading };
}

// Poll status/details of a single booking reference. The reference acts as a bearer
// token — enumeration is bounded by its entropy and no PII is returned.
export function useBookingStatus(reference: string | undefined) {
  const [status, setStatus] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getBookingSummary({ data: { ref: reference } });
        if (!cancelled && data) {
          setStatus(data.status);
          setUpdatedAt(data.updated_at);
        }
      } catch {
        // ignore
      }
    };
    void load();
    const interval = setInterval(load, 15_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [reference]);

  return { status, updatedAt };
}