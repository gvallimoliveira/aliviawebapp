## Plano: Blog Integrado com Painel Admin

### Visao Geral

Blog acessivel em `/blog` e `/blog/:slug`, com painel de criacao/edicao no admin (`/admin`). Artigos otimizados para SEO com meta tags, URLs amigaveis e conteudo indexavel pelo Google.

a landing page tb deve ser otimizada para SEO. fundamental performar bem no google. 

### Database

Nova tabela `blog_posts`:

```sql
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

-- Qualquer pessoa pode ler posts publicados (SEO)
CREATE POLICY "Anyone can read published posts"
  ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (published = true);

-- Admins podem CRUD completo
CREATE POLICY "Admins can manage all posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

### Storage

Criar bucket `blog-images` para upload de imagens de capa dos artigos.

### Arquivos novos


| Arquivo                                   | Descricao                                                                                                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Blog.tsx`                      | Listagem de posts com cards (titulo, excerpt, data, tags). Link no header/footer.                                                                                                                     |
| `src/pages/BlogPost.tsx`                  | Pagina individual do artigo com SEO meta tags via `document.title` e meta description. Renderiza markdown/HTML do conteudo.                                                                           |
| `src/components/admin/BlogManagement.tsx` | Componente dentro do Admin: lista posts, botao criar/editar, formulario com campos titulo, slug (auto-gerado), conteudo (textarea), excerpt, tags, imagem de capa, toggle publicado. Suporta PT e EN. |


### Arquivos editados


| Arquivo                            | Mudanca                                |
| ---------------------------------- | -------------------------------------- |
| `src/App.tsx`                      | Rotas `/blog` e `/blog/:slug`          |
| `src/pages/Admin.tsx`              | Importar e renderizar `BlogManagement` |
| `src/components/Header.tsx`        | Link "Blog" na nav                     |
| `src/components/Footer.tsx`        | Link "Blog" no footer                  |
| `src/contexts/LanguageContext.tsx` | Traducoes para blog                    |


### SEO

- Cada post define `document.title` e injeta `<meta name="description">` dinamicamente
- URLs amigaveis: `/blog/dor-no-ombro-quando-procurar-medico`
- Posts publicados sao acessiveis sem autenticacao (policy `anon` SELECT)
- Adicionar `/blog` ao `robots.txt` (ja permite tudo)

### Painel Admin - Funcionalidades

- Listar todos os posts (rascunhos + publicados) com status badge
- Criar novo post com formulario completo
- Editar post existente
- Toggle publicar/despublicar
- Deletar post
- Upload de imagem de capa para storage
- Auto-gerar slug a partir do titulo