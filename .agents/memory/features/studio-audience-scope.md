---
name: Studio Audience Scope
description: Filtro de pertencimento — arte dirigida a um público não cita rótulo de outro público nem tema clínico incompatível (ex.: tendinite em arte de tontura).
type: feature
---

Fonte: `src/pages/studio-pro/audienceScope.ts`, aplicado no fim de `finish()` em
`brandContent.ts` (só quando há público ativo; leitura institucional passa intacta).
Teste: `src/test/studio-audience-scope.test.ts`.

## Regras
- Palavras exclusivas do rótulo/keyword dos OUTROS públicos saem de qualquer slot.
- Público vestibular: nenhum tema musculoesquelético entra. Público com contexto
  (esportista / pós-op / dor crônica): só os temas do próprio contexto.
  Público sem contexto clínico: bloqueia apenas o léxico vestibular (anatomia
  geral é de todos).
- Palavras genéricas da área (fisioterapia, avaliação, tratamento, paciente,
  plano, domicílio…) nunca identificam público.
- Pool que ficaria vazio é preservado; exceção: `kickers` cai para a
  palavra-chave do próprio público (corrige o selo "TENDINITE FISIOTERAPIA").
