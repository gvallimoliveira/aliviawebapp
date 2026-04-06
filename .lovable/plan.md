## Resposta: Estado Atual dos Dados Mockados

**Hoje, os dados mockados NÃO permitem acesso completo.** A situação atual:

- Os 3 pacientes fictícios (Maria, João, Ana) aparecem apenas como **cards na listagem**, com blur/paywall por cima
- **Nenhum deles** é clicável para abrir uma página de detalhe fictícia -- o click navega para a rota real (`/assessment/:id`) que tenta buscar do banco e falha
- **Não há** dados de questionário fictícios (test_results está vazio nos mocks)
- **Não há** paciente com 2+ avaliações para simular relatório evolutivo
- **Não há** simulação de impressão clínica IA, HEP, ou geração de PDF

---

## Plano: Registro Profissional com Paywall + Ambiente Simulado Completo

### Parte 1 — Registro só após pagamento

1. **Modificar `ProfessionalRegister.tsx**`: Após preencher o formulário, em vez de salvar direto, redirecionar para checkout Stripe (mensal ou anual) passando os dados do perfil como metadata
2. **Modificar `create-pro-subscription` Edge Function**: Receber dados do perfil profissional via metadata e, no `stripe-webhook`, criar o registro na tabela `professionals` somente após confirmação do pagamento
3. **Alternativa mais simples ( dê preferencia a esta )**: Manter o fluxo atual de criar o perfil primeiro, mas marcar `subscription_status = 'pending'` e redirecionar automaticamente para escolha de plano. O profissional só acessa o painel após pagamento confirmado. Esta abordagem é mais resiliente (evita perda de dados se o pagamento falhar).

### Parte 2 — Card de Boas-Vindas pós-pagamento

4. **Criar flag `pro_onboarding_completed**` no localStorage
5. **Adicionar card de boas-vindas** no `ProDashboard` para novos assinantes com botão "Conhecer ambiente simulado"
6. Se o profissional pular, pode acessar depois via toggle

### Parte 3 — Toggle "Painel Pro x Painel Simulado"

7. **Adicionar Switch/Toggle** discreto no header do `ProDashboard` para alternar entre dados reais e dados simulados
8. Quando ativado, o dashboard usa `mockPatientAssessments` em vez dos dados reais

### Parte 4 — Dados Mockados Completos + Navegação Simulada

9. **Expandir `mockPatientData.ts**` significativamente:
  - Adicionar `test_results` com respostas fictícias de questionários (DASH, Oswestry, etc.)
  - Criar 2 avaliações para "Ana Oliveira" (para simular relatório evolutivo)
  - Adicionar `treatment_plan` completo para pelo menos 2 pacientes
  - Incluir `clinical_impression` fictícia
  - Adicionar paciente com red flags para demonstrar o alerta
10. **Criar página de detalhe simulada** ou adaptar `PatientEvolutionDashboard` para reconhecer IDs "demo-*":
  - Quando o ID começa com "demo-", usar dados do mock em vez de buscar no banco
    - Permitir "gerar impressão clínica" que retorna texto fictício pré-definido (sem chamar a IA real)
    - Permitir visualizar tratamento fictício
    - Permitir simular geração de relatório evolutivo (com dados pré-calculados)
    - Bloquear ações reais (PDF real, WhatsApp) com toast "Disponível apenas com dados reais"

### Parte 5 — Fluxo Completo

```text
Landing /profissionais
  → CTA "Começar agora"
  → /auth (login/signup)
  → /professional/register (formulário perfil)
  → Escolha plano (mensal/anual) → Stripe Checkout
  → Pagamento confirmado → /dashboard?tab=professional
  → Card boas-vindas com "Conhecer simulado"
  → Toggle discreto para alternar simulado/real
```

### Arquivos a modificar/criar


| Arquivo                                                  | Ação                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| `src/data/mockPatientData.ts`                            | Expandir com dados completos                |
| `src/components/dashboard/ProDashboard.tsx`              | Adicionar toggle simulado, card boas-vindas |
| `src/components/dashboard/PatientEvolutionDashboard.tsx` | Suporte a dados demo                        |
| `src/pages/ProfessionalRegister.tsx`                     | Redirecionar para checkout após formulário  |
| `supabase/functions/create-pro-subscription/index.ts`    | Aceitar metadata de perfil                  |
| `supabase/functions/stripe-webhook/index.ts`             | Criar perfil profissional no fulfillment    |


### Consideração técnica

A abordagem recomendada para o registro é a **alternativa simples** (Parte 1, item 3): criar o perfil com status pendente e forçar pagamento antes do acesso. Isso evita complexidade no webhook e garante que os dados do formulário não se percam se o pagamento falhar ou demorar (boleto).