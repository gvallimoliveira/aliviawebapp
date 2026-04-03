

# Análise das Indicações + Impressão Clínica na Landing/Suporte

## Sobre as Indicações Recebidas

**Como funciona hoje:**
1. Na página `/buscar-profissional`, pacientes com avaliação premium podem clicar "Solicitar Indicação" em um profissional
2. Isso insere um registro na tabela `professional_referrals` com `patient_user_id` e `professional_id`
3. No Dashboard do profissional (aba Profissional), se há referrals, renderiza `renderReferrals()` — uma lista de cards simples mostrando status

**Está funcional?** A mecânica está implementada mas é bastante básica:
- O card mostra apenas "Indicação de paciente" + badge de status, sem nome do paciente nem data
- Não há notificação ao profissional quando recebe uma indicação
- O profissional não pode aceitar/recusar — apenas visualiza
- Poucos pacientes devem encontrar essa funcionalidade (requer acesso premium + busca de profissional)

**Na página de suporte:** NÃO há menção à Impressão Clínica nas ferramentas profissionais do suporte. As ferramentas documentadas são: Link Personalizado, Estatísticas, Gráficos, Lista de Pacientes, Dashboard de Evolução, PDF, Notas, Assinatura, Perfil, Tratamento Vitalício e Mensagens.

---

## Plano de Implementação

### 1. Landing Page Profissional — adicionar Impressão Clínica como feature

**Arquivo:** `src/pages/ProfessionalLanding.tsx` (linha 67-74)

Adicionar um novo item ao array `features`:
```
{ icon: Brain, key: "b2b.feature_7" }
```

**Traduções (pt/en/es):** Adicionar `b2b.feature_7`:
- PT: "Impressão clínica integrada gerada por IA"
- EN: "AI-generated integrated clinical impression"
- ES: "Impresión clínica integrada generada por IA"

Opcionalmente, trocar o `b2b.feature_5` ("Resumo clínico preliminar") pela impressão clínica, já que ela é a versão evoluída disso. Ou manter ambas.

### 2. Suporte Profissional — adicionar ferramenta "Impressão Clínica"

**Arquivo:** `src/pages/Support.tsx` (linha 36-48)

Adicionar ao array `proTools`:
```
{ key: "clinical_impression", icon: Brain }
```

**Traduções (pt/en/es):** Adicionar:
- `support.pro.tool.clinical_impression.title`: "Impressão Clínica (IA)"
- `support.pro.tool.clinical_impression.desc`: "No detalhe de cada paciente, clique em 'Gerar Impressão Clínica' para obter uma visão integrativa do quadro clínico gerada por inteligência artificial. A IA interpreta a anamnese, regiões de dor, questionários e diagnóstico para entregar um resumo interpretativo e dois objetivos terapêuticos principais (ex: controle álgico, mobilidade, fortalecimento). Essa impressão é salva na avaliação e incluída automaticamente no relatório PDF profissional."

### 3. Arquivos a alterar

1. `src/pages/ProfessionalLanding.tsx` — adicionar feature_7 (Brain)
2. `src/pages/Support.tsx` — adicionar clinical_impression ao proTools
3. `src/locales/pt.json`, `en.json`, `es.json` — novas chaves de tradução

