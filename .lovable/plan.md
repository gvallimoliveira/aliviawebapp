

## Criar página de Suporte interno (logado)

### Visão geral

Nova página `/suporte` acessível apenas para usuários logados, com dois modos de suporte separados por cards/tabs: **Minha Saúde** e **Painel Profissional**. Cada modo lista todas as ferramentas do respectivo painel com descrição objetiva e orientações de uso. Inclui seção de FAQ gerada com perguntas relevantes.

### Estrutura da página

```text
/suporte
├── Header (já existente)
├── Seleção de perfil (2 cards)
│   ├── "Suporte — Minha Saúde" (ícone Heart)
│   └── "Suporte — Painel Profissional" (ícone Stethoscope)
├── Conteúdo do perfil selecionado
│   ├── Lista de ferramentas com Accordion
│   └── FAQ (Accordion separado)
└── Footer
```

### Conteúdo — Minha Saúde

Cada item com título, ícone e texto explicativo:

1. **Avaliação Básica** — O que é, como iniciar, o que recebe ao final
2. **Avaliação Premium** — Diferenças, pagamento, relatório detalhado
3. **Status Premium** — Dias restantes, avaliações disponíveis, upgrade
4. **Diário de Dor** — Como registrar, para que serve, frequência ideal
5. **Comparativo de Avaliações** — Como funciona a comparação antes/depois
6. **Histórico de Avaliações** — Onde encontrar, como visualizar, PDF
7. **Buscar Profissional** — Como funciona o encaminhamento
8. **Código de Indicação** — Como compartilhar, desconto obtido
9. **Perfil e Idioma** — Como editar dados pessoais

### Conteúdo — Painel Profissional

1. **Link Personalizado** — Como gerar, copiar e enviar ao paciente
2. **Estatísticas** — Total de avaliações, avaliações do mês
3. **Gráficos Analíticos** — Donut de status, barras de regiões
4. **Lista de Pacientes** — Busca, agrupamento por email, visualização detalhada
5. **Dashboard de Evolução** — Gráfico de subescalas, comparativo temporal
6. **Download de PDF** — Como baixar relatório com notas profissionais
7. **Notas Profissionais** — Como adicionar anotações clínicas
8. **Assinatura PRO** — Planos, gerenciamento, portal de pagamento
9. **Editar Perfil Profissional** — CREFITO, especialidades, foto
10. **Tratamento Vitalício** — O que é a oferta lifetime

### FAQ

Perguntas hardcoded (sem chamada de IA em runtime) cobrindo dúvidas comuns como:
- "Posso fazer mais de uma avaliação por vez?"
- "Meu paciente precisa criar conta?"
- "Como cancelo minha assinatura PRO?"
- "Os dados dos meus pacientes são seguros?"
- ~10 perguntas por perfil, traduzidas PT/EN

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/Support.tsx` |
| Editar | `src/App.tsx` (adicionar rota `/suporte`) |
| Editar | `src/contexts/LanguageContext.tsx` (traduções PT/EN) |
| Editar | `src/components/Header.tsx` (link de suporte no menu, visível apenas logado) |

### Detalhes técnicos

- Rota protegida: redireciona para `/auth` se não logado
- Usa `Accordion` do shadcn para cada ferramenta e FAQ
- Cards de seleção de perfil com estado local (`useState`)
- Se usuário não for profissional, o card "Painel Profissional" aparece com indicação de que é para fisioterapeutas cadastrados
- Mesmo padrão visual: `motion` para animações, gradientes sutis, ícones Lucide
- Todas as strings via `t()` para suporte bilíngue

