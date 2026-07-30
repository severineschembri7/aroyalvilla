-- 1. Lock down SECURITY DEFINER functions from direct API execution
REVOKE ALL ON FUNCTION public.grant_admin_for_seed_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- has_role must remain callable by authenticated for RLS policy evaluation,
-- but it is read-only and only reveals role membership.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. Admin-only delete paths for PII / operational data
CREATE POLICY "Admins can delete guest details"
ON public.booking_guests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete room statuses"
ON public.room_statuses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT DELETE ON public.booking_guests TO authenticated;
GRANT DELETE ON public.room_statuses TO authenticated;

-- 3. Explicit admin-only role management on user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;