# Duas regras novas de linguagem no Studio (marca Aliv.iA)

## Regra 1 — "AutoAvaliação" quando a arte fala com paciente

Nas artes da marca Aliv.iA dirigidas a paciente e aos sub-nichos clínicos (dor crônica, pós-operatório, 60+, praticante de esporte), toda menção ao produto passa a usar **autoavaliação** em vez de avaliação:

- "Faça sua avaliação" → "Faça sua autoavaliação"
- "Avaliação guiada em poucos minutos" → "Autoavaliação guiada em poucos minutos"
- CTA "Fazer minha avaliação" → "Fazer minha autoavaliação"

Exceções que **não** mudam (senão a frase perde sentido ou vira risco clínico):

- avaliação feita por outra pessoa: "procurar avaliação médica", "avaliação presencial", "avaliação com um fisioterapeuta";
- "reavaliação" (segue como está);
- artes de profissional, clínica e acadêmico: continuam com **avaliação**;
- marcas de cliente (Guilherme Vallim, PerformaPro, LoveChronicles etc.): nada muda.

## Regra 2 — nunca afirmar que "temos protocolos"

A palavra **protocolo** sai de qualquer afirmação da marca e é substituída, de forma determinística, por uma destas três: **método estruturado**, **direcionamento** ou **raciocínio clínico** — escolhida pelo contexto da frase (prova de método → "método estruturado"; caminho/próximo passo → "direcionamento"; decisão clínica → "raciocínio clínico").

Continua permitido o uso **crítico/contraste**, que não afirma que temos protocolos: "protocolo de prateleira não conhece o seu paciente", "4 sinais de que um caso pede mais que protocolo". Se preferir eliminar até esses, é só dizer.

Também sai do motor de sinônimos: "protocolo" nunca mais será introduzido como variação de "método"/"processo" em nenhuma marca.

## Detalhes técnicos

1. Novo módulo `src/pages/studio/terminology.ts`:
   - `selfAssessmentTerms(text)` — troca "avaliação/avaliações" por "autoavaliação/autoavaliações" preservando capitalização, com lista de exceções (médica, presencial, clínica, "reavaliação", "avaliação física" por terceiro).
   - `deprotocol(text)` — substitui "protocolo(s)" pelas 3 alternativas aprovadas, com detecção de uso crítico (precedido de "de prateleira", "mais que", "não é só") que é preservado.
   - `applyTerminology(content, { patientVoice })` — varre recursivamente todos os campos de `WorldContent` (headlines, subs, closings, quotes, carousels, sales, stats…).
2. Aplicação nos dois pipelines:
   - Studio interno (`src/pages/studio/content/index.ts`): mundo `paciente` passa por `applyTerminology` com `patientVoice: true`; os demais mundos só por `deprotocol`.
   - Studio público (`src/pages/studio-pro/brandContent.ts`): após `applyAngle`/`sanitizeContent`, aplica `applyTerminology` com `patientVoice = isAliviaCoreBrand(brand) && relação é público de paciente/sub-nicho clínico` (usa `relation.keyword/who/audience` com o mesmo casamento já usado em `charmCopy.ts`/`aliviaCoreCharm.ts`).
3. Acervos que ganham o termo já corrigido na origem (evita depender só do filtro): `content/patient.ts`, `studio-pro/aliviaCoreCharm.ts` (linha do público "Paciente com Dor"), `studio-pro/audiences.ts` (públicos de paciente do Aliv.iA) e `charm.ts` ("Comece pela avaliação" no acervo de CTA de paciente).
4. `src/pages/studio/lexicon.ts`: remover "protocolo" dos sinônimos de "método" e "processo".
5. Testes em `src/test/` (arquivo novo `studio-terminology.test.ts`): nenhuma arte de paciente Aliv.iA contém "avaliação" sem o prefixo "auto" (fora das exceções); nenhuma afirmação contém "protocolo"; marcas de cliente e mundos pro/clínica seguem intactos.
6. Memória: gravar as duas regras em `mem://features/studio-terminology-rules` e referenciar no índice.
