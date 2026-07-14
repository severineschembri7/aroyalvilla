import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { findBooking, type StoredBooking } from "@/lib/bookings";

export const Route = createFileRoute("/book/confirmation")({
  validateSearch: (raw: Record<string, unknown>) => ({
    ref: typeof raw.ref === "string" ? raw.ref : "",
  }),
  head: () => ({
    meta: [
      { title: "Booking Confirmed — African Royal Villa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { ref } = Route.useSearch();
  const [booking, setBooking] = useState<StoredBooking | undefined>();

  useEffect(() => {
    setBooking(findBooking(ref));
  }, [ref]);

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <div className="size-16 mx-auto mb-6 rounded-full bg-sage/30 grid place-items-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-espresso"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-terracotta">
          Confirmed
        </span>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl font-medium italic">
          Karibu — we've got you
        </h1>
        <p className="mt-4 text-espresso/70">
          A confirmation email is on its way
          {booking?.guest.email ? ` to ${booking.guest.email}` : ""}.
        </p>
      </div>

      <div className="bg-cream border border-espresso/10 rounded-2xl p-8">
        <div className="flex justify-between items-baseline pb-6 border-b border-espresso/10">
          <span className="text-xs uppercase tracking-widest text-espresso/50">
            Booking reference
          </span>
          <span className="font-serif text-2xl text-terracotta">
            {booking?.reference ?? ref}
          </span>
        </div>

        {booking ? (
          <dl className="mt-6 grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
            <Field label="Room" value={booking.roomName} />
            <Field
              label="Guest"
              value={`${booking.guest.firstName} ${booking.guest.lastName}`.trim() || "—"}
            />
            <Field label="Arrival" value={booking.checkIn} />
            <Field label="Departure" value={booking.checkOut} />
            <Field
              label="Nights"
              value={`${booking.nights} · ${booking.guests} guest${
                booking.guests === 1 ? "" : "s"
              }`}
            />
            <Field
              label="Payment"
              value={booking.paymentMethod === "card" ? "Credit card" : "Mobile money"}
            />
            <div className="sm:col-span-2 pt-4 border-t border-espresso/10 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-espresso/40">
                Total paid
              </span>
              <span className="font-serif text-2xl">${booking.total}</span>
            </div>
          </dl>
        ) : (
          <p className="mt-6 text-sm text-espresso/60">
            We couldn't find the details for this reference on this device. Please check your
            email for the full confirmation.
          </p>
        )}
      </div>

      <div className="mt-10 text-center space-y-4">
        <p className="text-sm text-espresso/60">
          Questions before you arrive? Message us directly on WhatsApp.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-2.5 border border-espresso/20 text-espresso font-medium rounded-md hover:bg-cream transition-colors"
          >
            Back to home
          </Link>
          <a
            href="https://wa.me/255754000000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-6 py-2.5 bg-terracotta text-cream font-medium rounded-md hover:bg-espresso transition-colors"
          >
            WhatsApp us
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-espresso/40">{label}</dt>
      <dd className="mt-1 text-espresso">{value}</dd>
    </div>
  );
}