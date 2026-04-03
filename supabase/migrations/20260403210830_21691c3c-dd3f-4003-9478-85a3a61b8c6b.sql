
CREATE TABLE public.pain_map_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  view_name TEXT NOT NULL UNIQUE,
  regions JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.pain_map_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pain_map_paths"
ON public.pain_map_paths
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read pain_map_paths"
ON public.pain_map_paths
FOR SELECT
TO anon, authenticated
USING (true);
