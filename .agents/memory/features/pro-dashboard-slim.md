---
name: Dashboard PRO Enxuto e Registro Rápido de Evolução
description: Dashboard profissional prioriza a lista de pacientes (topo); card do Agente removido, backup/exportação migrado para Minha Conta; prontuário tem botão/FAB "Registrar evolução".
type: feature
---

Decisões do usuário (2026-08) para o dashboard profissional (`ProDashboard.tsx`):

- **Lista de pacientes é a parte mais usada** — deve aparecer o mais cedo possível; nada de blocos grandes antes dela.
- **Card do Agente Clínico REMOVIDO** do dashboard (acesso pela barra de abas inferior / menu). Não reintroduzir.
- **Plano profissional** virou faixa slim de 1 linha (badge + status/renovação + link p/ Minha Conta); checkout só para quem não é PRO.
- **Link de avaliação** virou barra compacta com botões Copiar e WhatsApp; descrição longa ficou em popover "ℹ️".
- **Avaliações pendentes** virou alerta slim de 1 linha (link "Revisar").
- **Backup/exportação/importação** (ExportDataCard/ImportDataCard) migrado para Minha Conta → seção "Privacidade e dados" → bloco colapsável "Backup, exportação e importação de dados" (só PRO/owner). No dashboard só aparece em modo demo/simulado.

Prontuário do paciente (`PatientDetailView.tsx`):
- Botão "Registrar evolução" no cabeçalho (desktop) e FAB flutuante (mobile, acima da barra de abas) → rola até "Notas de sessão" e abre o formulário com foco no textarea.
- Implementação: evento custom `window.dispatchEvent(new Event("alivia:open-session-note"))`, ouvido em `SessionNotesSection.tsx` (abre nova nota + focus no campo de evolução). O atalho "Notas de sessão" do menu lateral (`PatientSectionRail`) dispara o mesmo evento.
