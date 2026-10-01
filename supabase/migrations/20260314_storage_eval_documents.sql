-- Storage setup for the `eval_documents` bucket.
--
-- The application uploads scanned answer scripts, question papers and marking
-- schemes to this bucket and serves them to the evaluator canvas through
-- 1-hour signed URLs, so the bucket stays private. Uploads and management are
-- limited to admin and teacher accounts; any authenticated user may read so
-- evaluators can request signed URLs for their assigned scripts.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'eval_documents',
  'eval_documents',
  false,
  26214400, -- 25 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can read eval documents" ON storage.objects;
CREATE POLICY "Authenticated users can read eval documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'eval_documents');

DROP POLICY IF EXISTS "Staff can upload eval documents" ON storage.objects;
CREATE POLICY "Staff can upload eval documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'eval_documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Staff can update eval documents" ON storage.objects;
CREATE POLICY "Staff can update eval documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'eval_documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Staff can delete eval documents" ON storage.objects;
CREATE POLICY "Staff can delete eval documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'eval_documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );
