import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/rooms", label: "Rooms" },
  { to: "/dining", label: "Dining" },
  { to: "/conference", label: "Conference" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/lookup", label: "My Booking" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-espresso/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="hidden md:block text-xs font-semibold tracking-[0.2em] uppercase text-espresso/70">
          Karatu, TZ
        </div>
        <Link
          to="/"
          className="font-serif text-xl font-medium tracking-tight italic text-espresso"
        >
          African Royal Villa
        </Link>
        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm font-medium text-espresso hover:text-terracotta transition-colors"
                activeProps={{ className: "text-terracotta" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <Link
            to="/rooms"
            className="bg-terracotta text-cream text-sm font-medium px-4 py-2 hover:bg-espresso transition-colors"
          >
            Book Stay
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center p-2 text-espresso"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-espresso/10 bg-cream">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-espresso hover:text-terracotta transition-colors py-2"
                activeProps={{ className: "text-terracotta" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}