import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Location — African Royal Villa" },
      {
        name: "description",
        content:
          "Our story, and how to find us: fifteen minutes from the Ngorongoro Conservation Area gateway, twenty from Lake Manyara.",
      },
      { property: "og:title", content: "About & Location — African Royal Villa" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="animate-fade-in">
      <section className="relative h-[50vh] min-h-[380px]">
        <img src={heroImg} alt="The Karatu highlands at golden hour" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-espresso/40" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-12">
            <span className="text-cream/80 text-xs font-semibold tracking-[0.3em] uppercase">
              Our story
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-cream font-medium italic">
              A quieter Karatu
            </h1>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-4xl mx-auto space-y-6 text-lg text-espresso/80 leading-relaxed">
        <p>
          African Royal Villa &amp; Campsite began as a working farm on the edge of the Karatu
          highlands. What started as a handful of rondavels for family and friends grew, over
          two decades, into a boutique lodge — but the pace never changed.
        </p>
        <p>
          We're fifteen minutes from the Ngorongoro Conservation Area gate and twenty from Lake
          Manyara. Most of our guests use us as the pause on either side of a long safari day;
          many come back to hold conferences and weddings in the Savannah Room.
        </p>
        <p>
          The staff who greet you today are, in most cases, the same people who greeted you the
          last time. That continuity is the thing we're most proud of.
        </p>
      </section>

      <section className="pb-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
        <div className="p-8 bg-cream rounded-2xl border border-espresso/10">
          <div className="text-xs uppercase tracking-widest text-espresso/40">Address</div>
          <p className="mt-2 font-serif text-xl">Karatu Highway, Arusha Region, Tanzania</p>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="font-serif text-3xl text-terracotta">15 min</div>
              <div className="text-xs uppercase tracking-widest text-espresso/50 mt-1">
                to Ngorongoro Gate
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl text-terracotta">20 min</div>
              <div className="text-xs uppercase tracking-widest text-espresso/50 mt-1">
                to Lake Manyara
              </div>
            </div>
          </div>
        </div>
        <div className="aspect-video rounded-2xl overflow-hidden border border-espresso/10">
          <iframe
            title="African Royal Villa location — Karatu, Tanzania"
            src="https://www.google.com/maps?q=-3.365532,35.672269&z=15&output=embed"
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>

      <section className="pb-24 px-6 max-w-7xl mx-auto -mt-16 flex flex-wrap gap-6 text-xs uppercase tracking-widest text-espresso/60">
        <span>Lat -3.365532° &middot; Lon 35.672269°</span>
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=-3.365532,35.672269"
          target="_blank"
          rel="noreferrer"
          className="text-terracotta hover:text-espresso font-semibold"
        >
          Open in Google Maps →
        </a>
      </section>
    </div>
  );
}