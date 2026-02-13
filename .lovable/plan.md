

# App de Auto-Manejo de Dor Musculoesquelética e Radicular

## Visão Geral
Aplicativo web bilíngue (PT-BR / EN) com design moderno e acolhedor que guia o usuário por uma avaliação de dor musculoesquelética, oferecendo dois modos: **Avaliação Básica** (gratuita, sem login) e **Avaliação Premium** (R$100 por avaliação, com direito a refazer 1x em 7 dias).

---

## 1. Landing Page & Navegação
- Página inicial explicando o propósito do app com visual acolhedor (cores quentes, cantos arredondados)
- Botão de troca de idioma (PT-BR / EN) acessível em toda a aplicação
- Comparativo claro entre Avaliação Básica e Premium em formato de tabela:
  - **Básica**: Anamnese simplificada → Hipótese diagnóstica (sem explicação detalhada, sem plano de tratamento)
  - **Premium**: Anamnese completa → Testes funcionais → Hipótese com explicação → Plano de tratamento (curto/médio/longo prazo) com exercícios
- CTAs para "Começar Avaliação Básica" e "Começar Avaliação Premium"

## 2. Autenticação e Perfil (Premium)
- Cadastro e login com email/senha via Supabase Auth
- Perfil básico: nome, idade, sexo, ocupação
- Login obrigatório apenas para avaliação premium
- Dashboard do usuário logado com:
  - Botão "Nova Avaliação" (escolha básica ou premium)
  - Histórico de avaliações anteriores (data, região, status)
  - Resumo da última avaliação com progresso do tratamento

## 3. Pagamento (Premium)
- Integração com Stripe para pagamento único de R$100 por avaliação
- Direito a refazer a avaliação 1x dentro de 7 dias em caso de piora clínica
- Controle de validade da avaliação no banco de dados

## 4. Etapa 1: Anamnese (Formulário Guiado)
### 4.1 Triagem de Bandeiras Vermelhas
- Perguntas sobre sinais de alerta (trauma recente, perda de peso, febre, perda de controle esfincteriano, dor noturna intensa, história de câncer, etc.)
- Se detectada → tela de alerta recomendando avaliação médica urgente, bloqueando continuidade

### 4.2 Coleta da Queixa
- Queixa principal (campo texto + opções comuns)
- Como iniciou (evento desencadeador vs. gradual)
- **Mapa de Dor Interativo**: silhueta SVG do corpo humano em 3 vistas (frente, costas, lateral) com regiões clicáveis (ombro, cervical, lombar, joelho, quadril, tornozelo, punho, cotovelo, pés, etc.)
- Tipo de dor: pontual, irradiada, queimação, formigamento (seleção múltipla)
- Evolução: melhorando / estável / piorando (escala visual)
- Movimentos que aliviam e que pioram (lista por região + campo livre)
- Nível de atividade física (sedentário / ativo leve / praticante regular / atleta)
- Escala de dor numérica (0-10)

**Na avaliação básica**: anamnese mais objetiva e direta, sem testes funcionais

## 5. Etapa 2: Testes Funcionais (Apenas Premium)
- Testes filtrados pela região selecionada no mapa de dor
- Cada teste com instruções escritas + link de vídeo do YouTube
- Resposta binária: "Doloroso/Desconfortável" ou "Sem desconforto"
- Categorias de testes:
  - Mobilidade ativa
  - Flexibilidade
  - Força/Resistência
  - Estabilidade
  - Neurodinâmicos (Slump test, tensão neural, posições McKenzie)
  - Localização de pontos gatilho (instruções com bolinha de tênis/rolo miofascial, mapa de pontos gatilho com dor referida)

## 6. Etapa 3: Resultado
### 6.1 Hipótese Diagnóstica (Básica e Premium)
- Gerada com base nas respostas da anamnese (+ testes no premium)
- **Básica**: apenas a hipótese, sem explicação detalhada — funciona como "degustação"
- **Premium**: explicação acessível do que está acontecendo, nível de confiança, recomendação de buscar profissional se necessário

### 6.2 Plano de Tratamento (Apenas Premium)
- Adaptado conforme a nota de dor:
  - **Dor < 6**: curto prazo inclui exercícios de ativação muscular, mobilidade e flexibilidade
  - **Dor ≥ 6**: curto prazo conservador, apenas condutas analgésicas e anti-inflamatórias
- Fases:
  - **Curto prazo (1-2 semanas)**: alívio de dor, exercícios iniciais, orientações posturais
  - **Médio prazo (2-6 semanas)**: progressão, fortalecimento, mobilidade
  - **Longo prazo (6+ semanas)**: manutenção, prevenção, retorno a atividades
- Cada exercício com descrição + link YouTube
- Ao final, CTA incentivando upgrade para quem veio da básica

## 7. Backend (Supabase)
- Tabelas: perfis de usuários, avaliações, respostas de anamnese, resultados de testes, planos de tratamento, pagamentos/acessos premium
- Autenticação com email/senha
- Histórico completo de avaliações por usuário
- Controle de validade de 7 dias para refazer avaliação premium
- Conteúdo clínico (testes, exercícios, diagnósticos) estruturado com dados de exemplo para revisão posterior

## 8. Internacionalização (i18n)
- Toda a interface e conteúdo clínico disponível em Português (BR) e Inglês
- Botão de troca de idioma persistente

