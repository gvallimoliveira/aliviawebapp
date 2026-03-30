

## Tabela de Questionários Validados por Região Corporal

### O que será feito

Criar um componente reutilizável `ValidatedQuestionnairesTable` que exibe uma tabela mapeando cada região corporal ao questionário validado utilizado na avaliação. A tabela será inserida em dois locais:

1. **Landing Page Profissional** (`/profissionais`) — nova seção antes do FAQ, com título como "Embasamento científico por região"
2. **Página de Suporte Profissional** (`/suporte`) — dentro do accordion ou como seção dedicada no painel profissional

### Dados da tabela

Extraídos diretamente de `questionnaireData.ts`. Cada linha agrupa regiões de forma legível:

| Região Corporal | Questionário | Referência |
|---|---|---|
| Coluna lombar / Dorsal / Sacral | ODI | Fairbank & Pynsent, 2000 |
| Ombro | SPADI | Roach et al., 1991 |
| Joelho | KOOS | Roos et al., 1998 |
| Quadril | HOOS | Klassbo et al., 2003 |
| Pé / Tornozelo | FAOS | Roos et al., 2001 |
| Tendão de Aquiles / Calcanhar | VISA-A | Robinson et al., 2001 |
| Cotovelo / Antebraço / Mão | QuickDASH | Beaton et al., 2005 |
| Cervical / Cabeça | NDI | Vernon & Mior, 1991 |
| Cabeça (cefaleia) | HIT-6 | Kosinski et al., 2003 |
| Coxa / Perna | LEFS-8 | Mehta et al., 2016 |

### Componente

**Novo arquivo: `src/components/ValidatedQuestionnairesTable.tsx`**
- Tabela usando componentes `Table` do shadcn/ui
- 3 colunas: Região, Questionário (sigla + nome completo), Referência científica
- Bilíngue via `useLanguage()` — usa `fullName_pt`/`fullName_en`
- Estilização consistente com o webapp (rounded borders, hover states, cores do tema)
- Badge com a sigla do questionário para destaque visual

### Integrações

**Editar: `src/pages/ProfessionalLanding.tsx`**
- Adicionar nova seção "Embasamento Científico" entre "Panel Features" e "Pricing", importando o componente
- Título e subtítulo via `t()` com novas chaves

**Editar: `src/pages/Support.tsx`**
- Inserir o componente dentro da aba profissional, após os tools e antes do FAQ
- Título contextual diferente ("Questionários utilizados na avaliação")

**Editar: `src/contexts/LanguageContext.tsx`**
- Adicionar chaves PT/EN para títulos e subtítulos das seções em ambos os locais

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/ValidatedQuestionnairesTable.tsx` |
| Editar | `src/pages/ProfessionalLanding.tsx` |
| Editar | `src/pages/Support.tsx` |
| Editar | `src/contexts/LanguageContext.tsx` |

