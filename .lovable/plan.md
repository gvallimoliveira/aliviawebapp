# Motor criativo textual — variedade linguística global no Studio

Objetivo: a mesma mensagem "A" passa a ser escrita de muitas formas diferentes, respeitando tom de voz, público e kit da marca. Vale para todas as marcas do Studio (público e interno), não só a Aliv.iA. Geração 100% local (nenhum crédito de IA por arte) e memória anti-repetição salva na conta.

## O que muda na prática

Hoje o texto de cada arte sai de listas fixas: no Studio público são ~5 variações por slot (headline, sub, chamada, lista, citação...), interpoladas com nome/nicho/palavras-chave da marca. Por isso, navegando muito, as frases repetem.

Depois da mudança:
- Cada frase é montada na hora a partir de estruturas retóricas + vocabulário sinônimo, guiado pelo tom de voz do kit.
- Milhares de combinações por slot, sem inventar promessas: as ideias continuam vindo do kit (dores, desejos, soluções, CTA, posicionamento, públicos).
- O sistema lembra o que já usou por marca (na conta, valendo em qualquer dispositivo) e evita repetir frases e estruturas recentes.

## Camadas novas

1. Léxico por registro de voz
   - Dicionário pt-BR de sinônimos inteligentes para os verbos/substantivos/adjetivos recorrentes do Studio ("resolver", "clareza", "resultado", "método", "cuidado", "processo", "confiança"...).
   - O tom do kit é classificado em registros (técnico, próximo, direto, inspirador, sóbrio) e cada registro tem sua faixa de vocabulário. O texto do campo "tom de voz" continua nunca sendo renderizado como frase.

2. Estruturas retóricas (frames)
   - A mesma ideia pode virar: afirmação, contraste/negação ("não é X, é Y"), pergunta, imperativo, dado + consequência, antes/depois, provérbio curto, promessa em duas partes.
   - Cada slot declara quais frames aceita (headline aceita todos; kicker só formas curtas), garantindo encaixe visual.

3. Composição a partir do kit
   - `brandContent.ts` deixa de ter listas curtas fixas e passa a gerar combinatoriamente: frame × ingrediente do kit (dor, desejo, solução, público, palavra-chave, posicionamento) × léxico do registro.
   - Fallbacks seguros quando o kit tem poucos campos preenchidos (marca nova), sem frase genérica repetida.

4. Memória anti-repetição na conta
   - Nova tabela no backend guarda, por marca, as assinaturas de frases/frames já expostos, com decaimento no tempo.
   - O seletor (dívida editorial já existente) passa a pesar também frame e vocabulário, não só tópico — hoje o conteúdo neutro do Studio público entra com peso plano, o que aumenta a repetição.

5. Acabamento
   - Toda frase gerada passa pelo encurtamento sem reticências já existente e pelo AutoFit do quadro, então variação maior não volta a cortar texto.
   - Isolamento de marca preservado: nenhuma frase nova pode conter literal de outra marca (checagem automática nos testes).

## Detalhes técnicos

- Novos módulos em `src/pages/studio/`: `lexicon.ts` (sinônimos por registro + `voiceRegister(tone)`), `phrasing.ts` (frames retóricos, aplicáveis a qualquer slot), `compose/text.ts` (montagem frame + ingredientes + léxico, determinística por `Rng`).
- `src/pages/studio-pro/brandContent.ts`: cada slot passa a chamar o compositor, mantendo o contrato `WorldContent` de `src/pages/studio/content/types.ts` (nenhum bloco visual precisa mudar).
- Mundos internos (`professional.ts`, `patient.ts`, `academic.ts`, `clinic.ts`): o acervo curado é mantido como "sementes de ideia" e ganha passagem pelo léxico/frames, então também variam mais.
- `src/pages/studio/picker.ts` + `coverage.ts`: `weightOf` passa a considerar `frame` e `lexSet`; conteúdo sem tópico recebe tópicos neutros (processo, resultado, método, prova, convite) em vez do peso plano 0.6.
- Persistência: migração criando `studio_phrase_memory` (brand_id, signature, kind, last_used_at, uses) com RLS por dono da marca + GRANTs; leitura/escrita via hook novo, com cache local e escrita em lote ao gerar.
- Testes em `src/test/`: (a) 200 seeds geram taxa alta de headlines únicas; (b) nenhuma frase excede o limite de caracteres do slot; (c) nenhum literal de marca alheia aparece; (d) frames respeitam o registro do tom.

## Fora de escopo

- Nenhuma chamada de IA por arte (decisão: motor local e gratuito).
- Sem mudança de layout, blocos visuais ou cotas.
