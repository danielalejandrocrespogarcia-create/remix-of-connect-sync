-- 1. Add trayecto + seccion to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trayecto TEXT,
ADD COLUMN IF NOT EXISTS seccion TEXT;

-- 2. Update handle_new_user to capture trayecto + seccion from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, session_group, trayecto, seccion)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'session_group', 'Sesion 1'),
    NEW.raw_user_meta_data->>'trayecto',
    NEW.raw_user_meta_data->>'seccion'
  );

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;

-- 3. ACTIVE CLASS table (one row per session)
CREATE TABLE IF NOT EXISTS public.active_class (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_group TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  teacher_name TEXT,
  classroom TEXT NOT NULL,
  schedule TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | suspended | upcoming
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.active_class ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active class"
  ON public.active_class FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can insert active class"
  ON public.active_class FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update active class"
  ON public.active_class FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER active_class_updated_at
  BEFORE UPDATE ON public.active_class
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_class;
ALTER TABLE public.active_class REPLICA IDENTITY FULL;

-- 4. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_group TEXT NOT NULL DEFAULT 'Sesion 1',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info', -- info | warning | urgent
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view announcements"
  ON public.announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = author_id);

CREATE POLICY "Teachers can delete their announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_announcements_session_created
  ON public.announcements (session_group, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- 5. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_group TEXT NOT NULL DEFAULT 'Sesion 1',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text | voice
  duration_seconds INTEGER, -- for voice
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all chat messages"
  ON public.chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can send their own messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_session_created
  ON public.chat_messages (session_group, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 6. Seed demo data for Sesion 1
INSERT INTO public.active_class (session_group, subject, teacher_name, classroom, schedule, status)
VALUES ('Sesion 1', 'Redes de Computadoras', 'Prof. Carlos Mendoza', 'Lab Redes - Aula 4', '08:00 - 10:00', 'active')
ON CONFLICT (session_group) DO NOTHING;