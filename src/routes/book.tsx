import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { rooms, findRoom, nightsBetween, availabilityFor } from "@/lib/rooms";
import { createBooking } from "@/lib/bookings";
import { useHolds } from "@/hooks/use-holds";

type Search = {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/book")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    roomId: typeof raw.roomId === "string" ? raw.roomId : undefined,
    checkIn: typeof raw.checkIn === "string" ? raw.checkIn : undefined,
    checkOut: typeof raw.checkOut === "string" ? raw.checkOut : undefined,
    guests:
      typeof raw.guests === "number" ? raw.guests : raw.guests ? Number(raw.guests) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book Your Stay — African Royal Villa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookPage,
});

const ADDONS = [
  { id: "transfer", label: "Airport transfer (Kilimanjaro/Arusha)", price: 120 },
  { id: "breakfast", label: "Full breakfast package", price: 25 },
  { id: "gamedrive", label: "Ngorongoro game-drive package", price: 240 },
];

function BookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { holds } = useHolds();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState(search.roomId ?? "deluxe");
  const [checkIn, setCheckIn] = useState(search.checkIn ?? todayISO(7));
  const [checkOut, setCheckOut] = useState(search.checkOut ?? todayISO(10));
  const [guests, setGuests] = useState(search.guests ?? 2);
  const [addons, setAddons] = useState<string[]>([]);
  const [payment, setPayment] = useState<"card" | "mobile">("card");
  const [guest, setGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    requests: "",
  });

  const room = findRoom(roomId) ?? rooms[0];
  const nights = nightsBetween(checkIn, checkOut);
  const roomTotal = nights * room.rate;
  const avail = availabilityFor(room.id, checkIn, checkOut, holds);
  const addonsTotal = useMemo(
    () =>
      addons.reduce((sum, id) => sum + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0),
    [addons],
  );
  const total = roomTotal + addonsTotal;

  const finish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const booking = await createBooking({
        roomId: room.id,
        roomName: room.name,
        checkIn,
        checkOut,
        guests,
        nights,
        ratePerNight: room.rate,
        addons,
        total,
        guest,
        paymentMethod: payment,
      });
      navigate({ to: "/book/confirmation", search: { ref: booking.reference } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your booking. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest mb-10">
        {["Room", "Guest details", "Add-ons", "Payment"].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-3">
              <span
                className={`size-6 rounded-full grid place-items-center text-[10px] font-bold ${
                  active
                    ? "bg-terracotta text-cream"
                    : done
                      ? "bg-espresso text-cream"
                      : "bg-espresso/10 text-espresso/50"
                }`}
              >
                {n}
              </span>
              <span className={active ? "text-espresso" : "text-espresso/40"}>{label}</span>
              {n < 4 && <span className="w-8 h-px bg-espresso/10" />}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-cream border border-espresso/10 rounded-2xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-serif text-2xl">Your room &amp; dates</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="text-sm">
                  <span className="text-[10px] uppercase tracking-widest text-espresso/50">
                    Arrival
                  </span>
                  <input
                    type="date"
                    value={checkIn}
                    min={todayISO()}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 outline-none focus:border-terracotta"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-[10px] uppercase tracking-widest text-espresso/50">
                    Departure
                  </span>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 outline-none focus:border-terracotta"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-[10px] uppercase tracking-widest text-espresso/50">
                    Guests
                  </span>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 outline-none focus:border-terracotta"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoomId(r.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      roomId === r.id
                        ? "border-terracotta bg-white ring-1 ring-terracotta"
                        : "border-espresso/10 bg-white hover:border-espresso/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-serif text-lg">{r.name}</div>
                        <div className="text-xs text-espresso/60 mt-1">
                          Sleeps {r.capacity}
                        </div>
                      </div>
                      <div className="text-terracotta font-medium">${r.rate}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl mb-2">Guest details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField
                  label="First name"
                  value={guest.firstName}
                  onChange={(v) => setGuest({ ...guest, firstName: v })}
                />
                <TextField
                  label="Last name"
                  value={guest.lastName}
                  onChange={(v) => setGuest({ ...guest, lastName: v })}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={guest.email}
                  onChange={(v) => setGuest({ ...guest, email: v })}
                />
                <TextField
                  label="Phone"
                  value={guest.phone}
                  onChange={(v) => setGuest({ ...guest, phone: v })}
                />
                <TextField
                  label="Country"
                  value={guest.country}
                  onChange={(v) => setGuest({ ...guest, country: v })}
                />
              </div>
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-espresso/50">
                  Special requests (optional)
                </span>
                <textarea
                  rows={4}
                  value={guest.requests}
                  onChange={(e) => setGuest({ ...guest, requests: e.target.value })}
                  className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 text-sm outline-none focus:border-terracotta"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl mb-2">Add-ons</h2>
              <p className="text-sm text-espresso/60 mb-4">Optional extras for your stay.</p>
              {ADDONS.map((a) => {
                const checked = addons.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors ${
                      checked
                        ? "border-terracotta bg-white ring-1 ring-terracotta"
                        : "border-espresso/10 bg-white hover:border-espresso/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setAddons(
                            e.target.checked
                              ? [...addons, a.id]
                              : addons.filter((id) => id !== a.id),
                          )
                        }
                        className="accent-terracotta"
                      />
                      <span>{a.label}</span>
                    </div>
                    <span className="font-medium text-terracotta">+${a.price}</span>
                  </label>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl mb-2">Payment</h2>
              <p className="text-sm text-espresso/60 mb-4">
                Free cancellation up to 48 hours before arrival. Rates in USD, taxes included.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["card", "mobile"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(m)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      payment === m
                        ? "border-terracotta bg-white ring-1 ring-terracotta"
                        : "border-espresso/10 bg-white hover:border-espresso/30"
                    }`}
                  >
                    <div className="font-medium">
                      {m === "card" ? "Credit / Debit Card" : "Mobile Money (M-Pesa)"}
                    </div>
                    <div className="text-xs text-espresso/60 mt-1">
                      {m === "card"
                        ? "Visa, Mastercard, Amex"
                        : "M-Pesa, Tigo Pesa, Airtel Money"}
                    </div>
                  </button>
                ))}
              </div>

              {payment === "card" ? (
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <TextField label="Card number" placeholder="4242 4242 4242 4242" />
                  <TextField label="Name on card" />
                  <TextField label="Expiry" placeholder="MM/YY" />
                  <TextField label="CVC" placeholder="123" />
                </div>
              ) : (
                <div className="mt-4">
                  <TextField label="Mobile money number" placeholder="+255 7XX XXX XXX" />
                  <p className="mt-3 text-xs text-espresso/60">
                    You'll receive a push on your phone to authorise the payment.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-espresso/50 mt-4">
                Payment processing is a stub in this prototype — no real card will be charged.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-espresso/10">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-4 py-2 text-sm font-medium text-espresso/60 disabled:opacity-30"
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2.5 bg-terracotta text-cream font-medium rounded-md hover:bg-espresso transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={submitting || avail.available <= 0}
                className="px-6 py-2.5 bg-terracotta text-cream font-medium rounded-md hover:bg-espresso transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : `Confirm & Pay $${total}`}
              </button>
            )}
          </div>
          {error && (
            <p className="mt-4 text-sm text-terracotta">{error}</p>
          )}
          {avail.available <= 0 && (
            <p className="mt-4 text-sm text-terracotta">
              This room is fully booked for the selected dates. Please pick different dates or another room.
            </p>
          )}
        </div>

        <aside className="bg-white border border-espresso/10 rounded-2xl p-6 h-fit lg:sticky lg:top-24">
          <div className="aspect-[3/2] overflow-hidden rounded-xl mb-4">
            <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
          </div>
          <div className="font-serif text-xl">{room.name}</div>
          <div className="text-sm text-espresso/60 mt-1">
            {checkIn} → {checkOut}
          </div>
          <div className="text-sm text-espresso/60">
            {nights} night{nights === 1 ? "" : "s"} · {guests} guest{guests === 1 ? "" : "s"}
          </div>
          <div className="mt-3 text-xs">
            {avail.available > 0 ? (
              <span className="text-sage-foreground text-espresso/70">
                Live availability: <span className="font-medium text-espresso">{avail.available} of {avail.total}</span>
              </span>
            ) : (
              <span className="text-terracotta font-medium">Fully booked for these dates</span>
            )}
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-espresso/60">
                ${room.rate} × {nights} night{nights === 1 ? "" : "s"}
              </dt>
              <dd className="font-medium">${roomTotal}</dd>
            </div>
            {addons.map((id) => {
              const a = ADDONS.find((x) => x.id === id)!;
              return (
                <div key={id} className="flex justify-between">
                  <dt className="text-espresso/60">{a.label}</dt>
                  <dd className="font-medium">${a.price}</dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-6 pt-4 border-t border-espresso/10 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-widest text-espresso/40">Total</span>
            <span className="font-serif text-2xl text-terracotta">${total}</span>
          </div>

          <p className="mt-4 text-[11px] text-espresso/50 leading-relaxed">
            Free cancellation up to 48h before arrival. Booking confirmation will be emailed to you.
          </p>
          <Link
            to="/rooms"
            className="mt-4 block text-center text-xs text-espresso/60 hover:text-terracotta underline"
          >
            Change room
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[10px] uppercase tracking-widest text-espresso/50">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 outline-none focus:border-terracotta"
      />
    </label>
  );
}