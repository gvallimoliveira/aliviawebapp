# Mobilidade articular e flexibilidade — importação de arquivo

## O que muda para você
1. **Novo nome da seção:** "Mobilidade articular e flexibilidade" (prontuário, atalho lateral, avaliação manual e PDFs), em pt/en/es.
2. **Botão "Importar de imagem/PDF"** igual ao da dinamometria: envie até 6 fotos/prints ou PDF de goniometria, inclinômetro, app ou ficha; a IA lê e preenche as linhas (movimento, esquerda, direita, observação). Você revisa antes de salvar — nada é salvo sozinho, e linhas já preenchidas não são apagadas.
3. **Métricas de flexibilidade:** sugestões rápidas novas — Elevação da perna estendida (isquiotibiais), Ângulo poplíteo, Sentar e alcançar, Thomas (flexores do quadril), Ely (reto femoral), Dorsiflexão em carga (lunge). Cada linha aceita unidade: graus (°) ou centímetros (cm), já que sentar e alcançar e lunge são medidos em cm.
4. Gráfico de evolução e PDFs mostram a unidade certa por medida; testes sem lado (sentar e alcançar) usam só um valor.

## Detalhes técnicos
- `RomTable.tsx`: renomear títulos/descrição, adicionar chips de flexibilidade, campo `unit` ("°" | "cm") por linha (default "°", compatível com dados antigos), botão de importação replicando o padrão de `StrengthTable` (`disableImport` no demo).
- Nova edge function `extract-rom` (Gemini via gateway, multimodal, 4 camadas de extração JSON), retornando `{ joint, leftValue, rightValue, unit, notes }[]`; consome crédito de IA como a dinamometria.
- `PatientRomSection.tsx`: unidade por movimento no gráfico; `patientSections.ts`, `generatePdf.ts`, `AssessmentView.tsx`: novos rótulos.
- `objective-tests.ts` (`describeRom`): incluir unidade e rotular como mobilidade/flexibilidade para a IA.
- Atualizar Support/ClinicSupport pt/en/es e testes de normalização (novos movimentos agrupam corretamente).
