# Diagnóstico Diferencial Assistido (só quando a confiança não é alta)

Ferramenta discreta que, quando a hipótese da IA tem confiança **baixa ou moderada**, oferece ao profissional de 2 a 4 hipóteses "concorrentes" reais, com o motivo clínico de diferenciar e o que fazer para decidir.

## Princípios

1. **Não intrusivo**: nada aparece quando `confidence === "high"`. Nos outros casos entra apenas uma linha discreta ("Confiança moderada — ver diferenciais"), colapsada por padrão. Nada de modal automático, nada de bloqueio de fluxo.
2. **Sob demanda e barato**: o diferencial só é gerado quando o profissional clica. Depois de gerado fica salvo na avaliação (sem regerar a cada abertura), com botão "Regenerar".
3. **Concorrência real, não lista de livro**: cada alternativa precisa disputar a explicação do quadro atual. Alternativas sem ancoragem nos dados do paciente são descartadas.
4. **Fecha em decisão**: cada diferencial termina em um discriminador prático (teste, pergunta, medida ou resposta ao tratamento), não em "considerar".
5. **A palavra final é do profissional**: o resultado alimenta a Hipótese Final já existente (override), nunca sobrescreve nada sozinho.

## O que cada diferencial contém

- **Hipótese alternativa** (rótulo curto, mesmo padrão de escrita da hipótese principal).
- **Plausibilidade**: alta / média / baixa.
- **Por que compete**: quais achados do paciente ela explicaria igual ou melhor (dor referida, padrão temporal, mecanismo, escores, assimetria de força, ADM, mapa de dor).
- **O que fala contra**: o achado que hoje sustenta a hipótese principal.
- **Como diferenciar**: 1 a 3 discriminadores concretos — teste ortopédico/funcional, pergunta de anamnese ainda não feita, medida objetiva (dinamometria/ADM), ou teste terapêutico com resposta esperada.
- **Por que importa**: consequência prática de errar (muda a conduta, muda o prognóstico, exige encaminhamento/imagem, contraindica carga).
- **Bandeira de encaminhamento** quando a alternativa for extra-musculoesquelética (visceral, vascular, inflamatória sistêmica, neurológica central).

## Raciocínio clínico que guia a IA

- **Diferencial por eixos, não por lista**: (a) mesma região, outra estrutura; (b) dor referida / fonte proximal (ex.: coluna cervical para ombro, lombar para quadril, quadril para joelho); (c) mecanismo dominante distinto (nociceptivo x neuropático x nociplástico, usando a triagem já existente); (d) causa sistêmica/não musculoesquelética; (e) fase/estágio diferente da mesma condição (irritabilidade x degeneração x instabilidade).
- **Obrigatório usar o que já está no prontuário**: anamnese, mapa e extensão de dor, mecanismo de dor, red flags, saúde geral (HAS/diabetes/cardiopatia/medicação), testes funcionais, questionários com subescalas, dinamometria e ADM, notas de evolução.
- **Regras de segurança**: se houver red flag ativa ou risco vermelho em saúde geral, o diferencial obriga uma alternativa de triagem médica e o texto deixa claro que o encaminhamento precede qualquer progressão de carga.
- **Assimetrias, padrão de dor noturna, dor não mecânica, falha de resposta a tratamento prévio e discrepância entre escore funcional e dor relatada** são gatilhos explícitos para levantar alternativas.
- Máximo 4 alternativas. Sem repetir a hipótese principal com outro nome.

## Onde aparece

**1. Prontuário — card "Hipótese Diagnóstica"**
Linha discreta abaixo da hipótese, apenas com confiança baixa/moderada e sem hipótese final registrada ainda. Ao expandir, lista os diferenciais em cartões compactos. Dois atalhos por diferencial: "Adotar como hipótese final" (abre o editor já preenchido, com justificativa) e "Adicionar discriminadores aos testes/observação da sessão".

**2. Fluxo de avaliação manual (PRO)**
Após a geração da hipótese, na tela de revisão: se confiança baixa/moderada, aparece um bloco recolhido "Refinar antes de fechar". Traz os mesmos diferenciais, priorizando discriminadores que ainda podem ser coletados naquele atendimento (teste ou pergunta), com opção de anexar 1-2 testes sugeridos à etapa de testes funcionais e seguir. Ignorar é um clique.

**3. Relatório PDF (opcional, desligado por padrão)**
Um bloco curto "Diagnósticos diferenciais considerados" só se o profissional marcar. Reforça a qualidade documental sem poluir o laudo do paciente.

**4. Agente de Raciocínio Clínico**
Comando para aprofundar um diferencial específico em conversa, aproveitando o contexto do paciente da thread.

## Fora de escopo (proposital)

- Nada para o paciente: o diferencial é ferramenta profissional, não aparece no painel pessoal nem em avaliação basic/premium self-service.
- Não gera plano de tratamento alternativo.
- Não muda a hipótese automaticamente nem recalcula confiança.

## Detalhes técnicos

- Nova edge function `generate-differential-diagnosis`: recebe id da avaliação, monta o contexto clínico completo no servidor (mesma estratégia de `generate-diagnosis`), chama Lovable AI com saída estruturada e retorna `{ differentials[], generatedAt, model }`. Reusa a lógica de extração JSON em 4 camadas e a `SECURITY_POLICY` do agente.
- Persistência dentro de `assessments.diagnosis.differentialDiagnosis` (sem migração de schema) ou coluna própria `differential_diagnosis` jsonb se preferirmos indexar depois. Começaria pelo campo dentro de `diagnosis`.
- Gate único e reutilizável em `src/lib/differentialDiagnosis.ts`: `shouldOfferDifferential(assessment)` → confiança em `low|moderate`, hipótese existente, sem hipótese final, modo profissional/clínica.
- UI: `DifferentialDiagnosisPanel.tsx` (colapsável, usado no prontuário e no fluxo manual) + entrada em `PATIENT_SECTIONS` só quando houver conteúdo, seguindo a regra atual de não exibir seções vazias.
- Créditos de IA: consumo contabilizado como as outras chamadas; erros do gateway (402/403/429) exibidos na UI conforme o contrato atual.
- Textos em pt/en/es e atualização de `Support.tsx` + `ClinicSupport.tsx` na mesma entrega.

## Pontos abertos

1. Incluir também confiança **alta** com um "diferencial de segurança" mínimo (1 alternativa crítica), ou manter só baixa/moderada?
2. Gerar automático em background quando a confiança for baixa (pronto ao abrir) ou sempre exigir clique?
3. Os discriminadores devem poder virar automaticamente testes na próxima reavaliação/HEP, ou só sugestão textual?
