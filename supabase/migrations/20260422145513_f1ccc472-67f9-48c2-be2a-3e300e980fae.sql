-- Schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_group text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  classroom text,
  teacher_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view schedules"
ON public.schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can insert schedules"
ON public.schedules FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can update schedules"
ON public.schedules FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can delete schedules"
ON public.schedules FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Announcements scope
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'section';

DROP POLICY IF EXISTS "Teachers can create announcements" ON public.announcements;
CREATE POLICY "Teachers and admins can create announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Teachers can delete their announcements" ON public.announcements;
CREATE POLICY "Authors can delete their announcements"
ON public.announcements FOR DELETE TO authenticated
USING (
  auth.uid() = author_id AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Active class admin support
DROP POLICY IF EXISTS "Teachers can insert active class" ON public.active_class;
DROP POLICY IF EXISTS "Teachers can update active class" ON public.active_class;

CREATE POLICY "Teachers and admins can insert active class"
ON public.active_class FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can update active class"
ON public.active_class FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user to honor admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _sections text[];
  _subjects text[];
  _session text;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  _session := COALESCE(NEW.raw_user_meta_data->>'session_group', 'Sesion 1');

  IF _role = 'teacher' OR _role = 'admin' THEN
    _sections := COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE((NEW.raw_user_meta_data->'sections')::jsonb, '[]'::jsonb))),
      ARRAY[_session]
    );
    _subjects := COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(COALESCE((NEW.raw_user_meta_data->'subjects')::jsonb, '[]'::jsonb))),
      '{}'::text[]
    );
    IF array_length(_sections, 1) IS NULL THEN
      _sections := ARRAY[_session];
    END IF;
  ELSE
    _sections := '{}'::text[];
    _subjects := '{}'::text[];
  END IF;

  INSERT INTO public.profiles (user_id, full_name, session_group, trayecto, seccion, subjects, sections, active_section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    _session,
    NEW.raw_user_meta_data->>'trayecto',
    NEW.raw_user_meta_data->>'seccion',
    _subjects,
    _sections,
    CASE WHEN _role = 'teacher' OR _role = 'admin' THEN _sections[1] ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;