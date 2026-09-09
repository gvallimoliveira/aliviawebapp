---
name: Studio Manual = Questionário
description: Manual da marca em PDF e questionário têm peso igual no motor; a IA preenche o questionário a partir do manual.
type: feature
---
Manual da marca (PDF/imagem) e questionário de marca (`brief_answers`) são fontes de peso
IGUAL para o motor criativo do Studio. Marca que só anexou o manual não pode perder
qualidade nem variedade nas artes.

Implementação: `studio-brand-interpret` devolve `brief_answers` com as 18 chaves do
`brandQuestionnaire.ts` (apresentacao, oferta, diferencial, assinatura, publico_primario,
perfil, dor, desejo, tom, nivel_tecnico, proibidas, cta, fundo, destaque, sensacao,
referencias, nunca_prometer, nao_atrair), preenchidas a partir do manual/site. O servidor
só grava chaves que estavam vazias — resposta escrita à mão nunca é sobrescrita — e retorna
`brief_filled` para o toast do editor de marca.
