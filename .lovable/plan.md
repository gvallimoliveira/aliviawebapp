## Plano: Mini Landing Page para Profissionais (`/profissionais`)

### Objetivo

Criar uma pagina dedicada em `/profissionais` que funciona como mini landing page B2B. O link "Para Profissionais" no header passara a apontar para esta pagina em vez de `/professional/register`. A pagina apresenta beneficios, funcionalidades do painel, preco e CTA de cadastro/login.

### Nova pagina: `src/pages/ProfessionalLanding.tsx`

Estrutura da pagina:

1. **Header** com logo + botao "Ja sou profissional" (leva ao `/professional/register` ou `/auth`)
2. **Hero** com titulo forte ("Transforme sua pratica clinica com IA: esteja um passo a frente dos demais"), subtitulo e CTA principal
3. **Beneficios** - Reutiliza os 4 cards de beneficios ja existentes no `ProfessionalSection` (economia de tempo, assertividade, relatorios, produtividade)
4. **Como funciona** - 3-4 passos visuais: Cadastre-se, Gere seu link, Envie ao paciente, Receba o relatorio
5. **Funcionalidades do Painel** - Lista de features: link personalizado, dashboard com relatorios, nome do paciente, hipotese diagnostica IA, resumo clinico
6. **Preco** - Card com R$49/mes, lista de inclusoes, CTA "Comecar agora"
7. **FAQ** curto (2-3 perguntas especificas para profissionais)
8. **Footer** simples

### Arquivos editados


| Arquivo                                  | Mudanca                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `src/pages/ProfessionalLanding.tsx`      | Nova pagina (mini landing B2B)                                      |
| `src/App.tsx`                            | Rota `/profissionais`                                               |
| `src/components/Header.tsx`              | Link "Para Profissionais" aponta para `/profissionais`              |
| `src/components/ProfessionalSection.tsx` | CTA aponta para `/profissionais` em vez de `/professional/register` |
| `src/contexts/LanguageContext.tsx`       | Traducoes novas para a mini landing                                 |


### Fluxo do usuario

- Header: "Para Profissionais" → `/profissionais` (mini landing)
- Na mini landing: "Comecar agora" → `/auth` (se nao logado) ou `/professional/register` (se logado)
- Na mini landing: "Ja sou profissional" → `/professional/register`