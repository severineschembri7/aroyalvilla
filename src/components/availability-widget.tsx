import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type Variant = "hero" | "inline";

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function AvailabilityWidget({
  variant = "hero",
  initial,
}: {
  variant?: Variant;
  initial?: { checkIn?: string; checkOut?: string; guests?: number; roomType?: string };
}) {
  const navigate = useNavigate();
  const defaults = useMemo(
    () => ({
      checkIn: initial?.checkIn ?? todayISO(7),
      checkOut: initial?.checkOut ?? todayISO(10),
      guests: initial?.guests ?? 2,
      roomType: initial?.roomType ?? "any",
    }),
    [initial],
  );

  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState(defaults.guests);
  const [roomType, setRoomType] = useState(defaults.roomType);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/rooms",
      search: { checkIn, checkOut, guests, roomType },
    });
  };

  const containerClass =
    variant === "hero"
      ? "bg-cream ring-1 ring-black/5 shadow-xl"
      : "bg-white ring-1 ring-espresso/10 shadow-sm";

  return (
    <form
      onSubmit={submit}
      className={`${containerClass} p-2 flex flex-col md:flex-row items-stretch gap-2`}
    >
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="Arrival">
          <input
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => setCheckIn(e.target.value)}
            className="text-sm font-medium text-espresso bg-transparent outline-none w-full"
          />
        </Field>
        <Field label="Departure">
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="text-sm font-medium text-espresso bg-transparent outline-none w-full"
          />
        </Field>
        <Field label="Guests">
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="text-sm font-medium text-espresso bg-transparent outline-none w-full"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "Guest" : "Guests"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Room Type">
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="text-sm font-medium text-espresso bg-transparent outline-none w-full"
          >
            <option value="any">Any category</option>
            <option value="deluxe">Deluxe Room</option>
            <option value="family">Family Villa</option>
            <option value="twin">Twin Suite</option>
            <option value="single">Garden Single</option>
          </select>
        </Field>
      </div>
      <button
        type="submit"
        className="bg-terracotta text-cream px-8 py-4 font-medium text-sm tracking-wide ring-1 ring-terracotta hover:bg-espresso hover:ring-espresso transition-colors"
      >
        Check Availability
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="p-3 flex flex-col gap-1 border-r border-espresso/5 last:border-r-0 cursor-pointer">
      <span className="text-[11px] uppercase tracking-widest text-espresso/80 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}