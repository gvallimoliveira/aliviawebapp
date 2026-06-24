## Problema

Hoje a função `verifyArticle` em `supabase/functions/agent-knowledge/index.ts` confirma um artigo se o DOI **existe** no PubMed/Crossref — mas **não compara o título** retornado com o título proposto pela IA. Resultado: a IA pode alucinar um DOI que casualmente resolve para outro artigo real (ex.: link de "laser de baixa intensidade" cair em paper de ultrassom terapêutico) e o sistema marca como verificado e aprovado.

Existem 66 artigos aprovados e 90 totais — todos potencialmente afetados, principalmente os ingeridos via "DOI sem PMID" (rota `crossref_doi`, que sequer compara título).

## Objetivo

Tornar a validação por título **obrigatória e bloqueante** em toda inclusão, e revalidar 100% da base aprovada agora — preservando como fonte canônica o **PMID** (mais estável que DOI).

---

## Mudanças

### 1. Schema — `knowledge_articles`
Adicionar coluna `pmid text` (nullable, indexada). DOI continua existindo; PMID passa a ser preferido como link de validação quando disponível.

### 2. Endurecer `verifyArticle` (agent-knowledge/index.ts)
Trocar a lógica "DOI existe = válido" por **validação cruzada de título** em todas as rotas:

```text
1. Se DOI fornecido:
   a) esearch pubmed por [doi] → pega PMID → esummary → compara título (sim ≥ 0.6)
      ✓ match → verified {pmid, doi}
      ✗ mismatch → loga conflito e CAI no passo 2 (não aceita o DOI)
   b) Se não achou PMID, Crossref → exige título Crossref com sim ≥ 0.6
      ✗ mismatch → descarta DOI e cai no passo 2
2. Se PMID fornecido: esummary → exige sim ≥ 0.6 (já existe, manter)
3. Busca por título: já exige sim ≥ 0.7 (manter)
4. Nenhum casou → verified=false
```

Quando o DOI fornecido pela IA não bate com o título, mas a busca por título encontra o paper correto, **sobrescrevemos o DOI** com o que veio do PubMed/Crossref. Nunca aceitamos um par (título, DOI) inconsistente.

Persistir `pmid` retornado em todas as inserções; `source_url` passa a ser sempre o PubMed (`/pubmed/{pmid}/`) quando houver PMID, com DOI apenas como fallback.

### 3. Ingest (`action: "ingest"`)
- Já chama `verifyArticle`; com a mudança acima, candidatos com par título×DOI inconsistente são automaticamente rejeitados (incrementam `rejectedUnverified`).
- Gravar `pmid` no insert.
- Endurecer prompt: "Se não tiver certeza ABSOLUTA do DOI, deixe DOI=null e forneça PMID. Não invente DOI."

### 4. Nova ação `revalidate` (substitui/estende `verify`)
Versão estrita usada para a **varredura da base atual**:

- Para cada artigo: rodar a nova `verifyArticle` ignorando o `source_url` atual e usando `title + doi` salvos.
- Casos:
  - **OK** (DOI confirma e título bate): atualiza `pmid` e normaliza `source_url` para PubMed.
  - **DOI errado mas título encontrado em outro PMID**: atualiza `doi`, `pmid`, `source_url` para os corretos. Loga em `mismatchFixed`.
  - **Sem como confirmar** (nem DOI nem título resolvem): em modo estrito, **desaprovar** (`approved=false`) em vez de deletar, e devolver lista para revisão manual no admin. Mais seguro que deletar silenciosamente.
- Suporta `dryRun: true` para relatório sem mudanças.
- Suporta filtro `scope` (approved/pending/all) e `niche`.

### 5. UI — `AdminAgentKnowledge.tsx`
- Botão **"Revalidar base (estrito)"** que chama `revalidate` em todos os aprovados, mostra contagens (verified / mismatchFixed / unverified→pending) e lista os que viraram pending para revisão humana.
- Coluna/badge mostrando PMID quando existir.
- Botão "Abrir no PubMed" usando PMID.

### 6. UI — `AgentKnowledgeBrowser.tsx`
- Preferir link **PubMed (PMID)** como botão principal de validação; DOI vira link secundário "DOI".
- Se só houver DOI, mantém DOI; nunca cair para busca por título (atual `pubmed.ncbi.nlm.nih.gov/?term=` é frágil).

### 7. Executar a varredura
Após o deploy, rodar `revalidate { scope: "approved", dryRun: false }` uma vez. Itens que não passarem voltam para a aba "Pendentes" do admin com flag `needs_review`, sem perder dados.

---

## Detalhes técnicos

**Arquivos a editar**
- `supabase/migrations/<novo>.sql` — adicionar `pmid text` + índice; coluna opcional `validation_status text` ou usar `approved=false` (preferir o segundo para simplicidade).
- `supabase/functions/agent-knowledge/index.ts` — reforçar `verifyArticle`, adicionar `revalidate`, persistir `pmid`, normalizar `source_url`.
- `src/components/admin/AdminAgentKnowledge.tsx` — botão revalidar + exibir PMID.
- `src/components/agent/AgentKnowledgeBrowser.tsx` — ordem PubMed → DOI nos links.

**Critério de similaridade de título**: manter `titleSimilarity` (Jaccard de tokens > 3 chars). Limiar para DOI: **≥ 0.6** (mais permissivo que título-livre porque o DOI já é uma pista forte, mas suficiente para barrar paper completamente diferente).

**Throttle PubMed**: manter `setTimeout(350ms)` por item — 66 artigos ≈ 25s.

**Memória do projeto**: atualizar `mem://features/agent-research-niches` registrando: "Todo artigo aprovado precisa ter par título↔DOI verificado por título; PMID é o link primário; ingestão rejeita pares inconsistentes."
