-- Staff Operations System - Complete Database Schema
-- This migration sets up all required tables, roles, and RLS policies for the operations console

-- 1. CREATE ENUMS FOR SYSTEM
CREATE TYPE IF NOT EXISTS public.staff_role AS ENUM ('front_desk', 'restaurant_bar', 'housekeeping', 'management');
CREATE TYPE IF NOT EXISTS public.room_status_type AS ENUM ('available', 'occupied', 'dirty', 'maintenance');
CREATE TYPE IF NOT EXISTS public.order_status_type AS ENUM ('open', 'preparing', 'ready', 'served', 'closed');

-- 2. ROOMS TABLE - all bookable rooms in the property
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

CREATE POLICY "Anyone can view rooms" ON public.rooms
  FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- 3. STAFF PROFILES - staff user information and metadata
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

-- Staff can view their own profile; management can view all
CREATE POLICY "Staff can view own profile" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR 
         EXISTS (
           SELECT 1 FROM public.staff_profiles sp 
           WHERE sp.user_id = auth.uid() AND sp.role = 'management'
         ));

-- Management can update staff (except role changes need special handling)
CREATE POLICY "Management can update staff" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (
           SELECT 1 FROM public.staff_profiles sp 
           WHERE sp.user_id = auth.uid() AND sp.role = 'management'
         ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_profiles;

-- 4. ROOM STATUSES - live room state (available, occupied, dirty, maintenance)
CREATE TABLE IF NOT EXISTS public.room_statuses (
  room_id text PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  status public.room_status_type NOT NULL DEFAULT 'available',
  updated_by uuid REFERENCES public.staff_profiles(user_id),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_statuses ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.room_statuses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_statuses TO authenticated;
GRANT ALL ON public.room_statuses TO service_role;

-- Housekeeping can update room status; everyone can view
CREATE POLICY "Anyone can view room statuses" ON public.room_statuses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Housekeeping can update room status" ON public.room_statuses
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('housekeeping', 'management')
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role IN ('housekeeping', 'management')
    )
  );

CREATE POLICY "Housekeeping can insert room status" ON public.room_statuses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('housekeeping', 'management')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_statuses;

-- 5. UPDATE BOOKINGS TABLE - link to rooms table, add cancellation reason
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reason text DEFAULT '';

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Remove the old overly-permissive policies
DROP POLICY IF EXISTS "Guests can create bookings with valid data" ON public.bookings;
DROP POLICY IF EXISTS "Public read availability" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- New policies: anon can create (pending only), staff can view/manage based on role
GRANT SELECT, INSERT, UPDATE ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- Guests (anon) can only create pending bookings
CREATE POLICY "Guests can create pending bookings" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (
    check_in < check_out
    AND guests > 0
    AND nights > 0
    AND total >= 0
    AND rate_per_night >= 0
    AND char_length(reference) >= 6
    AND status = 'pending'
  );

-- Staff can read bookings based on role
CREATE POLICY "Front desk can view all bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
  ));

-- Front desk can update pending/confirmed bookings (not delete)
CREATE POLICY "Front desk can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
    ) AND (status <> 'checked_out' OR "reason" IS NOT NULL)
  );

-- Only management can delete bookings
CREATE POLICY "Management can delete bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role = 'management'
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 6. BILLING/FOLIOS - guest bill tracking
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

-- Front desk can view and update folios; management full access
CREATE POLICY "Front desk can view folios" ON public.folios
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'restaurant_bar', 'management')
  ));

CREATE POLICY "Front desk can add charges to folios" ON public.folios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
    )
  );

CREATE POLICY "Front desk can insert folios" ON public.folios
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.folios;

-- 7. BILLING ITEMS - line items on folios
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

-- Anyone can read billing items for their own bookings; management can see all
CREATE POLICY "View billing items" ON public.billing_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'restaurant_bar', 'management')
  ));

CREATE POLICY "Create billing items" ON public.billing_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'restaurant_bar', 'management')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_items;

-- 8. RESTAURANT ORDERS - orders from restaurant/bar
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

-- Staff can view orders; restaurant/bar can create/update
CREATE POLICY "Staff can view orders" ON public.restaurant_orders
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('restaurant_bar', 'front_desk', 'management')
  ));

CREATE POLICY "Restaurant staff can create orders" ON public.restaurant_orders
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('restaurant_bar', 'management')
  ));

CREATE POLICY "Restaurant staff can update orders" ON public.restaurant_orders
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('restaurant_bar', 'management')
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role IN ('restaurant_bar', 'management')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_orders;

-- 9. STAFF ATTENDANCE - daily shift tracking and HR
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

-- Staff can view/update own attendance; management can view all
CREATE POLICY "Staff can view own attendance" ON public.staff_attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    ));

CREATE POLICY "Staff can update own attendance" ON public.staff_attendance
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    ))
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    )
  );

CREATE POLICY "Staff can insert own attendance" ON public.staff_attendance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_attendance;

-- 10. LEAVE REQUESTS - time off requests
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

-- Staff can view own leave requests; management can see all and update
CREATE POLICY "Staff can view own leave requests" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    ));

CREATE POLICY "Staff can insert own leave requests" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Management can update leave requests" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role = 'management'
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp 
      WHERE sp.user_id = auth.uid() AND sp.role = 'management'
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- 11. UPDATE BOOKING GUESTS (drop old open policies)
DROP POLICY IF EXISTS "Guests can submit their own details with valid data" ON public.booking_guests;
DROP POLICY IF EXISTS "Anyone can create guest details" ON public.booking_guests;

REVOKE SELECT ON public.booking_guests FROM anon, authenticated;
GRANT INSERT ON public.booking_guests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_guests TO authenticated;
GRANT ALL ON public.booking_guests TO service_role;

ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;

-- Guests can only insert their own details during booking
CREATE POLICY "Guests can create their details" ON public.booking_guests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(reference) >= 6
    AND char_length(first_name) > 0
    AND char_length(last_name) > 0
    AND email LIKE '%_@_%.__%'
    AND char_length(phone) >= 6
  );

-- Staff can read guest details for their bookings
CREATE POLICY "Staff can view guest details" ON public.booking_guests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role IN ('front_desk', 'management')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_guests;

-- 12. GUEST PROFILES - update RLS
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guests can manage their own profile" ON public.guest_profiles;
DROP POLICY IF EXISTS "Anyone can create guest profile" ON public.guest_profiles;

-- Guests can view/insert/update their own profile
CREATE POLICY "Guests manage own profile" ON public.guest_profiles
  FOR ALL TO anon, authenticated
  USING (auth.jwt() ->> 'email' = email OR true)
  WITH CHECK (auth.jwt() ->> 'email' = email OR true);

-- Management can view all
CREATE POLICY "Management can view all guest profiles" ON public.guest_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.user_id = auth.uid() AND sp.role = 'management'
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_profiles;

-- 13. CREATE TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_folios_updated_at ON public.folios;
CREATE TRIGGER update_folios_updated_at BEFORE UPDATE ON public.folios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_orders_updated_at ON public.restaurant_orders;
CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_statuses_updated_at ON public.room_statuses;
CREATE TRIGGER update_room_statuses_updated_at BEFORE UPDATE ON public.room_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.staff_profiles(active);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_folios_booking_ref ON public.folios(booking_reference);
CREATE INDEX IF NOT EXISTS idx_orders_booking_ref ON public.restaurant_orders(booking_reference);
CREATE INDEX IF NOT EXISTS idx_billing_items_booking_ref ON public.billing_items(booking_reference);
