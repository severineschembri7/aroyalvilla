import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import conferenceImg from "@/assets/conference.jpg";

export const Route = createFileRoute("/conference")({
  head: () => ({
    meta: [
      { title: "Conference & Events — African Royal Villa" },
      {
        name: "description",
        content:
          "The Savannah Room: a 150-pax conference facility for corporate retreats, summits and weddings in Karatu, Tanzania.",
      },
      { property: "og:title", content: "Conference & Events — African Royal Villa" },
      { property: "og:url", content: "/conference" },
      { property: "og:image", content: conferenceImg },
    ],
    links: [{ rel: "canonical", href: "/conference" }],
  }),
  component: ConferencePage,
});

function ConferencePage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="animate-fade-in">
      <section className="relative h-[60vh] min-h-[420px]">
        <img
          src={conferenceImg}
          alt="The Savannah conference room set for 150 guests"
          width={1600}
          height={900}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-espresso/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-12">
            <span className="text-gold text-xs font-semibold tracking-[0.3em] uppercase">
              Corporate &amp; Events
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-cream font-medium italic">
              The Savannah Room
            </h1>
            <p className="mt-3 text-cream/80 max-w-[52ch]">
              African Royal Villa's conference facility — up to 150 delegates in a single hall, with
              full AV, natural light, and a savannah view.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-serif text-2xl mb-4">Layout options</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Theatre", pax: "150 pax" },
                { name: "Classroom", pax: "80 pax" },
                { name: "U-shape", pax: "40 pax" },
                { name: "Banquet", pax: "120 pax" },
                { name: "Boardroom", pax: "24 pax" },
                { name: "Cocktail", pax: "180 pax" },
              ].map((l) => (
                <div
                  key={l.name}
                  className="p-5 rounded-xl border border-espresso/10 bg-cream"
                >
                  <div className="font-serif text-lg">{l.name}</div>
                  <div className="text-xs uppercase tracking-widest text-espresso/50 mt-1">
                    {l.pax}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl mb-4">What's included</h2>
            <ul className="grid sm:grid-cols-2 gap-y-2 text-sm text-espresso/80">
              {[
                "Full AV: projector, screens, wireless mics",
                "High-speed fibre Wi-Fi",
                "Two breakout rooms",
                "Tea, coffee & pastry service",
                "Dedicated event coordinator",
                "On-site accommodation for delegates",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-terracotta" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="bg-espresso text-cream rounded-2xl p-6 h-fit">
          <h3 className="font-serif text-xl mb-4">Inquire</h3>
          {submitted ? (
            <div className="text-sm">
              <p className="text-cream mb-2">Thank you — we've received your inquiry.</p>
              <p className="text-cream/60">
                Our events team will be in touch within one business day.
              </p>
            </div>
          ) : (
            <form
              className="space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <input
                required
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-cream placeholder:text-cream/40 outline-none focus:border-gold"
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-cream placeholder:text-cream/40 outline-none focus:border-gold"
              />
              <input
                type="date"
                required
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-cream placeholder:text-cream/40 outline-none focus:border-gold"
              />
              <input
                type="number"
                min={1}
                placeholder="Headcount"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-cream placeholder:text-cream/40 outline-none focus:border-gold"
              />
              <select
                required
                defaultValue=""
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-cream outline-none focus:border-gold"
              >
                <option value="" disabled className="text-espresso">
                  Event type
                </option>
                <option className="text-espresso">Corporate retreat</option>
                <option className="text-espresso">Conference / summit</option>
                <option className="text-espresso">Wedding</option>
                <option className="text-espresso">Other</option>
              </select>
              <button
                type="submit"
                className="w-full bg-gold text-espresso py-2.5 font-medium rounded-md hover:brightness-95 transition-all"
              >
                Send inquiry
              </button>
            </form>
          )}
        </aside>
      </section>
    </div>
  );
}