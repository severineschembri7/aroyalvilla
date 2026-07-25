const BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE IF NOT EXISTS public.booking_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled');
CREATE TYPE IF NOT EXISTS public.staff_role AS ENUM ('front_desk', 'restaurant_bar', 'housekeeping', 'management');
CREATE TYPE IF NOT EXISTS public.room_status_type AS ENUM ('available', 'occupied', 'dirty', 'maintenance');
CREATE TYPE IF NOT EXISTS public.order_status_type AS ENUM ('open', 'preparing', 'ready', 'served', 'closed');

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  max_guests int NOT NULL CHECK (max_guests > 0),
  rate_per_night numeric NOT NULL CHECK (rate_per_night >= 0),
  amenities text[] DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'Anyone can view rooms') THEN
    CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
  END IF;
END $$;

-- STAFF PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role public.staff_role NOT NULL,
  department text NOT NULL,
  phone text,
  active boolean DEFAULT true,
  hire_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_profiles' AND policyname = 'Staff can view own profile') THEN
    CREATE POLICY "Staff can view own profile" ON public.staff_profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id OR 
             EXISTS (
               SELECT 1 FROM public.staff_profiles sp 
               WHERE sp.user_id = auth.uid() AND sp.role = 'management'
             ));
  END IF;
END $$;

-- ROOM STATUSES TABLE
CREATE TABLE IF NOT EXISTS public.room_statuses (
  room_id text PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  status public.room_status_type NOT NULL DEFAULT 'available',
  updated_by uuid REFERENCES public.staff_profiles(user_id),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_statuses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.room_statuses TO authenticated;
GRANT ALL ON public.room_statuses TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'room_statuses' AND policyname = 'Anyone can view room statuses') THEN
    CREATE POLICY "Anyone can view room statuses" ON public.room_statuses FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- BOOKINGS TABLE (updated)
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
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_room_date_exclusion') THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_room_date_exclusion EXCLUDE USING gist (
      room_id WITH =,
      daterange(check_in, check_out, '[)') WITH &&
    ) WHERE (status <> 'cancelled');
  END IF;
END $$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO anon, authenticated;
GRANT ALL ON public.bookings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Guests can create pending bookings') THEN
    CREATE POLICY "Guests can create pending bookings" ON public.bookings
      FOR INSERT TO anon WITH CHECK (
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Front desk can view bookings') THEN
    CREATE POLICY "Front desk can view bookings" ON public.bookings
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.staff_profiles sp 
        WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
      ));
  END IF;
END $$;

-- BOOKING GUESTS TABLE
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
GRANT INSERT ON public.booking_guests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_guests TO authenticated;
GRANT ALL ON public.booking_guests TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_guests' AND policyname = 'Guests can create their details') THEN
    CREATE POLICY "Guests can create their details" ON public.booking_guests
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        char_length(reference) >= 6
        AND char_length(first_name) > 0
        AND char_length(last_name) > 0
        AND email LIKE '%_@_%.__%'
        AND char_length(phone) >= 6
      );
  END IF;
END $$;

-- GUEST PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.guest_profiles (
  email text PRIMARY KEY,
  phone text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.guest_profiles TO anon, authenticated;
GRANT ALL ON public.guest_profiles TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guest_profiles' AND policyname = 'Guests manage own profile') THEN
    CREATE POLICY "Guests manage own profile" ON public.guest_profiles
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- FOLIOS TABLE
CREATE TABLE IF NOT EXISTS public.folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL REFERENCES public.bookings(reference) ON DELETE CASCADE,
  guest_name text NOT NULL,
  room_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total_due numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.folios ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.folios TO authenticated;
GRANT ALL ON public.folios TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folios' AND policyname = 'Front desk can view folios') THEN
    CREATE POLICY "Front desk can view folios" ON public.folios
      FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.staff_profiles sp 
        WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'restaurant_bar', 'management')
      ));
  END IF;
END $$;

-- BILLING ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.billing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id uuid REFERENCES public.folios(id) ON DELETE CASCADE,
  booking_reference text NOT NULL REFERENCES public.bookings(reference) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.billing_items TO authenticated;
GRANT ALL ON public.billing_items TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_items' AND policyname = 'View billing items') THEN
    CREATE POLICY "View billing items" ON public.billing_items
      FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.staff_profiles sp 
        WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'restaurant_bar', 'management')
      ));
  END IF;
END $$;

-- RESTAURANT ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text NOT NULL REFERENCES public.bookings(reference) ON DELETE CASCADE,
  table_number int,
  guest_name text NOT NULL,
  items text[] NOT NULL DEFAULT '{}',
  status public.order_status_type NOT NULL DEFAULT 'open',
  kind text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.staff_profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.restaurant_orders TO authenticated;
GRANT ALL ON public.restaurant_orders TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_orders' AND policyname = 'Staff can view orders') THEN
    CREATE POLICY "Staff can view orders" ON public.restaurant_orders
      FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.staff_profiles sp 
        WHERE sp.user_id = auth.uid() AND sp.role IN ('restaurant_bar', 'front_desk', 'management')
      ));
  END IF;
END $$;

-- STAFF ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  shift_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;
GRANT ALL ON public.staff_attendance TO service_role;

-- LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.staff_profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;

-- CREATE TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_folios_updated_at ON public.folios;
CREATE TRIGGER update_folios_updated_at BEFORE UPDATE ON public.folios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_orders_updated_at ON public.restaurant_orders;
CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.staff_profiles(active);
CREATE INDEX IF NOT EXISTS idx_folios_booking_ref ON public.folios(booking_reference);
CREATE INDEX IF NOT EXISTS idx_orders_booking_ref ON public.restaurant_orders(booking_reference);
CREATE INDEX IF NOT EXISTS idx_billing_items_booking_ref ON public.billing_items(booking_reference);
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
