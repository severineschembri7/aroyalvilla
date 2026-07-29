import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/channels")({ ssr: false, component: Channels });
const CHANNELS = [
  { name: "Booking.com", status: "not_connected", note: "OAuth XML feed ready to configure." },
  { name: "Expedia", status: "not_connected", note: "Requires partner API credentials." },
  { name: "Airbnb", status: "not_connected", note: "Available for Family Villa listings." },
  { name: "Direct (Website)", status: "connected", note: "This dashboard receives every direct reservation in real time." },
];
function Channels() {
  return (<div className="space-y-4">
    <div><h1 className="font-serif text-2xl">Channel Sync</h1>
      <p className="text-sm text-espresso/60">Connect OTAs to sync inventory. Direct bookings sync automatically.</p></div>
    <div className="grid gap-3 md:grid-cols-2">{CHANNELS.map((c) => (
      <div key={c.name} className="rounded-lg border border-espresso/10 bg-white p-4">
        <div className="flex items-baseline justify-between"><p className="font-serif text-lg">{c.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs uppercase ${c.status === "connected" ? "bg-sage/40 text-espresso" : "bg-espresso/10 text-espresso/70"}`}>
            {c.status === "connected" ? "Connected" : "Not connected"}</span></div>
        <p className="mt-2 text-sm text-espresso/70">{c.note}</p>
        {c.status !== "connected" && (<button disabled className="mt-3 rounded border border-espresso/20 px-3 py-1 text-xs text-espresso/50">Connect (coming soon)</button>)}
      </div>))}</div>
  </div>);
}
