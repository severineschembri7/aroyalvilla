import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/channels")({
  component: ChannelsView,
});

type Channel = {
  id: string;
  name: string;
  connected: boolean;
  lastSync: string;
  bookings: number;
  commission: string;
};

const initial: Channel[] = [
  { id: "direct", name: "Direct Website", connected: true, lastSync: "Live", bookings: 42, commission: "0%" },
  { id: "bcom", name: "Booking.com", connected: true, lastSync: "8 min ago", bookings: 61, commission: "15%" },
  { id: "expedia", name: "Expedia", connected: true, lastSync: "22 min ago", bookings: 28, commission: "18%" },
  { id: "airbnb", name: "Airbnb", connected: false, lastSync: "—", bookings: 0, commission: "14%" },
  { id: "hotelbeds", name: "HotelBeds", connected: false, lastSync: "—", bookings: 0, commission: "20%" },
  { id: "agoda", name: "Agoda", connected: false, lastSync: "—", bookings: 0, commission: "17%" },
];

function ChannelsView() {
  const [channels, setChannels] = useState(initial);
  const [syncing, setSyncing] = useState(false);

  const syncAll = () => {
    setSyncing(true);
    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) => (c.connected ? { ...c, lastSync: "Just now" } : c)),
      );
      setSyncing(false);
    }, 900);
  };

  const toggle = (id: string) =>
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, connected: !c.connected, lastSync: !c.connected ? "Just now" : "—" }
          : c,
      ),
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl">Channel manager</h2>
          <p className="text-xs text-espresso/50">
            Two-way sync placeholder · rates &amp; inventory push across OTAs
          </p>
        </div>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="bg-espresso text-cream text-xs px-4 py-2 hover:bg-terracotta transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync all channels"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((c) => (
          <div
            key={c.id}
            className={`bg-white border p-5 ${
              c.connected ? "border-espresso/10" : "border-dashed border-espresso/20"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-serif text-lg">{c.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-espresso/40 mt-1">
                  {c.connected ? (
                    <span className="text-sage">● Connected</span>
                  ) : (
                    <span className="text-espresso/40">○ Not connected</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggle(c.id)}
                className={`text-[10px] uppercase tracking-widest px-3 py-1 ${
                  c.connected
                    ? "border border-espresso/20 text-espresso hover:bg-espresso hover:text-cream"
                    : "bg-terracotta text-cream hover:bg-espresso"
                }`}
              >
                {c.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-espresso/40">Last sync</dt>
                <dd>{c.lastSync}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-espresso/40">Bookings</dt>
                <dd>{c.bookings}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-espresso/40">Comm.</dt>
                <dd>{c.commission}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="bg-sage/20 border border-sage/40 p-5 text-sm text-espresso/80">
        <strong className="font-serif">Placeholder integration.</strong> Live channel sync will
        connect to SiteMinder, Cloudbeds or a direct OTA API. Wire the underlying inventory writes
        into the Reservations model when moving to production.
      </div>
    </div>
  );
}