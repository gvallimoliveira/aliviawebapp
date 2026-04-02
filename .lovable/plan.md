

# Tornar acesso à página de detalhe da avaliação mais intuitivo

## Problema

Atualmente, o profissional precisa clicar na linha do header do card de avaliação (data + hipótese) para ir à página de detalhe. A única indicação visual é um `ChevronRight` cinza pequeno — não é intuitivo.

## Solução

Adicionar um botão explícito "Ver avaliação completa" em cada card de avaliação no `PatientEvolutionDashboard.tsx`, e remover o comportamento de clique invisível no header.

## Alterações

### `src/components/dashboard/PatientEvolutionDashboard.tsx`

1. **Remover** o `onClick` e `cursor-pointer` do `div` do header do card (linhas 712-714) — manter apenas como display estático
2. **Adicionar** um botão visível `"Ver avaliação completa"` com ícone `FileText` + `ChevronRight`, posicionado logo após a seção de anamnese (antes do CTA de tratamento), com estilo `variant="outline"` e largura total para ser impossível de ignorar
3. Mover os botões de WhatsApp e PDF para ficarem ao lado do novo botão (linha de ações)

### Traduções (`pt.json`, `en.json`, `es.json`)

- `pro.view_full_assessment`: "Ver avaliação completa" / "View full assessment" / "Ver evaluación completa"

## Resultado

O profissional terá um botão claro e destacado em cada avaliação para acessar a página de detalhe, sem perder a visão consolidada do dashboard de evolução.

