## Objetivo

Adicionar, no fluxo de **Avaliação Manual** (modal usado por fisios PRO/Clínica), um novo bloco **"Mobilidade Articular (ADM)"** posicionado **logo antes da seção de Testes Funcionais** (Step 4). Os dados ficam salvos no prontuário do paciente e aparecem no relatório em PDF.

## Como vai funcionar (visão do fisio)

- Card dedicado com título **"Mobilidade Articular — Arco de Movimento (ADM)"** e ícone próprio.
- Uma tabela com **3 colunas**:
  - **Coluna 1 — "Articulação / Movimento"** (texto livre, ex.: "Flexão de joelho direito").
  - **Coluna 2  — "Amplitude avaliada- Esquerda"** (texto livre curto, ex.: "90°").
  - Coluna 3 - idem coluna 2 porém relativo ao lado direito
- Inicia com **5 linhas** vazias.
- Botão **"+ Adicionar linha"** para incluir quantas linhas o fisio precisar.
- Botão de **lixeira** ao lado de cada linha para remover.
- Sugestões rápidas opcionais (chips): "Flexão", "Extensão", "Abdução", "Rotação interna/externa" — clicar pré-preenche a coluna esquerda da linha vazia mais próxima (apenas atalho, totalmente editável).
- Suporte a **autopreenchimento do modo Demo** (igual aos outros campos), usando dados mock realistas para o caso de lombalgia já existente.
- i18n PT/EN/ES.

## Onde aparece além do formulário

1. **Prontuário do paciente** (visualização da avaliação — `AssessmentView.tsx`): nova seção "Mobilidade Articular (ADM)" renderizando a mesma tabela em formato somente leitura, posicionada antes de "Testes Funcionais".
2. **PDF do relatório** (`generatePdf.ts`): nova seção com título traduzido e tabela 2 colunas, respeitando a largura útil de 158 mm e protegendo o título contra órfão (mesmo padrão das demais seções).
3. **Reavaliação Express / pré-preenchimento**: a tabela é carregada do prontuário anterior quando o fisio reabre/reedita a avaliação (`p.romTable`/`an.romTable`), preservando o comportamento atual dos outros campos.

## Estrutura técnica

### Modelo de dados

Campo novo dentro de `anamnesis_data` (JSONB já existente em `assessments`), **sem migração**:

```ts
romTable: Array<{ joint: string; value: string }>
```

- Salvo só com linhas não vazias (filter joint.trim() || value.trim()).
- Já persistido automaticamente porque `buildAnamnesisData()` serializa o objeto inteiro em `anamnesis_data`.

### Arquivos a alterar

1. `**src/components/dashboard/ManualAssessmentModal.tsx**`
  - Novo state `const [romTable, setRomTable] = useState<RomRow[]>(Array.from({length:5}, () => ({joint:"", value:""})))`.
  - Inclusão em `buildAnamnesisData()` e nos handlers de load (`p.romTable`, `an.romTable`) e reset.
  - Renderizar o novo card no **Step 4**, posicionado **acima** do bloco "Testes funcionais e observações".
  - Helpers: `addRow`, `removeRow(i)`, `updateRow(i, field, value)`.
  - Integração com `DemoShield` (autofill com mock).
2. `**src/data/mockManualAssessmentCase.ts**`
  - Adicionar `romTable` mock coerente com o caso de lombalgia (ex.: "Flexão lombar — 40°", "Extensão lombar — 15°", "Rotação dir/esq — 25°/30°", "Flexão de quadril D — 100°").
3. **Novo componente reutilizável `src/components/assessment/RomTable.tsx**`
  - Recebe `value`, `onChange`, `readOnly?`, `lang`.
  - Visual elegante: card com `rounded-2xl`, header com ícone (lucide `Ruler` ou `Activity`), linhas com inputs limpos, divisória sutil, hover/foco usando tokens semânticos (`bg-card`, `border-border`, `text-primary`). Sem cores hardcoded.
  - Em `readOnly` renderiza como `<Table>` shadcn estilizada (badge no valor, linhas zebradas suaves).
  - Usado tanto no modal quanto em `AssessmentView`.
4. `**src/pages/AssessmentView.tsx**`
  - Ler `assessment.anamnesis_data?.romTable`.
  - Renderizar `<RomTable readOnly value={rom} />` numa seção antes de "Testes Funcionais".
  - Passar `romTable` para os geradores de PDF (basic e full).
5. `**src/utils/generatePdf.ts**`
  - Aceitar `romTable` no payload de anamnese.
  - Nova função `drawRomTable(doc, rows, lang)`:
    - Título "Mobilidade Articular (ADM)" / "Joint Mobility (ROM)" / "Movilidad Articular (ADM)".
    - Tabela 2 colunas (≈100 mm + 58 mm), header com fundo `--muted`, células com padding consistente.
    - Pular se `rows` vazio.
    - Usar os helpers de quebra de página e proteção de órfão já existentes.
6. `**src/locales/{pt,en,es}.json**`
  - Chaves:
    - `rom.title`, `rom.subtitle`
    - `rom.column.joint`, `rom.column.value`
    - `rom.placeholder.joint` ("Ex.: Flexão de joelho direito"), `rom.placeholder.value` ("Ex.: 90°")
    - `rom.addRow`, `rom.removeRow`
    - `rom.empty` (mensagem quando readOnly e vazio — usado só no AssessmentView se quisermos esconder a seção; alternativa: ocultar totalmente).
    - `rom.suggestions.*` (flexion, extension, abduction, adduction, internalRotation, externalRotation).

### Persistência / compatibilidade

- Sem migração SQL — `anamnesis_data` é JSONB livre.
- Avaliações antigas sem `romTable` simplesmente não exibem a seção (no view e no PDF).

### Critérios de aceite

- Step 4 da avaliação manual mostra a tabela ADM antes dos testes funcionais, com 5 linhas iniciais e botão "+ Adicionar linha".
- Dados salvos sobrevivem a reload da avaliação (edit/express).
- AssessmentView mostra a tabela em formato leitura quando há dados.
- PDF inclui a seção ADM com a tabela formatada, sem estourar margem e sem cortar título.
- Modo Demo preenche a tabela com mock plausível.
- Strings em PT/EN/ES.
- Sem cores hardcoded — apenas tokens do design system.