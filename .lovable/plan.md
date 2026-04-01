# Integrar HIMA, Heavy Slow Resistance e McKenzie na base de conhecimento da IA

## Objetivo

Enriquecer os prompts das Edge Functions `generate-treatment` e `generate-diagnosis` com três protocolos clínicos baseados em evidência, permitindo que a IA sugira exercícios e abordagens mais específicas e atualizadas. com discernimento entre exercicios mais ou menos avançados , lembrando do nivel de atividade fisica e disponibilidade de estrutura de academia ou nao pelo usuario. 

## Alterações

### 1. `generate-treatment/index.ts` — Expandir KNOWLEDGE BASE

Adicionar 3 novos blocos ao system prompt, após as referências existentes:

**HIMA (Holding Isometric Muscle Action):**

- Definição: isometria de manutenção (yielding) onde o paciente sustenta uma posição contra carga submáxima por tempo (10s–45s)
- Diferença entre HIMA (manter posição) e PIMA (pushing — empurrar contra objeto imóvel)
- Exercícios específicos por grupo muscular:
  - Tríceps sural: isometric calf raise hold (plantiflexão sustentada no topo, unilateral, 30-45s)
  - Quadríceps: wall sit (isometria em 60-90° de flexão de joelho, 20-45s); isometric knee extension hold em 30° flexão
  - Glúteos: glute bridge hold (ponte sustentada no topo, 20-30s); single-leg bridge hold
  - Posteriores de coxa: Nordic hamstring isometric hold (posição intermediária sustentada); prone hamstring curl hold
  - Lombar: prone superman hold; bird-dog hold sustentado
  - Adutores: Copenhagen adductor hold (side plank com perna no banco); squeeze ball hold entre joelhos
- Dosagem: 3-5 séries × 10-45s, intensidade submáxima (30-70% contração máxima voluntária)
- Indicações clínicas: dor tendinopática aguda/reativa (efeito analgésico de isometria — Rio et al. 2015), estabilização articular pós-lesão, ativação muscular precoce, fases iniciais (Steps 1-2)
- Referência: Rio et al. (BJSM 2015) — isometric contractions reduce patellar tendon pain; Thacker et al. (2019)

**Heavy Slow Resistance (HSR):**

- Definição: protocolo de fortalecimento com carga pesada e velocidade lenta (3s concêntrico + 3s excêntrico) para remodelação tendínea
- Protocolo original (Kongsgaard et al. 2009 — tendinopatia patelar): squat no decline board, leg press, hack squat — 3x/semana, 12 semanas
- Progressão de carga: semanas 1-2 (15RM), semanas 3-4 (12RM), semanas 5-8 (10RM), semanas 9-12 (8RM → 6RM)
- Adaptação para tendão de Aquiles (Beyer et al. 2015): heel raise com carga progressiva (seated + standing)
- Aplicação para outras tendinopatias de MMII: glúteo médio, posteriores de coxa proximal
- Indicações: tendinopatias em fase degenerativa ou de remodelação (Steps 3-5), quando excêntricos isolados não são suficientes
- Contraindicação relativa: tendão reativo agudo (preferir isometria HIMA primeiro)
- Referências: Kongsgaard et al. (Scand J Med Sci Sports 2009); Beyer et al. (Knee Surg Sports Traumatol Arthrosc 2015)

**Método McKenzie (MDT — Mechanical Diagnosis and Therapy):**

- Definição: sistema de avaliação e tratamento baseado em preferência direcional, usando movimentos repetidos e posições sustentadas
- Princípios: centralização (dor migrando de distal para proximal = bom prognóstico), periferização (contraindicação para continuar na direção)
- Protocolo de extensão para dor lombar discogênica / ciatalgia:
  1. Prone lying (decúbito ventral passivo, 5-10 min)
  2. Prone on elbows (extensão sobre cotovelos, sustentada 2-3 min)
  3. Prone press-up (extensão ativa com braços, 10 reps a cada 2-3h)
  4. Standing extension (extensão em pé com mãos na lombar)
- Protocolo de flexão (para estenose espinal, dor facetária): flexão em decúbito dorsal (joelhos ao peito), flexão sentado, flexão em pé
- Regra clínica: se paciente relata dor irradiada para MMII (ciático), testar extensão; se a dor centraliza (melhora na perna e se concentra na lombar) = continuar extensão; se periferiza = parar e testar flexão
- Dosagem: 10 repetições a cada 2-3 horas na fase aguda; reduzir para 3-4x/dia conforme melhora
- Indicações: herniação/protrusão discal lombar, ciatalgia com centralização, dor lombar mecânica (Steps 1-3)
- Referências: McKenzie & May (2003) "The Lumbar Spine: Mechanical Diagnosis and Therapy"; Lam et al. (Phys Ther 2018) — eficácia do MDT para dor lombar

### 2. `generate-treatment/index.ts` — Regras condicionais

Adicionar lógica no prompt para a IA usar os protocolos no contexto certo:

- Se tendinopatia + dor alta (≥6): usar HIMA na fase curto prazo (analgesia isométrica)
- Se tendinopatia + fase médio/longo prazo: prescrever HSR com progressão de carga
- Se dor lombar com irradiação / ciatalgia / radiculopatia: incluir protocolo McKenzie na fase curto prazo

### 3. `generate-diagnosis/index.ts` — Enriquecer knowledge base

Adicionar as mesmas referências bibliográficas à seção de KNOWLEDGE BASE do diagnóstico para que a IA conheça esses protocolos ao formular recomendações.

### 4. Criar bloco condicional para lombar/radiculopatia no `generate-diagnosis`

Detectar quando há queixa lombar com dor irradiada (pain types incluindo "radiating" ou regiões de perna + lombar) e adicionar bloco de raciocínio clínico mencionando McKenzie e centralização como critério de triagem.

## Detalhes técnicos

- Todas as alterações são nos system prompts das Edge Functions (strings de texto)
- Nenhuma migração de banco necessária
- Nenhuma alteração no frontend
- Os prompts ficam maiores (~2KB adicionais), dentro do limite aceitável