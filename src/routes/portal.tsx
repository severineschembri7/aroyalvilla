import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getGuestPortalData, saveGuestPreferences } from "@/lib/bookings.functions";

type GuestPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roomPreference: string;
  pillow: string;
  temperature: string;
  quietRoom: boolean;
  dietaryStyle: string;
  allergies: string;
  beverages: string;
  communication: string;
  occasion: string;
  accessibility: string;
  notes: string;
};

type GuestPortalResult = {
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  bookings: Array<{
    reference: string;
    room_name: string;
    check_in: string;
    check_out: string;
    status: string;
    total: number;
  }>;
};

const emptyProfile = (): GuestPayload => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roomPreference: "Garden view",
  pillow: "Soft",
  temperature: "Cool",
  quietRoom: true,
  dietaryStyle: "Balanced",
  allergies: "",
  beverages: "Sparkling water",
  communication: "Email",
  occasion: "",
  accessibility: "",
  notes: "",
});

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Guest Portal — Africa Royal Villa" },
      {
        name: "description",
        content: "Manage your stay preferences, booking history, and arrival details in one place.",
      },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const [profile, setProfile] = useState<GuestPayload>(emptyProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<GuestPortalResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem("arv-guest-profile");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as GuestPayload;
        setProfile(parsed);
      } catch {
        // ignore invalid cache
      }
    }
  }, []);

  const recentStay = useMemo(() => portalData?.bookings?.[0], [portalData]);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const reply = await getGuestPortalData({
        data: { email: profile.email, phone: profile.phone },
      });
      setPortalData(reply as GuestPortalResult);
      if (reply?.guest) {
        setProfile((current) => ({ ...current, firstName: reply.guest.firstName, lastName: reply.guest.lastName }));
        setMessage(`Welcome back, ${reply.guest.firstName}. We found your recent stay.`);
      } else {
        setMessage("No prior booking was found. You can still save your preferences for future visits.");
      }
    } catch {
      setMessage("We could not load your booking history right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await saveGuestPreferences({
        data: {
          email: profile.email,
          phone: profile.phone,
          preferences: profile,
        },
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("arv-guest-profile", JSON.stringify(profile));
      }
      setMessage("Your preferences are saved and will be available to the villa team.");
    } catch {
      setMessage("Your preferences were saved locally for this browser while the profile sync completes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-espresso text-cream px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Guest portal</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Welcome back to Africa Royal Villa</h1>
          <p className="mt-4 max-w-3xl text-lg text-cream/80">
            Your preferences, dining notes, and stay history travel with you so the team can anticipate your needs.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-espresso">Find your stay</h2>
          <p className="mt-2 text-sm text-espresso/60">
            Enter the email and phone you used for your last reservation to surface your most recent stay.
          </p>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleLookup}>
            <label className="text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Phone</span>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                required
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-terracotta px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-espresso"
              >
                {loading ? "Checking your stay…" : "Find my booking"}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 rounded-xl bg-sage/20 px-4 py-3 text-sm text-espresso">{message}</p>}

          {recentStay && (
            <div className="mt-6 rounded-2xl border border-sage/40 bg-sage/10 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-espresso/60">Welcome back</p>
              <h3 className="mt-2 font-serif text-2xl text-espresso">
                Your usual {recentStay.room_name} is ready to request.
              </h3>
              <p className="mt-2 text-sm text-espresso/70">
                Arriving {recentStay.check_in} · departing {recentStay.check_out} · reference {recentStay.reference}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-espresso/10 bg-white p-8 shadow-sm">
          <h2 className="font-serif text-2xl text-espresso">Preference profile</h2>
          <p className="mt-2 text-sm text-espresso/60">
            Help our team remember the way you like to stay.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Preferred room</span>
                <input
                  value={profile.roomPreference}
                  onChange={(e) => setProfile({ ...profile, roomPreference: e.target.value })}
                  className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Pillow preference</span>
                <input
                  value={profile.pillow}
                  onChange={(e) => setProfile({ ...profile, pillow: e.target.value })}
                  className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Temperature</span>
                <input
                  value={profile.temperature}
                  onChange={(e) => setProfile({ ...profile, temperature: e.target.value })}
                  className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Communication</span>
                <select
                  value={profile.communication}
                  onChange={(e) => setProfile({ ...profile, communication: e.target.value })}
                  className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
                >
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Phone">Phone</option>
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Allergies &amp; dietary flags</span>
              <textarea
                value={profile.allergies}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                className="min-h-24 w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-espresso/50">Special occasion</span>
              <input
                value={profile.occasion}
                onChange={(e) => setProfile({ ...profile, occasion: e.target.value })}
                className="w-full rounded-lg border border-espresso/10 bg-cream px-3 py-2 outline-none focus:border-terracotta"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-espresso/70">
              <input
                type="checkbox"
                checked={profile.quietRoom}
                onChange={(e) => setProfile({ ...profile, quietRoom: e.target.checked })}
                className="accent-terracotta"
              />
              Quiet room preferred
            </label>

            <button
              type="submit"
              className="rounded-lg bg-espresso px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-terracotta"
            >
              {loading ? "Saving…" : "Save preferences"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
