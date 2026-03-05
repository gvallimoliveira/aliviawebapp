

## Plano: Geração de Artigos com IA no Painel Admin do Blog

### Visão Geral

Adicionar botão "Gerar com IA" no formulário do blog que recebe tema e palavras-chave, envia para edge function que usa Lovable AI (Gemini 3 Flash) com prompt especializado em fisioterapia, SEO, gatilhos mentais e conversão para avaliação. O resultado preenche título, conteúdo, excerpt e tags automaticamente como rascunho editável.

### Edge Function: `generate-blog-article`

Nova edge function que recebe `{ topic, keywords[] }` e chama o Lovable AI Gateway com prompt de sistema especializado:

- Papel: redator de conteúdo de saúde/fisioterapia
- Instruções: linguagem simples e acessível, gatilhos mentais (urgência, autoridade, prova social), SEO com palavras-chave naturalmente distribuídas, CTA para avaliação Aliv.iA
- Output via tool calling estruturado: `{ title_pt, title_en, content_pt, content_en, excerpt_pt, excerpt_en, tags[] }`
- Modelo: `google/gemini-3-flash-preview`

```toml
[functions.generate-blog-article]
verify_jwt = false
```

### Frontend: BlogManagement.tsx

- Adicionar botão "✨ Gerar com IA" ao lado de "Novo Artigo"
- Ao clicar, abre mini-formulário com:
  - Input "Tema do artigo" (ex: "dor no ombro")
  - Input "Palavras-chave SEO" (separadas por vírgula)
  - Botão "Gerar Rascunho"
- Loading state com spinner durante geração
- Resultado preenche o formulário de edição existente (título, conteúdo, excerpt, tags, slug) como rascunho
- Admin pode revisar/editar antes de salvar

### Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-blog-article/index.ts` | Nova edge function com prompt especializado e tool calling |
| `supabase/config.toml` | Adicionar `[functions.generate-blog-article]` |
| `src/components/admin/BlogManagement.tsx` | Botão "Gerar com IA", mini-form de tema/keywords, integração com edge function |

