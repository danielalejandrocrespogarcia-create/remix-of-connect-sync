ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subjects text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sections text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS active_section text;

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

  IF _role = 'teacher' THEN
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
    CASE WHEN _role = 'teacher' THEN _sections[1] ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;