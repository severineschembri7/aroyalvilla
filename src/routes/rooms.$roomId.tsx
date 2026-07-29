import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { findRoom } from "@/lib/rooms";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: ({ params }) => {
    const room = findRoom(params.roomId);
    if (!room) throw notFound();
    return { room };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.room.name} — African Royal Villa` },
          { name: "description", content: loaderData.room.description },
          { property: "og:title", content: `${loaderData.room.name} — African Royal Villa` },
          { property: "og:description", content: loaderData.room.description },
          { property: "og:url", content: `/rooms/${loaderData.room.id}` },
          { property: "og:image", content: loaderData.room.image },
          { property: "og:type", content: "product" },
        ]
      : [{ title: "Room not found" }, { name: "robots", content: "noindex" }],
    links: loaderData
      ? [{ rel: "canonical", href: `/rooms/${loaderData.room.id}` }]
      : [],
  }),
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-32 text-center">
      <h1 className="font-serif text-3xl mb-4">Room not found</h1>
      <Link to="/rooms" className="text-terracotta underline">
        View all rooms
      </Link>
    </div>
  ),
  component: RoomDetail,
});

function RoomDetail() {
  const { room } = Route.useLoaderData();
  return (
    <div className="animate-fade-in">
      <section className="relative h-[60vh] min-h-[400px]">
        <img
          src={room.image}
          alt={`${room.name} at African Royal Villa`}
          width={1200}
          height={800}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-espresso/30" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-12">
            <span className="text-cream/80 text-xs font-semibold tracking-[0.3em] uppercase">
              {room.capacity === 1 ? "Solo Traveller" : `Up to ${room.capacity} Guests`}
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-cream font-medium italic">
              {room.name}
            </h1>
            <p className="mt-2 text-cream/80 max-w-[52ch]">{room.tagline}</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h2 className="font-serif text-2xl mb-4">About this room</h2>
          <p className="text-espresso/70 leading-relaxed">{room.description}</p>

          <h3 className="mt-10 font-serif text-xl mb-4">Amenities</h3>
          <ul className="grid grid-cols-2 gap-y-2 text-sm text-espresso/80">
            {room.amenities.map((a: string) => (
              <li key={a} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-terracotta" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <aside className="bg-cream border border-espresso/10 rounded-2xl p-6 h-fit sticky top-24">
          <div className="text-xs uppercase tracking-widest text-espresso/40">From</div>
          <div className="font-serif text-3xl text-terracotta">
            ${room.rate}
            <span className="text-sm text-espresso/50 font-sans"> / night</span>
          </div>
          <div className="mt-2 text-sm text-espresso/60">
            Sleeps {room.capacity} · {room.totalUnits} rooms in this category
          </div>
          <Link
            to="/book"
            search={{ roomId: room.id }}
            className="mt-6 block text-center bg-terracotta text-cream py-3 font-medium hover:bg-espresso transition-colors rounded-md"
          >
            Book This Room
          </Link>
          <p className="mt-4 text-[11px] text-espresso/50 leading-relaxed">
            Free cancellation up to 48 hours before arrival. Rates in USD, taxes included.
          </p>
        </aside>
      </section>
    </div>
  );
}