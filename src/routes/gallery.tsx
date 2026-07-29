import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero.jpg";
import poolImg from "@/assets/pool.jpg";
import diningImg from "@/assets/dining.jpg";
import conferenceImg from "@/assets/conference.jpg";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomFamily from "@/assets/room-family.jpg";
import roomTwin from "@/assets/room-twin.jpg";
import roomSingle from "@/assets/room-single.jpg";

type Cat = "all" | "rooms" | "grounds" | "conference" | "dining";

const images: { src: string; alt: string; cat: Exclude<Cat, "all"> }[] = [
  { src: heroImg, alt: "Sunset over the highlands", cat: "grounds" },
  { src: poolImg, alt: "Pool at dusk", cat: "grounds" },
  { src: diningImg, alt: "Dining room service", cat: "dining" },
  { src: conferenceImg, alt: "Conference room", cat: "conference" },
  { src: roomDeluxe, alt: "Deluxe Room", cat: "rooms" },
  { src: roomFamily, alt: "Family Villa", cat: "rooms" },
  { src: roomTwin, alt: "Twin Suite", cat: "rooms" },
  { src: roomSingle, alt: "Garden Single", cat: "rooms" },
];

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — AfricanRoyal Villa" },
      {
        name: "description",
        content: "Photographs of AfricanRoyal Villa: rooms, grounds, dining and conference spaces.",
      },
      { property: "og:title", content: "Gallery — AfricanRoyal Villa" },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [cat, setCat] = useState<Cat>("all");
  const shown = cat === "all" ? images : images.filter((i) => i.cat === cat);
  const filters: Cat[] = ["all", "rooms", "grounds", "conference", "dining"];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.3em] uppercase text-terracotta">
        Gallery
      </span>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl font-medium">The lodge in frame</h1>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setCat(f)}
            className={`px-4 py-1.5 text-xs uppercase tracking-widest rounded-full border transition-colors ${
              cat === f
                ? "bg-espresso text-cream border-espresso"
                : "bg-transparent text-espresso/70 border-espresso/15 hover:border-espresso"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {shown.map((img, i) => (
          <div key={img.src + i} className="mb-4 break-inside-avoid">
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="w-full rounded-xl outline-1 -outline-offset-1 outline-black/5 hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}