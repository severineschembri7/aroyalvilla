import { useState } from "react";

const DEST = { lat: -3.365532, lon: 35.672269 };
type Mode = "driving" | "walking";

type Result = { duration: number; distance: number } | null;

export function DirectionsWidget() {
  const [mode, setMode] = useState<Mode>("driving");
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = async (from: { lat: number; lon: number }, m: Mode) => {
    setLoading(true);
    setError(null);
    try {
      const profile = m === "driving" ? "driving" : "foot";
      const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lon},${from.lat};${DEST.lon},${DEST.lat}?overview=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Route lookup failed");
      const data = await res.json();
      const r = data.routes?.[0];
      if (!r) throw new Error("No route found");
      setResult({ duration: r.duration, distance: r.distance });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Route lookup failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setOrigin(from);
        fetchRoute(from, mode);
      },
      (err) => {
        setLoading(false);
        setError(err.message || "Could not access your location");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    if (origin) fetchRoute(origin, m);
  };

  const formatDuration = (s: number) => {
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  };

  const formatDistance = (m: number) =>
    m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${DEST.lat},${DEST.lon}&travelmode=${mode === "driving" ? "driving" : "walking"}${origin ? `&origin=${origin.lat},${origin.lon}` : ""}`;

  return (
    <div className="p-6 bg-cream rounded-2xl border border-espresso/10">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs uppercase tracking-widest text-espresso/40">
          Travel time from you
        </div>
        <div className="flex gap-1 bg-espresso/5 p-1 rounded-full">
          {(["driving", "walking"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full transition-colors ${
                mode === m
                  ? "bg-terracotta text-cream"
                  : "text-espresso/60 hover:text-espresso"
              }`}
            >
              {m === "driving" ? "Car" : "Walk"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {!origin && !loading && !error && (
          <button
            type="button"
            onClick={locate}
            className="w-full bg-espresso text-cream px-6 py-3 text-sm font-medium hover:bg-terracotta transition-colors"
          >
            Use my location
          </button>
        )}

        {loading && (
          <div className="text-sm text-espresso/60 italic">Calculating route…</div>
        )}

        {error && !loading && (
          <div className="space-y-3">
            <div className="text-sm text-terracotta">{error}</div>
            <button
              type="button"
              onClick={locate}
              className="text-xs uppercase tracking-widest font-semibold text-espresso hover:text-terracotta"
            >
              Try again →
            </button>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-serif text-3xl text-terracotta">
                  {formatDuration(result.duration)}
                </div>
                <div className="text-xs uppercase tracking-widest text-espresso/50 mt-1">
                  Estimated {mode === "driving" ? "drive" : "walk"}
                </div>
              </div>
              <div>
                <div className="font-serif text-3xl text-espresso">
                  {formatDistance(result.distance)}
                </div>
                <div className="text-xs uppercase tracking-widest text-espresso/50 mt-1">
                  Distance
                </div>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs uppercase tracking-widest font-semibold text-terracotta hover:text-espresso"
            >
              Start navigation →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}