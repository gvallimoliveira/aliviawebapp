# Studio: sistema mestre de cobertura de funcionalidades + imagem obrigatoriamente coerente

Hoje o Studio sorteia blocos de copy sem saber quais funcionalidades já são muito
faladas e quais quase nunca aparecem, e a imagem de cada bloco é escolhida à mão
dentro do arquivo de conteúdo (é aí que nascem os desencontros imagem × assunto).

O plano cria uma camada de **inteligência editorial** consultada ANTES de compor a
página, e transforma a coerência de imagem em regra estrutural — não mais em
disciplina de quem escreve.

## 1. Registro canônico de funcionalidades (a "verdade" do produto)

Um catálogo único de tópicos do Aliv.iA, por mundo (Profissional, Paciente,
Acadêmico, Clínica). Cada tópico tem:

- id e nome de exibição (ex.: "Mecanismo de dor", "Reavaliação expressa", "Dinamometria");
- peso estratégico: `pilar` (o que sustenta a venda), `diferencial` (o que ninguém
  mais tem) ou `subexposto` (precisa ar, mesmo sendo menos glamouroso);
- **a única imagem permitida** para o tópico (ou nenhuma, quando não existe tela
  exata daquele assunto).

## 2. Quantificação: o que é muito e o que é pouco mencionado

Um módulo de cobertura calcula, por mundo, dois números por tópico:

- **Menções no acervo**: quantos itens de copy (features, jornadas, comparativos,
  kinéticos, frases) falam daquele tópico. Revela desequilíbrio do conteúdo escrito.
- **Exposições reais**: quantas vezes o tópico já foi de fato para uma página
  gerada, exportada em PNG ou favoritada (histórico guardado no navegador).

Disso sai um **índice de dívida editorial** por tópico: alto = falamos pouco e
precisamos falar. Zero = já saturado.

## 3. A composição passa a consultar a cobertura antes de decidir

`composePage` deixa de sortear cegamente:

- cada versão recebe uma **cota**: no mínimo ~1/3 dos blocos de conteúdo tem que
  cobrir tópicos com dívida alta; pilares entram para ancorar; o resto é criatividade;
- o sorteio de itens dentro de cada bloco passa a ser ponderado pela dívida
  (tópico nunca mostrado tem prioridade sobre o já batido);
- ao renderizar, o mundo/seed registra as exposições, então a próxima "nova landing
  preview" já nasce sabendo o que foi dito antes.

Resultado prático: nenhuma versão vira só "mapa de dor + relatório" de novo, e
funcionalidades como dinamometria, FABQ, saúde geral, ressalva com autor,
multi-condição e reavaliação expressa entram em rotação garantida.

## 4. Painel de estudo interno (na barra do Studio)

Um painel "Cobertura" mostra, para o mundo atual: ranking de tópicos com menções,
exposições, dívida e classificação (pilar/diferencial/subexposto), mais um botão
para **forçar** um tópico específico na próxima versão e outro para baixar o estudo
em `.txt` (útil para planejar o calendário do Instagram).

## 5. Imagem × assunto: regra taxativa, garantida por código

- Blocos **param de aceitar imagem escrita à mão**. A imagem passa a vir do tópico
  declarado. Sem tópico ⇒ sem imagem.
- Tópico sem tela exata no projeto ⇒ o bloco renderiza como tipografia de alto
  impacto. Zero fallback, zero screenshot "parecido".
- Um teste automatizado quebra a build se algum item de conteúdo declarar imagem
  fora do tópico, ou se um tópico apontar para um arquivo inexistente.
- Regra registrada na memória do projeto como obrigatória e não-negociável, junto
  com a proibição de imagem genérica e a exigência de consultar a cobertura antes
  de criar copy nova.

## Detalhes técnicos

- Novos arquivos: `src/pages/studio/topics.ts` (registro + mapa tópico→asset),
  `src/pages/studio/coverage.ts` (contagem de acervo, log de exposição em
  localStorage `studio:coverage`, cálculo de dívida), `src/pages/studio/StudioCoveragePanel.tsx`.
- `content/types.ts`: itens de `features`, `journeys[].steps`, `compare`, `kinetic`
  e `quotes` ganham `topic: TopicId`; o campo `image` é removido do tipo.
- `content/{professional,patient,academic,clinic}.ts`: cada item recebe seu `topic`;
  imports de assets saem dos arquivos de conteúdo e passam para `topics.ts`.
- `composePage.ts`: recebe `coverage` e devolve, junto de cada bloco, os `topics`
  alvo; `rng` ganha `pickWeighted` para o sorteio por dívida.
- `FeatureBlock`/`JourneyBlock`/`CompareBlock`/`KineticBlock`/`QuoteBlock`: leem a
  imagem via `imageForTopic(topic)`.
- `StudioLanding.tsx`: registra exposições por versão e injeta a cobertura na
  composição; `StudioControls.tsx` ganha o botão do painel.
- Teste novo em `src/test/studio-coverage.test.ts`: coerência imagem×tópico,
  todo item com tópico válido e todo tópico com ao menos uma menção no acervo.
- Memória: atualizar `.agents/memory/features/studio-marketing-landing.md`.
