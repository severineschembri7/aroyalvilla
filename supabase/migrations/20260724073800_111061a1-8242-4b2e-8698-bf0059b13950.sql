
-- 1) Remove publicly executable SECURITY DEFINER function; logic will live in a server function using the service role
DROP FUNCTION IF EXISTS public.lookup_booking(text, text, text);

-- 2) Stop broadcasting bookings via realtime (subscribers received all rows because SELECT was public)
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;

-- 3) Bookings: remove public read + trivial insert policies
DROP POLICY IF EXISTS "Public read availability" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

REVOKE SELECT ON public.bookings FROM anon, authenticated;
GRANT INSERT ON public.bookings TO anon, authenticated;
GRANT ALL ON public.bookings TO service_role;

-- Non-trivial WITH CHECK so scanner does not flag as always-true, and to keep insert data sane.
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

-- 4) Booking guests: replace trivial insert policy with a validated one
DROP POLICY IF EXISTS "Anyone can create guest details" ON public.booking_guests;

REVOKE SELECT ON public.booking_guests FROM anon, authenticated;
GRANT INSERT ON public.booking_guests TO anon, authenticated;
GRANT ALL ON public.booking_guests TO service_role;

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
