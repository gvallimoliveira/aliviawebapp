
## Diagnóstico

Hoje o `action: "ingest"` do edge `agent-knowledge` **não pesquisa em base nenhuma** — ele só pede para o Gemini "listar estudos reais" sobre o nicho e depois tenta verificar cada título contra PubMed/Crossref. Resultado:

- Em nichos onde o modelo "lembra" de bons papers (Aquiles/fascite plantar, lombalgia) ele acerta.
- Em nichos onde ele alucina menos itens ou inventa DOIs (capsulite adesiva / frozen shoulder), todos caem no filtro `verifyArticle` e o `inserted=0` chega ao admin como "não retornou nada".
- O critério de busca é, na prática, **a memória do LLM**, não uma query reprodutível. Por isso a mesma chamada se comporta de forma desigual entre nichos.

A solução é inverter o fluxo: **buscar primeiro nas bases (PubMed como motor principal, Crossref e PEDro como complementares) e usar a IA só para resumo/curadoria**.

## Mudanças

### 1. Mapa de termos de busca por nicho (`agent-knowledge/index.ts`)

Criar `NICHE_SEARCH_TERMS: Record<string, { mesh?: string[]; keywords: string[] }>` com sinônimos pt/en para cada slug. Exemplo:

```text
capsulite_adesiva_ombro_congelado:
  mesh: ["Bursitis"], 
  keywords: ["adhesive capsulitis", "frozen shoulder", "shoulder stiffness"]
tendinopatia_aquiles_fascite_plantar:
  keywords: ["achilles tendinopathy", "plantar fasciitis", "plantar fasciopathy"]
... (uma entrada por slug existente em NICHE_DESCRIPTIONS)
```

Slugs sem entrada caem em fallback que usa `nicheDescription` traduzido pelo LLM (mesmo prompt curto, só para gerar 3-5 termos).

### 2. Nova função `searchPubmedForNiche(niche, count)`

Monta uma query PubMed canônica:

```text
( "adhesive capsulitis"[tiab] OR "frozen shoulder"[tiab] OR "Bursitis"[MeSH] )
AND ( Randomized Controlled Trial[pt] OR Systematic Review[pt] OR Meta-Analysis[pt] )
AND ( "last 15 years"[dp] )
AND English[lang]
```

Fluxo:

1. `esearch` com `retmax = count * 4` (sobre-amostragem para sobreviver à dedup/filtros), `sort=relevance`.
2. `esummary` em lote (`id=...,...`) para obter título, autores, ano, journal, DOI, PMID.
3. `efetch rettype=abstract&retmode=xml` em lote para puxar abstracts.
4. Filtros server-side: idioma EN/PT/ES, ano ≥ now-15, `study_type` em RCT/SR/MA, descarta retractions.
5. Dedup contra `knowledge_articles` por PMID e por DOI (consulta `select pmid, doi where niche_tags @> {niche}` + global por id).

### 3. Complementos opcionais (mesma chamada, em paralelo)

- **Crossref** (`api.crossref.org/works?query.bibliographic=...&filter=type:journal-article,from-pub-date:YYYY`): pega itens que não estão no PubMed (ex.: BJPT/JOSPT recentes). Filtra por journal whitelist e dedup por DOI.
- **PEDro**: a busca pública já tem scraper (`verifyPedroScore`). Adicionar `searchPedroForNiche` que usa os mesmos `keywords`, filtra por método (RCT/SR) e devolve {title, pedro_score, pedro_record_id}. Usado como **cross-source enrichment**, não como fonte primária (PEDro só indexa MSK selecionado).
- **ScienceDirect**: requer API key da Elsevier que o projeto não tem. **Não vou adicionar nesta iteração**; deixo TODO comentado no código. (Se quiser, pedimos a chave via `add_secret` em rodada futura.)

Cada fonte devolve `{ source, items[] }` e tudo é mesclado por PMID/DOI/título normalizado.

### 4. Curadoria via IA agora vira passo 2 (enriquecimento, não geração)

Para cada candidato real do PubMed/Crossref, montar uma chamada única ao LLM:

```text
Para cada artigo abaixo (título + abstract original), produza:
- abstract: 3-5 frases em pt-BR
- key_findings: 1-2 frases em pt-BR
- study_type: RCT | Systematic Review | Meta-analysis
- pedro_score: número se você TIVER CERTEZA pela base PEDro; senão null
Resposta: JSON array preservando a ordem.
```

A IA não inventa título/autor/DOI — só traduz/resume. Isso elimina a classe de erros "DOI alucinado".

### 5. `verifyArticle` continua rodando

Como agora os candidatos vêm do próprio PubMed, `verifyArticle` praticamente sempre passa (PMID conhecido). Mantemos a chamada por defesa: itens vindos só do Crossref ainda precisam confirmar título.

### 6. PEDro continua "amarelo opcional"

Mantemos a política atual: PEDro falho não bloqueia. Só muda que agora a maioria dos candidatos terá PEDro confirmado porque a busca já passou pelo cross-check.

### 7. Resposta de ingest

Devolver para o admin:

```json
{
  "ok": true,
  "inserted": 7,
  "candidates": 32,
  "bySource": { "pubmed": 25, "crossref": 6, "pedro": 1 },
  "rejectedUnverified": 2,
  "pedroWarning": 3,
  "priorityJournalCount": 5,
  "queryUsed": "..."
}
```

Atualizar o toast em `AdminAgentKnowledge.tsx` para mostrar a query usada e a contagem por fonte — útil para o admin entender o que rodou.

### 8. Botão "Buscar mais" sem mudar UI

A UI atual permanece igual; só passa a respeitar o mesmo `count` (1-10) e mostra os contadores novos no toast.

## Critérios técnicos

- **Rate limit PubMed/NCBI**: respeitar 3 req/s sem API key; já temos `setTimeout(350ms)`. Para `esearch + esummary + efetch` em lote isso é suficiente.
- **Idioma**: aceitar `eng`, `por`, `spa`. Restringir abstract para esses três.
- **Janela temporal**: padrão 15 anos; permitir override via body `yearsBack`.
- **Dedup**: chave composta `(pmid || doi || normalize(title))`. Consulta `knowledge_articles` filtrando por essas chaves antes de inserir.
- **Memória do projeto**: atualizar `mem://features/agent-knowledge-validation` registrando "Ingest agora é PubMed-first com Crossref/PEDro complementares; LLM só enriquece".

## Arquivos a editar

- `supabase/functions/agent-knowledge/index.ts` — novas funções `getNicheSearchTerms`, `searchPubmedForNiche`, `searchCrossrefForNiche`, `searchPedroForNiche`, `enrichWithAi`; refatorar `action === "ingest"`.
- `supabase/functions/_shared/niche-search-terms.ts` (novo) — mapa pt/en de termos por slug.
- `src/components/admin/AdminAgentKnowledge.tsx` — mostrar `bySource` e `queryUsed` no toast/log.
- `.agents/memory/features/agent-knowledge-validation.md` — adicionar seção "Fontes de busca".

## Fora de escopo desta iteração

- Integração ScienceDirect/Elsevier (precisa chave paga — pergunto depois).
- Mudanças no fluxo de revalidação dos artigos já aprovados (continua igual).
- Mudanças na UI da biblioteca pública.
