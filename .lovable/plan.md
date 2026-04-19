
Objetivo: corrigir de forma estrutural todo o fluxo de link de pré-avaliação personalizado para profissionais e clínicas, garantindo que:
- o link público abra corretamente
- o paciente sem cadastro consiga entrar, ver o welcome e concluir a pré-avaliação
- a avaliação fique vinculada ao profissional/clínica corretos
- o paciente alimente a listagem existente sem duplicações indevidas
- não haja regressão nos fluxos já funcionando

O que a revisão do código mostrou

1. O fluxo profissional está só parcialmente corrigido
- `ProfessionalAssessment.tsx` já usa RPC pública segura para validar o profissional e buscar o paciente por token.
- Porém o link personalizado é gerado em `PatientEvolutionDashboard.tsx` com `window.location.origin`, não com `getPublicOrigin()`.
- Isso pode copiar domínio incorreto em preview/ambientes intermediários.

2. O fluxo da clínica está estruturalmente incompleto
- `ClinicAssessment.tsx` ainda consulta `clinics` diretamente com `.from("clinics")`.
- Para visitante/paciente sem login, isso depende de RLS pública e não segue o mesmo padrão seguro do fluxo profissional.
- Pior: a página da clínica nem lê `?patient=token`, então o “link personalizado” por paciente da clínica hoje não fecha o ciclo.

3. O vínculo paciente ↔ avaliação ainda não está robusto
- Ao concluir a avaliação, o código tenta inserir um novo paciente em `patients`.
- Se o paciente já existia e recebeu link personalizado, o comportamento correto deveria ser atualizar/vincular o cadastro existente, não criar outro.
- Isso explica risco de duplicação e perda da promessa “cair no card certo do paciente”.

4. A geração do link personalizado está centralizada no lugar errado
- Hoje o token é criado/adicionado direto no dashboard, inline.
- Não existe uma camada central para “garantir token + montar URL pública + respeitar profissional/clínica”.
- Isso aumenta o risco de novos retrocessos.

5. Há inconsistência entre link geral e link personalizado
- Link geral: profissional/clínica.
- Link personalizado: depende de `assessment_token`.
- Mas as páginas públicas não estão espelhadas entre si: profissional trata token; clínica não.

Plano de correção definitiva

1. Consolidar a arquitetura do link público
- Criar um padrão único para geração de links públicos:
  - base pública sempre via `getPublicOrigin()`
  - rota correta por contexto:
    - profissional: `/assessment/professional/:professionalId`
    - clínica: `/assessment/clinic/:clinicId`
  - token do paciente opcional via `?patient=...`
  - reavaliação opcional via `?reassessment=...`
- Remover qualquer montagem de URL pública com `window.location.origin` nos fluxos de avaliação.

2. Padronizar acesso público com RPCs seguras
- Manter o padrão já iniciado no fluxo profissional.
- Adicionar equivalente para clínica:
  - função pública segura para retornar apenas dados mínimos da clínica e se ela está apta a receber pré-avaliação
- Assim, visitante anônimo nunca dependerá de leitura direta sensível de tabela para abrir o link.

3. Completar o fluxo personalizado da clínica
- Fazer `ClinicAssessment.tsx` ler `searchParams.get("patient")`.
- Buscar o paciente por token usando a RPC já existente com `_clinic_id`.
- Pré-preencher nome/email quando houver token válido.
- Exibir mensagem de “link personalizado” igual ao fluxo profissional.
- Bloquear edição do nome quando o link estiver vinculado a paciente existente, se isso for a regra desejada já usada no fluxo profissional.

4. Corrigir a vinculação no final da avaliação
- Ao concluir uma avaliação com `patient` token:
  - localizar o paciente existente
  - atualizar o cadastro existente com dados complementares faltantes (CPF, nascimento etc. quando fizer sentido)
  - evitar novo insert cego em `patients`
- Só criar novo paciente quando:
  - não houver token personalizado
  - e ainda não existir um paciente correspondente no contexto atual
- Aplicar isso tanto para profissional quanto para clínica.

5. Blindar a relação com a listagem de pacientes
- Garantir que a avaliação gerada preserve vínculo com:
  - `professional_id` ou `clinic_id`
  - nome/email corretos do paciente
  - eventual `original_assessment_id` quando for reavaliação
- Revisar a lógica de merge da listagem (`PatientEvolutionDashboard`) para que o card do paciente reconheça corretamente os casos:
  - paciente com email
  - paciente sem email
  - paciente criado manualmente
  - paciente vindo de link personalizado
- O objetivo é evitar duplicata por nome/email quando já existe `patientRecord`.

6. Centralizar a geração do token/link
- Extrair do dashboard a lógica de:
  - gerar token quando não existir
  - persistir token no paciente
  - construir URL pública final
- Usar helper reutilizável para profissional e clínica.
- Isso reduz retrocesso e evita divergência entre os botões de copiar link.

7. Revisar segurança e regras de dados
- Confirmar que o acesso público expõe só o mínimo necessário.
- Manter PII protegida, sem reabrir política pública ampla em `patients`.
- Continuar usando RPC/SECURITY DEFINER para lookup por token, em vez de SELECT público irrestrito.

8. Validar ponta a ponta com cenários reais
- Testar manualmente estes cenários após implementar:
  1. link geral do profissional abre normalmente
  2. link personalizado do profissional abre com nome pré-preenchido
  3. avaliação concluída cai no card correto do paciente
  4. link geral da clínica abre normalmente
  5. link personalizado da clínica abre com nome pré-preenchido
  6. avaliação concluída entra no pool/listagem correta da clínica
  7. reavaliação continua funcionando
  8. paciente sem cadastro no app conclui tudo sem bloqueio
  9. links copiados do dashboard usam domínio público correto

Resultado esperado
- Nenhum link de pré-avaliação aparecendo como indisponível por erro estrutural do fluxo.
- Profissional e clínica passam a seguir o mesmo padrão confiável.
- O paciente não precisa ter conta.
- O cadastro/listagem do paciente continua sendo alimentado corretamente.
- Menor chance de retrocesso porque geração, validação e vínculo ficam padronizados.

Detalhes técnicos
- Arquivos principais a revisar:
  - `src/pages/ProfessionalAssessment.tsx`
  - `src/pages/ClinicAssessment.tsx`
  - `src/components/dashboard/PatientEvolutionDashboard.tsx`
  - possivelmente `src/components/dashboard/ProDashboard.tsx`
  - `src/lib/getPublicOrigin.ts`
- Backend:
  - nova RPC pública segura para contexto da clínica
  - possível ajuste na RPC de contexto do paciente, se precisar retornar dados extras mínimos para vínculo
- Cuidado principal:
  - não quebrar o fluxo atual de reavaliação
  - não quebrar a listagem existente do dashboard
  - não reintroduzir leitura pública insegura da tabela `patients`
