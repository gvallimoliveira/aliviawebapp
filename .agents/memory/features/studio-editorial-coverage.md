---
name: Studio Editorial Coverage System
description: Sistema mestre do /studio — registro canônico de tópicos, imagem obrigatoriamente igual ao assunto, e quantificação de cobertura que guia a decisão criativa
type: feature
---

# Sistema mestre de conteúdo do Studio

Regras **taxativas**. Valem para qualquer geração de landing de marketing (`/studio`), em todos os
mundos (Profissional, Paciente, Acadêmico, Clínica).

## 1. Registro canônico de tópicos (`src/pages/studio/topics.ts`)

Fonte única de verdade sobre as funcionalidades do Aliv.iA. Cada tópico declara:

- `label` — nome humano da funcionalidade;
- `image` — **a única** screenshot autorizada para o assunto (opcional);
- peso estratégico por mundo: `pillar` (pilar de venda), `differential` (diferencial),
  `underexposed` (precisa de palco).

Nova funcionalidade relevante do app ⇒ novo tópico aqui, com peso por mundo. Sem isso ela nunca
aparece no marketing.

## 2. Imagem = assunto (regra irretocável, zero fallback)

- Nenhum item de copy (`features`, `journeys.steps`, `compare`, `kinetic`, `quotes`) pode declarar
  `image`. O tipo em `content/types.ts` proíbe.
- A imagem vem **exclusivamente** de `imageForTopic(topic)`.
- Tópico sem screenshot exata da tela do assunto ⇒ **nenhuma imagem**. O bloco resolve em
  tipografia. É proibido usar imagem "parecida", "genérica" ou do fluxo vizinho.
- Ganhou screenshot nova? Adicione o asset e aponte no tópico — nunca no texto.

## 3. Estudo de cobertura ANTES da decisão criativa (`coverage.ts` + `picker.ts`)

- `Menções` = quantas vezes o assunto existe no acervo de copy do mundo (estático, no código).
- `No ar` = quantas vezes o assunto foi efetivamente gerado (dinâmico, `localStorage`
  `studio:coverage`).
- `Dívida` (0-100) combina raridade de menção, ausência no ar e peso estratégico. 100 = falar
  primeiro.
- Todo bloco escolhe conteúdo via `picker` (seleção ponderada por dívida), nunca por sorteio puro.
  Assim pilares saturados dão lugar a diferenciais subexpostos sem perder força de venda.
- O retrato de exposição é congelado por versão (ref, não state) e só é gravado depois da render —
  a página nunca troca de conteúdo debaixo do usuário.

## 4. Painel de cobertura (`StudioCoveragePanel.tsx`)

Botão "Cobertura" na barra do Studio: ranking por dívida, menções, vezes no ar, "Forçar" um assunto
na próxima versão (`?force=<topico>`), baixar o estudo em `.txt` e zerar histórico.

## 5. Guardas automatizadas (`src/test/studio-coverage.test.ts`)

Os testes falham se: um item de copy não declarar tópico válido, alguém escrever `image` na copy,
`imageForTopic` inventar fallback, ou um tópico monitorado do mundo ficar sem nenhuma copy própria
(só `pricing` e `safety` são isentos, pois vivem nas headlines/ofertas). Rodar sempre que mexer em
`content/*`.

## 6. Regra anti-ambiguidade da copy ("leitura adversa") — obrigatória antes de qualquer post

Toda headline/título do Studio precisa sobreviver à **leitura adversa**: se a frase admite uma
segunda interpretação que desvaloriza o recurso (ou o profissional), ela está errada.

- Caso real que originou a regra: "Assimetria calculada para você não precisar" lia-se como "você
  não precisa DA DINAMOMETRIA", e não "não precisa calcular". Virou "A conta da assimetria é nossa —
  a decisão é sua".
- Infinitivo pendurado no fim da frase ("…para você não precisar", "…sem se preocupar") sem
  completar o objeto é proibido — o teste `leitura adversa` quebra a build nesse padrão.
- Padrão preferido: automatizar o **esforço**, nunca o **julgamento** ("a conta é nossa, a decisão
  é sua"). O Aliv.iA nunca dispensa o fisioterapeuta nem a ferramenta — tira trabalho braçal.
- Formato de quotes de impacto aprovado pelo usuário (foto do card "Medo do movimento também é
  achado clínico."): frase curta, primeira pessoa do ofício, com virada inteligente. Ampliar esse
  pool sempre que possível.
