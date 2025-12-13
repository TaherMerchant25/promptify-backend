-- Supabase Storage Bucket Setup for HTML Submissions
-- Run this in your Supabase SQL Editor

-- Create the storage bucket for HTML submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'html-submissions',
  'html-submissions',
  true,
  5242880, -- 5MB limit
  ARRAY['text/html']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to the bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'html-submissions');

-- Allow authenticated and anonymous users to upload
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'html-submissions');

-- Allow users to update their own files
CREATE POLICY "Allow public update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'html-submissions')
WITH CHECK (bucket_id = 'html-submissions');

-- Allow users to delete their own files
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'html-submissions');
