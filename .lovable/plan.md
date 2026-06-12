# Plano — Alivia Acadêmico + Cupom souibmr

Objetivo: liberar a palestra de amanhã com duas funcionalidades de baixo risco, reaproveitando ao máximo o que já existe (assinatura PRO, dashboard, PDFs, links de avaliação).

---

## 1. Modo "Acesso Estudante" em Minha Conta

### Conceito

O estudante continua sendo um registro na tabela `professionals` (para reaproveitar 100% do fluxo PRO: dashboard, agenda, prontuário, PDFs, links, agente de raciocínio, etc.), mas marcado como `is_student=true`. Isso evita criar um segundo tipo de usuário e mantém o risco mínimo.

A diferença para o profissional comum:

- **CREFITO deixa de ser obrigatório** (validação ignorada quando `is_student=true`).
- **Não aparece na busca pública** (`active=false` e `approved=false` por padrão — já é o comportamento atual de novos cadastros).
- **Não pode receber pacientes via marketplace** nem ser vinculado a uma clínica como terapeuta responsável (bloqueio simples).
- **Disclaimer "Alivia Acadêmico"** aparece em PDFs, link de avaliação e cabeçalho do dashboard, sempre com o nome do estudante e instituição.

### Onde fica o toggle

Na página `src/pages/Account.tsx`, novo card "Acesso Estudante" com:

- Switch "Sou estudante de fisioterapia".
- Ao ativar, abre um mini-form: **nome completo**, **instituição de ensino**, **período atual** (1º a 10º).
- Salva e cria/atualiza o registro em `professionals` com `is_student=true`, `crefito=null`, `full_name`, e novos campos `student_institution`, `student_period`.
- Pode desativar depois (toggle off) — apenas alterna a flag; dados permanecem.

### Backend (1 migração pequena)

Na tabela `professionals`:

- `is_student boolean default false`
- `student_institution text`
- `student_period text`

Ajuste no trigger `validate_crefito_format()` para pular validação quando `is_student = true` ou `crefito is null`.

### Pontos de uso do disclaimer

- `src/utils/generatePdf.ts` — bloco de rodapé/assinatura: substitui CREFITO por "Alivia Acadêmico · {Instituição} · {Período}".
- `src/pages/ProfessionalAssessment.tsx` (link público de avaliação) — banner sutil "Avaliação acadêmica — Alivia Acadêmico".
- `src/lib/getResponsibleProfessional.ts` — quando `is_student`, devolve label "{Nome} — Alivia Acadêmico" em vez de "CREFITO {...}".
- `CrefitoCompletionBanner.tsx` — não mostrar para estudantes.

### Restrições adicionais (segurança/UX)

- Bloquear `professionals.approved = true` enquanto `is_student=true` (não entra no marketplace).
- Bloquear convite como terapeuta de clínica institucional (apenas dono/secretário podem; estudante fica como "Solo").

---

## 2. Cupom Stripe `souibmr` — 50% enquanto assinatura ativa

### Características do cupom

- `id`: `souibmr`
- `percent_off`: 50
- `duration`: `forever` (mantém 50% off em todas as renovações enquanto a assinatura existir; cancelou = perde).
- `redeem_by`: 7 dias a partir de amanhã (janela de resgate da palestra).
- `applies_to`: ambos os preços PRO (mensal `price_1TJ4252HgVhVBE8URcx5fMZB` e anual `price_1TJ42L2HgVhVBE8U2fhXuqYT`).
- Promotion code visível: `SOUIBMR` (case-insensitive).

### Aplicação no checkout — reaproveitamento máximo

Em `supabase/functions/create-pro-subscription/index.ts`, adicionar **uma linha** na criação da sessão:

```
allow_promotion_codes: true,
```

Assim o estudante digita `SOUIBMR` no próprio checkout do Stripe e o desconto aplica automaticamente, sem mexer no frontend nem na lógica de assinatura. Funciona para mensal e anual.

Opcional (UX): mostrar um aviso pequeno "Tem um cupom? Aplique no checkout" na tela de upgrade PRO quando `is_student=true`.

### Branding/comunicação

Nada além do cupom — o desconto vitalício é nativo do Stripe (`duration: forever`).

---

## Riscos e mitigação


| Risco                                 | Mitigação                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Quebrar fluxo PRO atual               | Toda lógica nova condicionada a `is_student=true`; default `false` preserva comportamento. |
| Estudante aparecendo no marketplace   | Forçar `approved=false` e bloquear toggle de aprovação enquanto estudante.                 |
| Validação CREFITO travando salvamento | Trigger atualizado para pular quando `is_student=true`.                                    |
| Cupom usado fora da palestra          | `redeem_by` de 7 dias limita janela.                                                       |
| PDFs já emitidos antes do toggle      | Não afeta — disclaimer só vale para PDFs gerados depois.                                   |


---

## Ordem de implementação (quando aprovar)

1. Migração: 3 colunas + ajuste do trigger CREFITO.
2. Card "Acesso Estudante" em `Account.tsx` (toggle + mini-form).
3. Pontos de disclaimer: `generatePdf.ts`, `getResponsibleProfessional.ts`, banner do link público.
4. Bloqueios (`approved`, convite de clínica) e ocultar `CrefitoCompletionBanner` para estudantes.
5. `allow_promotion_codes: true` em `create-pro-subscription`.
6. Criar cupom `souibmr` no Stripe via ferramenta (50% forever, redeem_by 7 dias).

---

## Pontos para você confirmar antes de eu implementar

1. **Estudante continua como `professionals` row** (com `is_student=true`), apenas oculto do marketplace e sem CREFITO — ok? Ou você prefere de fato **nenhuma** linha em `professionals` (custo: replicar muita lógica)?
2. **Mini-form**: nome, instituição, período — algum campo a mais? (ex.: cidade, previsão de formatura?)
3. **Disclaimer no PDF**: posição preferida — substituir o bloco do CREFITO (rodapé/assinatura) ou adicionar uma faixa no topo? Ambos 
4. **Cupom 50% forever**: confirmo `duration: forever` (mantém desconto em toda renovação enquanto a assinatura não for cancelada). Ok?