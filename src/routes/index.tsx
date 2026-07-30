import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero.jpg";
import poolImg from "@/assets/pool.jpg";
import diningImg from "@/assets/dining.jpg";
import conferenceImg from "@/assets/conference.jpg";
import { AvailabilityWidget } from "@/components/availability-widget";
import { rooms } from "@/lib/rooms";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <section className="relative h-[85vh] min-h-[600px] flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImg}
            alt="Sunset view from African Royal Villa over the Karatu highlands toward the Ngorongoro rim"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-espresso/40" />
        </div>

        <div className="relative z-10 max-w-4xl animate-fade-up">
          <h1 className="font-serif text-5xl md:text-7xl text-cream leading-none mb-6 font-medium italic text-balance">
            African Royal Villa — calm, crafted, and ready for your stay.
          </h1>
          <p className="text-cream/90 text-lg md:text-xl font-light tracking-wide max-w-[42ch] mx-auto text-pretty">
            A boutique retreat on the Karatu highlands, designed for thoughtful stays, seamless arrivals, and effortless reservations.
          </p>
        </div>

        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-20">
          <AvailabilityWidget />
        </div>
      </section>

      {/* ROOMS PREVIEW */}
      <section className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-terracotta">
            Accommodation
          </span>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl font-medium text-balance">
            Refined bush hospitality
          </h2>
          <p className="mt-4 max-w-[52ch] mx-auto text-espresso/80 text-pretty">
            Four distinct categories designed to echo the textures of the Karatu highlands — from
            solo travellers to families on a shared safari.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <Link
              key={room.id}
              to="/rooms/$roomId"
              params={{ roomId: room.id }}
              className="group"
            >
              <div className="aspect-[2/3] rounded-[12px] overflow-hidden mb-4 outline-1 -outline-offset-1 outline-black/5">
                <img
                  src={room.image}
                  alt={`${room.name} interior at African Royal Villa`}
                  width={600}
                  height={900}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="font-serif text-xl font-medium mb-1">{room.name}</h3>
              <div className="flex justify-between items-end">
                <span className="text-xs text-espresso/50 uppercase tracking-widest">
                  From ${room.rate} / night
                </span>
                <span className="text-xs font-medium text-terracotta group-hover:underline">
                  View Details
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MICE / CONFERENCE */}
      <section className="bg-espresso text-cream py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-4 block">
              Corporate &amp; Events
            </span>
            <h2 className="font-serif text-4xl md:text-5xl mb-6 font-medium text-balance">
              The Savannah Room
            </h2>
            <p className="text-cream/70 text-lg mb-8 max-w-[44ch] text-pretty">
              Our premier conference facility hosts up to 150 guests — a sophisticated backdrop
              for corporate retreats, summits and wedding celebrations amidst the Karatu
              highlands.
            </p>
            <div className="grid grid-cols-2 gap-8 mb-10">
              <Stat value="150" label="Pax capacity" />
              <Stat value="80" label="Guest rooms" />
            </div>
            <Link
              to="/conference"
              className="inline-flex items-center gap-3 py-3 px-4 ring-1 ring-gold text-gold text-sm font-medium hover:bg-gold hover:text-espresso transition-colors"
            >
              <span className="size-2 rounded-full bg-current" />
              Inquire for Events
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src={conferenceImg}
              alt="The Savannah conference room set for 150 guests"
              width={800}
              height={1000}
              loading="lazy"
              className="aspect-[4/5] object-cover rounded-[12px] outline-1 -outline-offset-1 outline-white/10"
            />
            <div className="flex flex-col gap-4">
              <img
                src={poolImg}
                alt="The lodge swimming pool at dusk"
                width={800}
                height={600}
                loading="lazy"
                className="aspect-square object-cover rounded-[12px] outline-1 -outline-offset-1 outline-white/10"
              />
              <img
                src={diningImg}
                alt="Our dining room set for the evening service"
                width={800}
                height={600}
                loading="lazy"
                className="aspect-square object-cover rounded-[12px] outline-1 -outline-offset-1 outline-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-12 border-b border-espresso/5 bg-sage/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
            {[
              {
                tag: "Excellent",
                quote: "The perfect base for the Crater.",
                by: "Jameson Family, UK",
              },
              {
                tag: "Boutique Luxury",
                quote: "Remarkable service and a calm retreat that feels like home.",
                by: "Elena M., Italy",
              },
              {
                tag: "Seamless Event",
                quote: "The best MICE facility in Karatu.",
                by: "Director, Simba Logistics",
              },
            ].map((r) => (
              <div key={r.by} className="flex flex-col gap-1">
                <div className="text-xs font-semibold tracking-widest uppercase text-espresso/40">
                  {r.tag}
                </div>
                <div className="text-xl font-serif italic">&ldquo;{r.quote}&rdquo;</div>
                <div className="text-xs text-espresso/60">{r.by}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-serif text-gold mb-1">{value}</div>
      <div className="text-xs uppercase tracking-widest text-cream/40">{label}</div>
    </div>
  );
}
