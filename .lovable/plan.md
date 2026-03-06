

## Plano: Questionarios na AssessmentView + Sugestoes para Regioes Descobertas

### Parte 1: Exibir resultados dos questionarios na AssessmentView

Adicionar uma nova seçao na pagina `AssessmentView.tsx` que renderiza os resultados dos questionarios armazenados em `assessment.test_results`. Para cada questionario respondido, exibir: nome, score total (%), interpretaçao, scores por subescala e barra de severidade colorida. Reutilizar o mesmo layout do `QuestionnaireStep` (results view).

**Arquivo:** `src/pages/AssessmentView.tsx` - Nova Card com `ClipboardCheck` icon, iterando `test_results` (array de `QuestionnaireResult`).

---

### Parte 2: Questionarios validados sugeridos para regioes sem cobertura

**Regioes atualmente cobertas:**
- Lombar/Costas → ODI
- Ombro → SPADI  
- Joelho → KOOS
- Quadril → HOOS
- Tornozelo/Pe → FAOS
- Aquiles → VISA-A

**Regioes SEM questionario:**

| Regiao | Questionario Sugerido | Referencia | Observaçao |
|---|---|---|---|
| **Cotovelo** | **DASH** (Disabilities of the Arm, Shoulder and Hand) | Hudak PL, et al. Am J Ind Med. 1996;29(6):602-8. | Validado em PT-BR. Cobre todo o membro superior. Pode ser usado tambem para punho/mao. Versao reduzida QuickDASH (11 itens) e ideal para app. |
| **Punho/Mao** | **DASH / QuickDASH** | Beaton DE, et al. J Bone Joint Surg Am. 2005;87(5):1038-46. | Mesmo instrumento do cotovelo. Amplamente validado, >30 idiomas. |
| **Cervical** | **NDI** (Neck Disability Index) | Vernon H, Mior S. J Manipulative Physiol Ther. 1991;14(7):409-15. | Padrao-ouro para cervicalgia. 10 itens, formato similar ao ODI. Validado PT-BR (Cook C, et al. 2006). |
| **Cabeça (cefaleia)** | **HIT-6** (Headache Impact Test) | Kosinski M, et al. Qual Life Res. 2003;12(8):963-74. | 6 itens, validado em multiplos idiomas. Amplamente usado em neurologia e fisioterapia. |
| **Toracica/Torax** | **ODI** (reutilizar) ou **RMDQ** (Roland-Morris Disability Questionnaire) | Roland M, Morris R. Spine. 1983;8(2):141-4. | ODI ja cobre parcialmente. RMDQ e alternativa com 24 itens sim/nao, mais rapido. |
| **Coxa (anterior/posterior)** | **LEFS** (Lower Extremity Functional Scale) | Binkley JM, et al. Phys Ther. 1999;79(4):371-83. | 20 itens, cobre todo membro inferior. Validado PT-BR. Util para lesoes musculares de coxa. |
| **Canela/Panturrilha** | **LEFS** | Mesmo acima | Cobre funcionalidade geral do membro inferior. |

**Resumo de priorizaçao recomendada:**

1. **QuickDASH** (11 itens) → cotovelo, antebraço, punho, mão — maior ROI, cobre 4+ regioes com 1 questionario
2. **NDI** (10 itens) → cervical — padrao-ouro, formato identico ao ODI ja implementado
3. **HIT-6** (6 itens) → cabeça/cefaleia — curtissimo, alta relevancia clinica
4. **LEFS** (20 itens) → coxa, canela, panturrilha — cobre regioes residuais do membro inferior

Estes 4 questionarios cobririam todas as regioes restantes do mapa de dor.

