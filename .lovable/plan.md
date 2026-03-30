## Adicionar informação sobre triagem de Red Flags na Landing e Suporte

### Contexto

A triagem de Red Flags é parte integrante da avaliação. Se detectados sinais de alerta, a avaliação é interrompida por segurança — e isso conta como avaliação realizada. O encaminhamento médico é indispensável. Essa informação precisa ficar clara tanto na landing page do paciente quanto na página de suporte.

### Mudanças

**1. Landing page do paciente — FaqSection (LanguageContext.tsx)**

Adicionar uma nova FAQ (faq6) específica sobre Red Flags:

- PT: **"E se a triagem identificar sinais de alerta (red flags)?"** → Explicação de que a triagem de segurança faz parte da avaliação, que se sinais como trauma grave, perda de peso inexplicada, dor noturna incessante ou dormência progressiva forem detectados, a avaliação é concluída naquele ponto por prerrogativa de saúde, e o encaminhamento médico presencial é indispensável. A avaliação é considerada realizada.
- EN: Equivalente em inglês.

Atualizar `faqKeys` no `FaqSection.tsx` para incluir `"faq6"`.

**2. Página de Suporte — FAQ do paciente (LanguageContext.tsx)**

Atualizar as entradas existentes `pf6` (que já fala sobre red flags) para reforçar que:

- A triagem é parte da avaliação, não uma etapa separada
- Se interrompida por red flags, é considerada avaliação realizada
- O encaminhamento médico é uma prerrogativa de saúde indispensável

Também atualizar a descrição do tool `basic_assessment` e `premium_assessment` no suporte para mencionar que a triagem de segurança está incluída como primeira etapa.

**3. Página de Suporte — tool básico/premium (LanguageContext.tsx)**

Ajustar os textos de `support.patient.tool.basic_assessment.desc` e `support.patient.tool.premium_assessment.desc` para incluir menção à triagem de red flags como etapa integrada.

### Arquivos editados


| Ação   | Arquivo                                                                                     |
| ------ | ------------------------------------------------------------------------------------------- |
| Editar | `src/contexts/LanguageContext.tsx` (novas FAQs + atualização de textos existentes, PT e EN) |
| Editar | `src/components/FaqSection.tsx` (adicionar `faq6` ao array)                                 |
