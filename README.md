# Aliv.ia Webapp

App de Auto-Manejo de Dor Musculoesquelética e Radicular
Visão Geral
introduza a opcao de uma avaliaçao basica e uma avaliaçao premium.
Aplicativo web com login obrigatório na avaliaçao premium que guia o usuário por uma avaliação completa (anamnese → testes funcionais → hipótese diagnóstica → plano de tratamento), permitindo o auto-manejo de dores musculoesqueléticas e radiculares de forma segura e orientada.

Aplicativo web sem login obrigatório na avaliaçao basica
no caso a basica será gratuita, um pouco mais objetiva e apenas fornecerá uma hipotese diagonostica , sem explicar sobre a disfunçao , sem orientar nenhuma abordagem. de modo que ao optar pela avaliaçao premium,que será paga, no valor de 100 reais, o usuario vai saber que vai receber orientaçoes de manejo da dor, sugestao de exercicios de curto medio e longo prazo. a ideia é que a avaliaçao basica seja uma degustaçao do que o aplicativo pode oferecer na avaliaçao premium




1. Autenticação e Perfil do Usuário
Cadastro e login com email/senha
Perfil básico: nome, idade, sexo, ocupação
Histórico de avaliações anteriores salvo na conta
2. Tela Inicial / Dashboard
Botão principal "Nova Avaliação"
básica ou premium ( tabela de vantagens/ processos incluídos em cada )
Lista de avaliações anteriores com data, região e status
Resumo da última avaliação com progresso do tratamento

3. Etapa 1: Anamnese (Formulário Guiado)
3.1 Triagem de Bandeiras Vermelhas
Perguntas sobre sinais de alerta: trauma recente, perda de peso inexplicada, febre, perda de controle esfincteriano, dor noturna intensa, história de câncer, etc.
Se bandeira vermelha detectada → tela de alerta recomendando avaliação médica urgente, impedindo continuidade
3.2 Coleta da Queixa
Qual a queixa principal? (campo texto + opções comuns)
Como iniciou? (evento desencadeador vs. gradual)
Mapa de Dor Interativo: silhueta SVG do corpo humano, da cabeça aos pés, em 3 vistas (frente, costas, lateral) com regiões anatômicas clicáveis (ombro, cervical, lombar, joelho, quadril, tornozelo, punho, cotovelo,pés etc.)
Tipo de dor: pontual, irradiada, em queimação, formigamento (seleção múltipla)
Evolução: melhorando / estável / piorando (com escala visual)
Movimentos que aliviam e movimentos que pioram (lista de movimentos comuns por região + campo livre)
Nível de atividade física: sedentário / ativo leve / praticante regular / atleta (para avaliar consciência motora)

4. Etapa 2: Testes Funcionais
Testes apresentados com instruções escritas + links de vídeos do YouTube demonstrativos. Cada teste terá duas opções de resposta: "Doloroso/Desconfortável" ou "Sem desconforto".
4.1 Testes de Mobilidade Ativa
Testes específicos por região selecionada no mapa de dor
4.2 Testes de Flexibilidade
Testes de alongamento relevantes à região
4.3 Testes de Força/Resistência
Testes isométricos e de resistência para a região
4.4 Testes de Estabilidade
Testes de controle motor e estabilização
4.5 Testes Neurodinâmicos
Slump test auto-realizado, teste de tensão neural do membro superior, etc.
testes de posiçoes do método mckenzie ( posicoes de extensao ou flexao lombar,cervical)
4.6 Localização de Pontos Gatilho
Instruções para usar bolinha de tênis ou rolo miofascial
Mapa de pontos gatilho comuns por região com indicação de dor referida

5. Etapa 3: Resultado e Plano de Tratamento
5.1 Hipótese Diagnóstica
Baseada nas respostas da anamnese + resultados dos testes
Apresentada em linguagem acessível com explicação do que está acontecendo
Nível de confiança e recomendação de buscar profissional se necessário
5.2 Plano de Tratamento
Curto prazo (1-2 semanas): alívio de dor, exercícios iniciais, orientações posturais
Médio prazo (2-6 semanas): progressão de exercícios, fortalecimento, mobilidade
Longo prazo (6+ semanas): manutenção, prevenção de recidiva, retorno a atividades
Cada exercício com descrição + link YouTube
obs: se nota da dor for inferior a 6, sempre incluir no curto prazo exercicios iniciais de ativaçao muscular, mobilidade e flexibilidade. caso a nota de dor seja superior a 6, o curto prazo deve conter apenas condutas analgesicas, desinflamatórias, sendo bem conservador. 

6. Backend (Lovable Cloud + Supabase)
Banco de dados para: perfis de usuários, avaliações, respostas de anamnese, resultados de testes, planos de tratamento
Autenticação com email/senha
Histórico completo de avaliações por usuário

Escopo da Primeira Versão
Todas as regiões corporais incluídas no mapa de dor, com base de testes e exercícios para as principais queixas musculoesqueléticas e radiculares. O conteúdo clínico (testes, diagnósticos, exercícios) será estruturado de forma que você possa revisar e ajustar conforme necessário.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aliviawebapp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9a266497-f7cd-4496-81f6-84dc1ea4edfb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
