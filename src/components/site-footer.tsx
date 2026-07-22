import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="py-24 px-6 bg-cream border-t border-espresso/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16">
        <div className="max-w-[35ch]">
          <div className="font-serif text-2xl font-medium italic mb-6 text-espresso">
            African Royal Villa
          </div>
          <p className="text-sm text-espresso/60 mb-8">
            Located in Karatu, the highland gateway between Lake Manyara and the Ngorongoro
            Conservation Area.
          </p>
          <div className="flex gap-4">
            {["IG", "FB", "WA"].map((s) => (
              <button
                key={s}
                className="size-10 rounded-full border border-espresso/10 grid place-items-center text-xs font-semibold text-espresso/70 hover:bg-terracotta hover:text-cream hover:border-terracotta transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-16">
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-espresso/40">
              Navigate
            </span>
            <Link to="/rooms" className="text-sm text-espresso hover:text-terracotta">
              Reservations
            </Link>
            <Link to="/conference" className="text-sm text-espresso hover:text-terracotta">
              Conference Center
            </Link>
            <Link to="/gallery" className="text-sm text-espresso hover:text-terracotta">
              Gallery
            </Link>
            <Link to="/about" className="text-sm text-espresso hover:text-terracotta">
              About
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-espresso/40">
              Contact
            </span>
            <span className="text-sm text-espresso">Karatu Highway, Arusha Region</span>
            <span className="text-sm text-espresso">+255 759 533 491</span>
            <span className="text-sm text-espresso">hello@africanroyalvilla.com</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-espresso/5 flex flex-col sm:flex-row gap-2 justify-between items-center text-[10px] text-espresso/40 font-medium uppercase tracking-[0.2em]">
        <span>&copy; {new Date().getFullYear()} African Royal Villa &amp; Campsite</span>
        <span>Tanzania Hospitality Group</span>
      </div>
    </footer>
  );
}