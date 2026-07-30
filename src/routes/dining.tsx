import { createFileRoute, Link } from "@tanstack/react-router";
import diningImg from "@/assets/dining-hall.jpg";
import barImg from "@/assets/bar.jpg";

export const Route = createFileRoute("/dining")({
  head: () => ({
    meta: [
      { title: "Restaurant & Bar — African Royal Villa" },
      {
        name: "description",
        content:
          "Slow-cooked East Africancuisine and a candlelit bar under thatched rafters — open to guests and outside visitors in Karatu.",
      },
      { property: "og:title", content: "Restaurant & Bar — African Royal Villa" },
      {
        property: "og:description",
        content:
          "Slow-cooked East Africancuisine and a candlelit bar under thatched rafters — open to guests and outside visitors in Karatu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/dining" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FoodEstablishment",
          name: "African Royal Villa Restaurant & Bar",
          servesCuisine: ["East African", "International"],
          telephone: ["+255768777428", "+255667999706"],
          priceRange: "$$",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Karatu Highway",
            addressLocality: "Karatu",
            addressRegion: "Arusha Region",
            addressCountry: "TZ",
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: "06:30",
              closes: "22:00",
            },
          ],
          hasMenu: {
            "@type": "Menu",
            hasMenuSection: MENU.map((section) => ({
              "@type": "MenuSection",
              name: section.course,
              hasMenuItem: section.dishes.map((d) => ({
                "@type": "MenuItem",
                name: d.name,
                description: d.note,
              })),
            })),
          },
        }),
      },
    ],
  }),
  component: DiningPage,
});

const MENU: { course: string; dishes: { name: string; note: string }[] }[] = [
  {
    course: "To begin",
    dishes: [
      { name: "Roast pumpkin & coconut soup", note: "with toasted cashew, coriander oil" },
      { name: "Kachumbari salad", note: "heirloom tomato, red onion, chilli, lime" },
      { name: "Grilled halloumi & avocado", note: "warm chapati, tamarind glaze" },
    ],
  },
  {
    course: "From the fire",
    dishes: [
      { name: "Charcoal-grilled tilapia", note: "Lake Manyara catch, chermoula, ugali" },
      { name: "Slow-braised beef stew", note: "Karatu tomatoes, root vegetables, rice pilau" },
      { name: "Nyama choma platter", note: "lamb, chicken, grilled corn — for two" },
      { name: "Vegetable curry", note: "coconut, spinach, sweet potato, brown rice" },
    ],
  },
  {
    course: "To finish",
    dishes: [
      { name: "Cardamom crème brûlée", note: "burnt sugar, shortbread" },
      { name: "Tropical fruit plate", note: "passion fruit, pineapple, mango" },
      { name: "Tanzanian coffee & cocoa truffles", note: "single-origin Mbeya beans" },
    ],
  },
];

const BAR = [
  { name: "Konyagi & tonic", note: "Tanzania's spirit, cucumber, lime" },
  { name: "Dawa cocktail", note: "vodka, honey, lime, crushed ice" },
  { name: "Serengeti & Kilimanjaro lagers", note: "on tap, always cold" },
  { name: "South African& European wine list", note: "by the glass or bottle" },
  { name: "Fresh juices & mocktails", note: "passion, mango, tamarind, ginger" },
];

function DiningPage() {
  return (
    <div className="animate-fade-in">
      <section className="relative h-[55vh] min-h-[420px]">
        <img
          src={diningImg}
          alt="Candlelit restaurant at African Royal Villa"
          className="w-full h-full object-cover"
          width={1024}
          height={1024}
        />
        <div className="absolute inset-0 bg-espresso/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-14">
            <span className="text-cream/80 text-xs font-semibold tracking-[0.3em] uppercase">
              Restaurant & Bar
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-cream font-medium italic">
              A slow table in Karatu
            </h1>
            <p className="mt-4 max-w-xl text-cream/85 leading-relaxed">
              Our kitchen cooks with what the highlands grow: charcoal-grilled
              lake fish, slow stews, garden vegetables, and a short, considered
              wine list served under thatched rafters.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
        <div>
          <h3 className="font-serif text-xl mb-2 text-espresso">Hours</h3>
          <ul className="text-espresso/75 space-y-1 text-sm">
            <li>Breakfast — 6:30 to 10:00</li>
            <li>Lunch — 12:30 to 15:00</li>
            <li>Dinner — 18:30 to 22:00</li>
            <li>Bar — 11:00 until late</li>
          </ul>
        </div>
        <div>
          <h3 className="font-serif text-xl mb-2 text-espresso">Meal plans</h3>
          <p className="text-espresso/75 text-sm leading-relaxed">
            Half board and full board can be added to any stay at checkout, or
            arranged after arrival at reception. Special diets — vegetarian,
            vegan, halal, gluten-free — happily catered for with a day's notice.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-xl mb-2 text-espresso">Non-residents</h3>
          <p className="text-espresso/75 text-sm leading-relaxed">
            The restaurant welcomes outside guests for lunch and dinner. Please
            call ahead on <span className="whitespace-nowrap">+255 768 777 428</span>{" "}
            or <span className="whitespace-nowrap">+255 667 999 706</span>{" "}
            to reserve a table on busy evenings.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-cream/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-terracotta text-xs font-semibold tracking-[0.3em] uppercase">
              À la carte
            </span>
            <h2 className="mt-2 font-serif text-4xl italic text-espresso">
              This week at the kitchen
            </h2>
          </div>
          <div className="space-y-12">
            {MENU.map((section) => (
              <div key={section.course}>
                <h3 className="font-serif text-2xl text-terracotta mb-6 italic">
                  {section.course}
                </h3>
                <ul className="divide-y divide-espresso/10">
                  {section.dishes.map((d) => (
                    <li key={d.name} className="py-4">
                      <div className="font-medium text-espresso">{d.name}</div>
                      <div className="text-sm text-espresso/65 mt-1">{d.note}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <img
          src={barImg}
          alt="The bar at African Royal Villa"
          className="w-full h-[480px] object-cover"
          loading="lazy"
          width={1024}
          height={1024}
        />
        <div>
          <span className="text-terracotta text-xs font-semibold tracking-[0.3em] uppercase">
            The bar
          </span>
          <h2 className="mt-2 font-serif text-4xl italic text-espresso">
            A quiet drink after the drive
          </h2>
          <p className="mt-4 text-espresso/75 leading-relaxed">
            Low leather stools, a backlit shelf, and a fire in the hearth when
            the highland evenings turn cool. Come for a nightcap or settle in.
          </p>
          <ul className="mt-6 divide-y divide-espresso/10">
            {BAR.map((b) => (
              <li key={b.name} className="py-3">
                <div className="font-medium text-espresso">{b.name}</div>
                <div className="text-sm text-espresso/65">{b.note}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 bg-espresso text-cream text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-serif text-3xl italic">Add a meal plan to your stay</h2>
          <p className="text-cream/75">
            Half board and full board are available as add-ons in the booking flow.
          </p>
          <Link
            to="/rooms"
            className="inline-block mt-2 bg-terracotta text-cream px-6 py-3 text-sm font-medium hover:bg-cream hover:text-espresso transition-colors"
          >
            Book a stay
          </Link>
        </div>
      </section>
    </div>
  );
}