---
name: Agent Knowledge Validation
description: Política de validação de artigos do Agente — ID obrigatório, PEDro opcional, periódicos prioritários.
type: feature
---

Política em vigor para `knowledge_articles` (admin: AdminAgentKnowledge, edge: agent-knowledge):

1. **Crivo bibliográfico (BLOQUEANTE)** — DOI/PMID precisa ser confirmado contra PubMed/Crossref com similaridade de título ≥ 0.6 (id) ou ≥ 0.85 (título livre). Sem isso, artigo nunca aprova.

2. **Crivo PEDro (AVISO AMARELO, OPCIONAL)** — Nota PEDro é checada em search.pedro.org.au e mostrada como sinal. Falha **NÃO bloqueia** aprovação: admin pode aprovar manualmente. Justificativa: um artigo de alto nível em periódico exigente (JOSPT, BJPT, Journal of Physiotherapy etc.) pode legitimamente não constar na PEDro.

3. **Periódicos prioritários (lista curada em `supabase/functions/_shared/priority-journals.ts` e `src/lib/priorityJournals.ts`)** — Periódicos de Fisioterapia com fator de impacto ≥ 3 (Journal of Physiotherapy 9.0, JOSPT 6.9, Journal of Neurologic PT 3.6, BJPT 3.6, Physical Therapy 3.3, Archives of Physiotherapy 3.1, Physiotherapy 3.1, Journal of Geriatric PT 3.0). O prompt de ingest pede ≥ 60% dos artigos desses periódicos. UI mostra badge "★ IF X.X" verde para esses artigos no admin e no browser público.

4. **list_public** — não filtra mais por pedro_score_status; só exige `approved=true` e `verification_status=verified`. Assim artigos sem PEDro mas aprovados pelo admin aparecem para os profissionais.

5. **revalidate** — PEDro falho agora apenas atualiza metadados PEDro (sinal amarelo), não desaprova. Só desaprova quando o ID (DOI/PMID) não confirma o título.

6. **Fontes de busca (ingest PubMed-first + Cochrane)** — `action: "ingest"` busca em paralelo: (a) PubMed geral via E-utilities (motor principal), (b) Cochrane Database of Systematic Reviews via PubMed `[Journal]` filter (revisões sistemáticas prioritárias), (c) Crossref como complemento apenas para periódicos IF ≥ 3. Cochrane vai primeiro no merge para prevalecer sobre o mesmo PMID em busca genérica. Termos canônicos (MeSH+keywords pt/en) por nicho em `supabase/functions/_shared/niche-search-terms.ts`. Abstracts são extraídos por bloco `<PubmedArticle>` (split + match do PMID dentro de `<MedlineCitation>` para evitar capturar abstract do artigo errado). A IA só resume abstract em pt-BR e extrai key_findings — instruída a retornar null quando `has_abstract=false` para não inventar achados genéricos. Dedup contra `knowledge_articles` por PMID, DOI e título normalizado antes de inserir. Resposta inclui `bySourceFound{pubmed,cochrane,crossref}`, `bySourceInserted`, `queryUsed` e `cochraneQuery` para debug no admin.
