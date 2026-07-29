import { createFileRoute, Link } from "@tanstack/react-router";
import { AvailabilityWidget } from "@/components/availability-widget";
import { rooms, availabilityFor, nightsBetween } from "@/lib/rooms";
import { useHolds } from "@/hooks/use-holds";

type Search = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomType?: string;
};

export const Route = createFileRoute("/rooms")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    checkIn: typeof raw.checkIn === "string" ? raw.checkIn : undefined,
    checkOut: typeof raw.checkOut === "string" ? raw.checkOut : undefined,
    guests: typeof raw.guests === "number" ? raw.guests : raw.guests ? Number(raw.guests) : undefined,
    roomType: typeof raw.roomType === "string" ? raw.roomType : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Rooms & Rates — AfricanRoyal Villa" },
      {
        name: "description",
        content:
          "Four distinct room categories at AfricanRoyal Villa in Karatu: Deluxe, Family, Twin and Garden Single. Check live availability and book direct.",
      },
      { property: "og:title", content: "Rooms & Rates — AfricanRoyal Villa" },
      { property: "og:url", content: "/rooms" },
    ],
    links: [{ rel: "canonical", href: "/rooms" }],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const search = Route.useSearch();
  const { checkIn, checkOut, guests, roomType } = search;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const { holds } = useHolds();

  const visible = rooms.filter((r) => {
    if (roomType && roomType !== "any" && r.id !== roomType) return false;
    if (guests && r.capacity < guests) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <section className="bg-espresso text-cream py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-gold text-xs font-semibold tracking-[0.3em] uppercase">
            Accommodation
          </span>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-medium">Rooms &amp; Rates</h1>
          <p className="mt-3 text-cream/70 max-w-[52ch]">
            Adjust your dates to see live availability across all four categories.
          </p>
          <div className="mt-10">
            <AvailabilityWidget variant="inline" initial={search} />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto">
        {checkIn && checkOut ? (
          <p className="mb-8 text-sm text-espresso/60">
            Showing availability for{" "}
            <span className="text-espresso font-medium">{nights} night{nights === 1 ? "" : "s"}</span>{" "}
            · {checkIn} → {checkOut}
          </p>
        ) : (
          <p className="mb-8 text-sm text-espresso/60">
            Pick dates above to see live availability and total pricing.
          </p>
        )}

        {visible.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl italic mb-2">No rooms match your search.</p>
            <p className="text-sm text-espresso/60">Try widening your guest count or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {visible.map((room) => {
              const avail =
                checkIn && checkOut
                  ? availabilityFor(room.id, checkIn, checkOut, holds)
                  : { available: room.totalUnits, total: room.totalUnits };
              const totalPrice = nights > 0 ? nights * room.rate : null;
              return (
                <article
                  key={room.id}
                  className="group bg-white rounded-2xl overflow-hidden ring-1 ring-espresso/5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/2] overflow-hidden">
                    <img
                      src={room.image}
                      alt={`${room.name} at AfricanRoyal Villa`}
                      width={800}
                      height={533}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h2 className="font-serif text-2xl font-medium">{room.name}</h2>
                        <p className="text-sm text-espresso/60 mt-1">{room.tagline}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-serif text-xl text-terracotta">${room.rate}</div>
                        <div className="text-[10px] uppercase tracking-widest text-espresso/40">
                          per night
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 my-4">
                      {room.amenities.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="text-[11px] uppercase tracking-widest px-2 py-1 bg-cream text-espresso/70 rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-espresso/10">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-espresso/40">
                          Availability
                        </div>
                        <div className="text-sm font-medium">
                          {avail.available > 0 ? (
                            <span className="text-espresso">
                              {avail.available} of {avail.total} available
                            </span>
                          ) : (
                            <span className="text-terracotta">Fully booked</span>
                          )}
                        </div>
                        {totalPrice !== null && avail.available > 0 && (
                          <div className="text-xs text-espresso/60 mt-1">
                            Total: ${totalPrice} for {nights} night{nights === 1 ? "" : "s"}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to="/rooms/$roomId"
                          params={{ roomId: room.id }}
                          className="px-4 py-2 text-sm font-medium border border-espresso/15 hover:border-espresso rounded-md transition-colors"
                        >
                          Details
                        </Link>
                        {avail.available > 0 && (
                          <Link
                            to="/book"
                            search={{
                              roomId: room.id,
                              checkIn: checkIn ?? undefined,
                              checkOut: checkOut ?? undefined,
                              guests: guests ?? 2,
                            }}
                            className="px-4 py-2 text-sm font-medium bg-terracotta text-cream hover:bg-espresso transition-colors rounded-md"
                          >
                            Book Now
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}