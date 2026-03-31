
INSERT INTO storage.buckets (id, name, public) VALUES ('assessment-reports', 'assessment-reports', true);

CREATE POLICY "Anyone can read assessment reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assessment-reports');

CREATE POLICY "Anyone can upload assessment reports"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assessment-reports');
