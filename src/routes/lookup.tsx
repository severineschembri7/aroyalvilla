import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { lookupBooking, STATUS_LABEL, type StoredBooking, type BookingStatus } from "@/lib/bookings";
import { useBookingStatus } from "@/hooks/use-holds";

export const Route = createFileRoute("/lookup")({
  validateSearch: (raw: Record<string, unknown>) => ({
    ref: typeof raw.ref === "string" ? raw.ref : "",
  }),
  head: () => ({
    meta: [
      { title: "Find Your Booking — AfricanRoyal Villa" },
      {
        name: "description",
        content:
          "Look up your AfricanRoyal Villa reservation with your booking reference, email and phone number. See live status updates.",
      },
      { property: "og:title", content: "Find Your Booking — AfricanRoyal Villa" },
      { property: "og:description", content: "Real-time status for your reservation at AfricanRoyal Villa, Karatu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/lookup" }],
  }),
  component: LookupPage,
});

function LookupPage() {
  const { ref } = Route.useSearch();
  const [reference, setReference] = useState(ref);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<StoredBooking | null>(null);

  useEffect(() => {
    setReference(ref);
  }, [ref]);

  const { status: liveStatus, updatedAt } = useBookingStatus(booking?.reference);
  const status = ((liveStatus as BookingStatus | null) ?? booking?.status ?? "pending") as BookingStatus;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setBooking(null);
    try {
      const b = await lookupBooking(reference, email, phone);
      if (!b) {
        setError("We couldn't find a booking that matches those details. Double-check your reference, email and phone.");
      } else {
        setBooking(b);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const waHref = booking
    ? `https://wa.me/255759533491?text=${encodeURIComponent(
        `Hello AfricanRoyal Villa, this is ${booking.guest.firstName} ${booking.guest.lastName}. I'd like to ask about my booking ${booking.reference} (${booking.roomName}, ${booking.checkIn} → ${booking.checkOut}).`,
      )}`
    : `https://wa.me/255759533491`;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-terracotta">
          Manage Booking
        </span>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl font-medium italic">
          Find your reservation
        </h1>
        <p className="mt-4 text-espresso/70 max-w-[52ch] mx-auto">
          Enter the reference we sent you along with the email and phone you used to book.
          Your booking status updates here in real time.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-cream border border-espresso/10 rounded-2xl p-6 md:p-8 grid gap-4"
      >
        <Field label="Booking reference">
          <input
            required
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="ARV-XXXXXX"
            className="w-full bg-white border border-espresso/15 rounded-md px-4 py-2.5 tracking-widest font-mono"
          />
        </Field>
        <Field label="Email used to book">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-espresso/15 rounded-md px-4 py-2.5"
          />
        </Field>
        <Field label="Phone number">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+255…"
            className="w-full bg-white border border-espresso/15 rounded-md px-4 py-2.5"
          />
        </Field>
        {error && <p className="text-sm text-terracotta">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="justify-self-start px-6 py-2.5 bg-terracotta text-cream font-medium rounded-md hover:bg-espresso transition-colors disabled:opacity-50"
        >
          {loading ? "Searching…" : "Find booking"}
        </button>
      </form>

      {booking && (
        <div className="mt-10 bg-white border border-espresso/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-espresso/10">
            <div>
              <div className="text-xs uppercase tracking-widest text-espresso/50">Reference</div>
              <div className="font-serif text-2xl text-terracotta">{booking.reference}</div>
            </div>
            <StatusBadge status={status} />
          </div>

          <dl className="mt-6 grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
            <Row label="Room" value={booking.roomName} />
            <Row
              label="Guest"
              value={`${booking.guest.firstName} ${booking.guest.lastName}`.trim() || "—"}
            />
            <Row label="Arrival" value={booking.checkIn} />
            <Row label="Departure" value={booking.checkOut} />
            <Row
              label="Nights"
              value={`${booking.nights} · ${booking.guests} guest${booking.guests === 1 ? "" : "s"}`}
            />
            <Row
              label="Payment"
              value={booking.paymentMethod === "card" ? "Credit card" : "Mobile money"}
            />
            <div className="sm:col-span-2 pt-4 border-t border-espresso/10 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-espresso/40">Total</span>
              <span className="font-serif text-2xl">${booking.total}</span>
            </div>
          </dl>

          {updatedAt && (
            <p className="mt-6 text-xs text-espresso/50">
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-6 py-2.5 bg-terracotta text-cream font-medium rounded-md hover:bg-espresso transition-colors"
            >
              Message us on WhatsApp
            </a>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-2.5 border border-espresso/20 text-espresso font-medium rounded-md hover:bg-cream transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-espresso/50">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-espresso/40">{label}</dt>
      <dd className="mt-1 text-espresso">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const tone: Record<BookingStatus, string> = {
    pending: "bg-gold/20 text-espresso",
    confirmed: "bg-sage/40 text-espresso",
    checked_in: "bg-terracotta/15 text-terracotta",
    checked_out: "bg-espresso/10 text-espresso/70",
    cancelled: "bg-terracotta/20 text-terracotta",
  };
  return (
    <span
      className={`inline-block text-xs font-semibold tracking-[0.3em] uppercase px-3 py-1 rounded-full ${tone[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}