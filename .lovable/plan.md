# Questionário de Marca + reorganização dos Ajustes da marca (Studio Pro)

Dois objetivos: dar a quem **não tem manual de marca** um caminho guiado (questionário reduzido, preenchível no sistema ou baixável em PDF), e reordenar a página de ajustes para que **logo e manual apareçam no começo**, não no fim.

## 1. Questionário de Marca (versão reduzida)

Um formulário com 18 perguntas em 5 blocos, derivado do questionário longo usado no manual do Guilherme Vallim:

- **Identidade (4):** frase de apresentação, o que vende/entrega, diferencial real, como quer ser chamado nas artes (nome/selo + registro profissional se houver).
- **Público (4):** público primário, perfil ideal, maior dor, maior desejo/objeção.
- **Voz (4):** tom (opções rápidas: direto, acolhedor, provocador leve, técnico), nível técnico (paciente ↔ especialista), palavras proibidas, CTA padrão.
- **Visual (4):** claro ou escuro, cor de destaque, sensação (premium com respiro / denso e enérgico), referências ou material já existente.
- **Limites (2):** o que nunca pode ser prometido, casos/públicos que não quer atrair.

Cada pergunta tem exemplo curto e é opcional — o que ficar vazio a IA completa e o usuário revisa.

Onde aparece: novo card **"Não tenho manual de marca"** no topo dos Ajustes, com três ações:
- **Responder aqui** (abre o formulário em accordion por bloco, salva as respostas na marca; salva sozinho a cada bloco para não perder digitação).
- **Baixar questionário em PDF** — mesmo formulário em papel, com a identidade Aliv.iA Studio, para o profissional responder offline ou enviar a um cliente.
- **Montar meu kit com estas respostas** — envia as respostas para a interpretação por IA, que preenche posicionamento, tom, públicos com palavra-chave/gancho/CTA, cores e tipografia. Quando existe manual em PDF anexado, o PDF continua sendo a fonte principal e o questionário entra como complemento.

As respostas ficam guardadas na marca: podem ser revisadas e reinterpretadas depois.

## 2. Nova ordem da página de Ajustes

Hoje os campos vêm numa lista longa em que logo, manual e tipografia estão quase no fim. Passa a ter 4 etapas numeradas, cada uma num bloco recolhível, com barra de salvar fixa no rodapé:

```text
1. Comece por aqui        nome · nicho · logo (upload) · manual em PDF
                          card "Não tenho manual" (questionário)
                          botão Interpretar com IA
2. Identidade visual      cores do kit · cores extras · tipografia · assinatura nas artes
3. Mensagem               descrição · posicionamento 360° · tom de voz · notas de estratégia
                          kit de nicho pronto
4. Públicos               públicos matriz e sub-nichos (dores, desejos, soluções,
                          palavra-chave, chamadas, CTA)
```

Ganhos de fluidez:
- o primeiro contato começa pelo que o usuário já tem em mãos (logo + manual, ou o questionário) e pelo botão que preenche tudo;
- etapas 2 a 4 nascem recolhidas quando ainda estão vazias e mostram um selo de "preenchido" depois da interpretação, deixando claro o que já está pronto;
- site e Instagram passam para a etapa 1 como fontes opcionais de leitura;
- o botão Salvar deixa de ficar só no fim da página.

O formulário de **nova marca** (primeiro acesso) segue a mesma ordem: nome, nicho, logo, manual/questionário, e só depois cor e tom — os campos avançados ficam para os Ajustes.

## Detalhes técnicos

- Migração: coluna `brief_answers jsonb not null default '{}'` em `public.studio_brands` (RLS e grants existentes já cobrem a tabela).
- `src/pages/studio-pro/brandQuestionnaire.ts`: definição das 18 perguntas (id, bloco, rótulo, exemplo, tipo texto/seleção) + `formatBriefAnswers()` que transforma as respostas em briefing textual.
- `src/pages/studio-pro/BrandQuestionnaireCard.tsx`: formulário em accordion, salvar por bloco, geração do PDF com jsPDF (mesmo padrão dos manuais de marca já gerados, fonte Outfit).
- `StudioProBrand.tsx`: reorganização em `<BrandSection>` numeradas e recolhíveis; `interpretBrand` passa a enviar `extra: formatBriefAnswers(...)`.
- `supabase/functions/studio-brand-interpret/index.ts`: o campo `extra` já é aceito no briefing; ajustar o prompt para tratar as respostas do questionário como fonte declarada pelo cliente (acima do site, abaixo do manual em PDF) e manter os fallbacks obrigatórios de `keyword`/`hook`/`hooks`/`cta`.
- Sem mudança no motor criativo nem nos blocos de arte.
