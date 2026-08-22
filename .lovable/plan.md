# Menu lateral de atalhos no prontuário do paciente

Uma barra lateral discreta e colapsada (só ícones) na página do prontuário, que se expande ao passar o cursor ou clicar, listando as seções na mesma ordem em que aparecem na página, com os mesmos ícones já usados em cada card. Clicar leva direto à seção, com rolagem suave, e a seção atual fica destacada conforme o scroll.

## Comportamento

- **Recolhida:** trilha vertical estreita (~48px), fixa no lado esquerdo, centralizada verticalmente, fundo translúcido com blur e borda suave. Só ícones.
- **Expandida:** ao `hover` (desktop) ou clique/tap, cresce mostrando ícone + nome da seção; recolhe ao sair o cursor / clicar fora.
- **Destaque ativo:** a seção visível no momento fica com o ícone em destaque (cor primária + pílula de fundo).
- **Mobile:** em telas pequenas a trilha vira um botão flutuante discreto (ícone de lista) na borda esquerda; ao tocar abre um painel compacto com a lista de seções; ao escolher, fecha e rola. Não sobrepõe a barra de abas inferior existente.
- **Só aparece** quando um paciente está aberto (visão de detalhe), nunca na lista de pacientes. Seções ausentes para aquele paciente não aparecem no menu.
- **Sinalização de risco:** o item "Saúde geral" herda a cor de atenção (âmbar/vermelho) já calculada no card, para o atalho já avisar visualmente.
- Respeita `prefers-reduced-motion` (sem animação de rolagem suave nesse caso).

## Seções contempladas (na ordem da página)

Cabeçalho do paciente, Hipótese diagnóstica, Plano de tratamento, Impressão clínica, Anamnese, Saúde geral, Linha do tempo, Evolução da dor, Mecanismo de dor, Mapa de dor, Comparativo por região, Questionários funcionais, Notas de voz, Notas de sessão, Dinamometria, Arquivos e fotos, Programas de exercícios (HEP), Histórico de avaliações.

## Implementação técnica

1. **Registro de seções** — novo `src/components/dashboard/patient-evolution/patientSections.ts`: lista ordenada de `{ id, icon, label: { pt, en, es } }`, reaproveitando os ícones lucide já usados em cada card (`Stethoscope`, `ClipboardList`, `HeartPulse`, `Activity`, `NotebookPen`, `Dumbbell`, `FileText`, etc.).
2. **Âncoras** — em `PatientDetailView.tsx`, envolver/anotar cada bloco existente com `id` correspondente e `scroll-mt-24` (hoje só `saude-geral` tem id). Mudança puramente de marcação, sem mexer no conteúdo dos cards.
3. **Componente** — novo `src/components/dashboard/patient-evolution/PatientSectionRail.tsx`:
   - Recebe a lista de ids presentes e um `riskLevel` opcional.
   - `IntersectionObserver` sobre os ids para o item ativo (rootMargin ajustado para o topo).
   - `hover`/`focus`/click controlam a expansão; `Escape` e clique fora fecham.
   - Rolagem via `scrollIntoView({ behavior, block: "start" })`.
   - `aria-label`, `nav`/`ul` semânticos e `title` nos ícones quando recolhido.
4. **Integração** — renderizado dentro de `PatientDetailView.tsx` (apenas quando há paciente selecionado), posicionado `fixed left-1 top-1/2 -translate-y-1/2 z-40`, escondendo-se atrás do breakpoint mobile via variante compacta.
5. **Presença dinâmica** — o registro é filtrado pelas mesmas condições que já governam cada bloco (ex.: sem dinamometria, sem HEP), para não gerar atalho morto.
6. Sem mudanças de backend, dados ou lógica clínica.
