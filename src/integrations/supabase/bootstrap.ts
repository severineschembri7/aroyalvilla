const BOOTSTRAP_SQL = `
CREATE TYPE IF NOT EXISTS public.booking_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled');

CREATE TABLE IF NOT EXISTS public.bookings (
  reference text PRIMARY KEY,
  room_id text NOT NULL,
  room_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL,
  nights int NOT NULL,
  rate_per_night numeric NOT NULL,
  addons text[] NOT NULL DEFAULT '{}',
  total numeric NOT NULL,
  payment_method text NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Guests can create bookings with valid data'
  ) THEN
    CREATE POLICY "Guests can create bookings with valid data"
      ON public.bookings
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        check_in < check_out
        AND guests > 0
        AND nights > 0
        AND total >= 0
        AND rate_per_night >= 0
        AND char_length(reference) >= 6
        AND status = 'pending'
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.booking_guests (
  reference text PRIMARY KEY REFERENCES public.bookings(reference) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  country text,
  requests text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.booking_guests TO anon;
GRANT INSERT ON public.booking_guests TO authenticated;
GRANT ALL ON public.booking_guests TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'booking_guests' AND policyname = 'Guests can submit their own details with valid data'
  ) THEN
    CREATE POLICY "Guests can submit their own details with valid data"
      ON public.booking_guests
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        char_length(reference) >= 6
        AND char_length(first_name) > 0
        AND char_length(last_name) > 0
        AND email LIKE '%_@_%.__%'
        AND char_length(phone) >= 6
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.guest_profiles (
  email text PRIMARY KEY,
  phone text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.guest_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.guest_profiles TO authenticated;
GRANT ALL ON public.guest_profiles TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'guest_profiles' AND policyname = 'Guests can manage their own profile'
  ) THEN
    CREATE POLICY "Guests can manage their own profile"
      ON public.guest_profiles
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
`;

let bootstrapPromise: Promise<void> | null = null;

export async function ensureSupabaseSchema() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    if (typeof window !== "undefined") return;

    const projectId = process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN;

    if (!projectId || !accessToken) {
      return;
    }

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: BOOTSTRAP_SQL }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[Supabase] schema bootstrap skipped: ${response.status} ${response.statusText} ${text}`);
    }
  })();

  return bootstrapPromise;
}
