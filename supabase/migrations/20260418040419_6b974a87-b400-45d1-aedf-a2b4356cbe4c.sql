-- Add carnet_url to profiles
ALTER TABLE public.profiles
ADD COLUMN carnet_url TEXT;

-- Create private bucket for carnets
INSERT INTO storage.buckets (id, name, public)
VALUES ('carnets', 'carnets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for the carnets bucket
-- Files are stored under {user_id}/filename.ext
CREATE POLICY "Users can view their own carnet"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'carnets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own carnet"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'carnets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own carnet"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'carnets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own carnet"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'carnets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);