Objetivo: corrigir de forma estrutural e definitiva a formação do PDF, especialmente os blocos de texto dentro de caixas verdes, sem quebrar os fluxos de download/WhatsApp já existentes. 

Verifique se o ultimo item do box de objetivos esta incorporado nesse plano antes de realizar, visto que ficou com simbolo de exclamação e nao o check de tarefa pronta

O que identifiquei no código

- O PDF é gerado centralmente em `src/utils/generatePdf.ts` com `jsPDF`, não por captura visual.
- O problema não está só em um trecho isolado: há várias caixas e subseções que calculam altura/largura de texto de forma parecida, mas com regras inconsistentes.
- O trecho mais sensível ao erro da sua imagem é a área de “Impressão Clínica / Clinical Impression”, mas o mesmo risco existe em:
  - hipótese diagnóstica
  - notas do profissional
  - disclaimer
  - resumo narrativo
  - alguns blocos de questionários e listas
- Como essa utility é compartilhada por vários pontos do app, qualquer correção precisa ficar centralizada ali para evitar regressões:
  - PDF básico
  - PDF premium/profissional
  - download no dashboard
  - compartilhamento por WhatsApp
  - exportação em lote

Plano de implementação

1. Criar uma camada rígida de layout de texto no gerador de PDF

- Introduzir helpers centrais para:
  - sanitizar texto
  - quebrar linhas com largura real da caixa
  - medir altura exata do bloco antes de desenhar
  - desenhar texto somente depois da caixa já ter altura calculada
- Padronizar largura útil interna com a regra já registrada em memória: área útil real de ~158mm.

2. Substituir cálculos “soltos” por componentes de bloco reutilizáveis

- Criar funções específicas como:
  - `measureTextBlock`
  - `drawWrappedTextBlock`
  - `drawOutlinedTextCard`
  - `drawLabeledParagraphBlock`
- Essas funções vão receber:
  - largura interna
  - padding
  - fonte/peso/tamanho
  - line-height
  - margem de segurança inferior
- Assim a caixa sempre nasce da altura real do conteúdo, e não de aproximações.

3. Endurecer especialmente os blocos que hoje mais quebram

- Reestruturar primeiro:
  - “Clinical Impression / Impressão Clínica”
  - hipótese diagnóstica
  - subseções de resumo/explicação/raciocínio
  - notas do profissional
  - disclaimer
- Ajustar ordem correta:
  - definir fonte
  - medir linhas
  - calcular altura total
  - verificar quebra de página
  - desenhar caixa
  - renderizar texto
- Isso evita o cenário atual em que a medição e a renderização usam parâmetros diferentes.

4. Aplicar regras tipográficas rígidas

- Padronizar:
  - `fontSize`
  - `lineHeight`
  - padding superior/inferior
  - padding lateral
  - distância entre título e corpo
- Adicionar margem de segurança para descenders/itálico, porque texto em itálico costuma “escapar” visualmente mais fácil em PDF.
- Remover qualquer largura calculada com números diferentes da largura interna da própria caixa.

5. Melhorar quebra de página e anti-orfandade

- Garantir que título + início do bloco fiquem juntos.
- Se a caixa inteira não couber, mover o bloco inteiro para a próxima página.
- Para blocos grandes, permitir quebra segura apenas entre blocos lógicos, nunca “vazando” da moldura.

6. Cobrir regressões nos dois tipos de relatório

- Aplicar a mesma base de layout ao:
  - `generateBasicReportPdfBlob`
  - `generateAssessmentPdfBlob` / `_buildPdfDoc`
- Manter intacta a lógica de compartilhamento nativo no WhatsApp; a correção será no conteúdo/layout do PDF, não no fluxo de share.

7. Adicionar testes de regressão do gerador

- Incluir testes unitários para os helpers de medição/quebra de texto.
- Criar cenários com textos longos, itálicos, nomes extensos e múltiplos parágrafos.
- O foco é garantir que altura medida e altura desenhada permaneçam coerentes.

8. Validação visual obrigatória antes de entregar

- Gerar PDFs de prova com casos extremos, incluindo um cenário semelhante ao do paciente Renato Valença.
- Inspecionar visualmente todas as páginas:
  - overflow de texto
  - corte em bordas
  - sobreposição
  - espaçamento inconsistente
  - quebra de página ruim
- Se qualquer bloco ainda escapar da moldura, ajustar o helper central e repetir a validação.

Resultado esperado

- Nenhum texto ultrapassando o retângulo verde.
- Mesma qualidade visual em PDF básico e premium.
- Correção centralizada, sem “remendos” por tela.
- Menor chance de retrocesso futuro porque a regra passa a ficar encapsulada em helpers únicos.

Detalhes técnicos

- Arquivo principal afetado: `src/utils/generatePdf.ts`
- Não deve exigir mudanças de backend, banco ou storage.
- O stack atual com `jsPDF` é suficiente; não vejo necessidade de migrar para captura por `html2canvas`, porque o problema é de consistência de medição/renderização e pode ser resolvido de forma mais robusta no gerador vetorial atual.
- Também vou preservar as regras já existentes de memória:
  - largura útil rígida de ~158mm
  - proteção contra títulos órfãos
  - branding atual dos relatórios

Assim que você aprovar, eu implemento essa refatoração de layout no gerador de PDF e faço a correção completa com validação visual rigorosa.