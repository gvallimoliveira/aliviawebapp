
UPDATE public.blog_posts
SET content_pt = REPLACE(content_pt, 'Inicie seu teste grátis de 14 dias no plano PRO da Aliv.iA agora e veja a diferença.', 'Conheça o plano PRO da Aliv.iA agora e veja a diferença.'),
    content_en = REPLACE(content_en, 'Start your 14-day free trial of the Aliv.iA PRO plan now and see the difference.', 'Discover the Aliv.iA PRO plan now and see the difference.')
WHERE id = '5d5eef88-1914-456e-9319-1d075e5b56b7';

UPDATE public.blog_posts
SET content_en = REPLACE(content_en, 'Discover how our assessment transforms your practice – click here for a 14-day free trial of the PRO plan!', 'Discover how our assessment transforms your practice – click here to explore the PRO plan!')
WHERE id = '4c6f2d6c-3f2c-49f3-add7-368305b1e169';
