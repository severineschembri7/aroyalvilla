import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AfricanRoyal Villa" },
      {
        name: "description",
        content:
          "Reach the AfricanRoyal Villa front desk directly by phone, email or WhatsApp.",
      },
      { property: "og:title", content: "Contact — AfricanRoyal Villa" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16">
      <div>
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-terracotta">
          Get in touch
        </span>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl font-medium mb-6">
          Speak with the front desk
        </h1>
        <p className="text-espresso/70 mb-10 max-w-[42ch]">
          For same-day questions, WhatsApp is fastest — our reception answers between 06:00 and
          22:00 East AfricanTime.
        </p>
        <dl className="space-y-6 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-widest text-espresso/40">Phone</dt>
            <dd className="mt-1 text-lg">+255 759 533 491</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-espresso/40">Email</dt>
            <dd className="mt-1 text-lg">hello@Africaroyalvilla.com</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-espresso/40">Address</dt>
            <dd className="mt-1 text-lg">Karatu Highway, Arusha Region, Tanzania</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="bg-cream border border-espresso/10 rounded-2xl p-8 space-y-4"
      >
        {sent ? (
          <div className="text-center py-8">
            <p className="font-serif text-2xl italic mb-2">Thank you.</p>
            <p className="text-sm text-espresso/60">
              We'll respond within one business day.
            </p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-espresso/50">Name</span>
              <input
                required
                className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-espresso/50">Email</span>
              <input
                required
                type="email"
                className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-espresso/50">Message</span>
              <textarea
                required
                rows={5}
                className="mt-1 w-full bg-white border border-espresso/10 rounded-md px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
            </label>
            <button
              type="submit"
              className="w-full bg-terracotta text-cream py-3 font-medium rounded-md hover:bg-espresso transition-colors"
            >
              Send message
            </button>
          </>
        )}
      </form>
    </div>
  );
}