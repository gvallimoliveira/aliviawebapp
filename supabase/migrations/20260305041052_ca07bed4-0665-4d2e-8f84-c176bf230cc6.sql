
-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_pt text NOT NULL,
  title_en text,
  content_pt text NOT NULL,
  content_en text,
  excerpt_pt text,
  excerpt_en text,
  cover_image_url text,
  author_name text NOT NULL DEFAULT 'Aliv.iA',
  tags text[] DEFAULT '{}',
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (SEO)
CREATE POLICY "Anyone can read published posts"
  ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (published = true);

-- Admins can manage all posts
CREATE POLICY "Admins can manage all posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create blog-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Allow anyone to read blog images (public bucket)
CREATE POLICY "Anyone can read blog images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-images');

-- Admins can upload blog images
CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND is_admin(auth.uid()));

-- Admins can delete blog images
CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND is_admin(auth.uid()));
