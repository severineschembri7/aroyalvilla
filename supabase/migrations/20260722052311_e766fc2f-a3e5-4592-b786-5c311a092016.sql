
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled');

CREATE TABLE public.bookings (
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

GRANT SELECT, INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public read availability" ON public.bookings
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX bookings_room_dates_idx ON public.bookings (room_id, check_in, check_out);

CREATE TABLE public.booking_guests (
  reference text PRIMARY KEY REFERENCES public.bookings(reference) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  country text,
  requests text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.booking_guests TO anon;
GRANT INSERT ON public.booking_guests TO authenticated;
GRANT ALL ON public.booking_guests TO service_role;

ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create guest details" ON public.booking_guests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.lookup_booking(_reference text, _email text, _phone text)
RETURNS TABLE (
  reference text,
  room_id text,
  room_name text,
  check_in date,
  check_out date,
  guests int,
  nights int,
  rate_per_night numeric,
  addons text[],
  total numeric,
  payment_method text,
  status public.booking_status,
  created_at timestamptz,
  updated_at timestamptz,
  first_name text,
  last_name text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.reference, b.room_id, b.room_name, b.check_in, b.check_out, b.guests, b.nights,
         b.rate_per_night, b.addons, b.total, b.payment_method, b.status, b.created_at, b.updated_at,
         g.first_name, g.last_name, g.email, g.phone
  FROM public.bookings b
  JOIN public.booking_guests g ON g.reference = b.reference
  WHERE upper(b.reference) = upper(trim(_reference))
    AND lower(g.email) = lower(trim(_email))
    AND regexp_replace(g.phone, '\D', '', 'g') = regexp_replace(coalesce(_phone,''), '\D', '', 'g');
$$;

GRANT EXECUTE ON FUNCTION public.lookup_booking(text,text,text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
