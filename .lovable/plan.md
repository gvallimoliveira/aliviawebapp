## Como está hoje (verificado no código)

`src/pages/ProfessionalAssessment.tsx:92` e `ClinicAssessment.tsx:91` montam a chave do backup assim:

```text
pro:<professionalId>:<patientToken | reassessmentId | "anon">:<steps|full>
```

Consequências reais hoje:

- **Link personalizado (com `?patient=token`) ou reavaliação:** a chave é única por paciente → retomada e sincronização em nuvem funcionam corretamente. Sem problema.
- **Link genérico (primeiro contato):** a chave vira `...:anon:full`, ou seja, **é a mesma para todos os pacientes daquele profissional/clínica**. Não há nuvem (`isSyncableScope` bloqueia `anon`, `src/lib/assessmentAutoResume.ts:145`), mas o backup **local** é compartilhado: no mesmo navegador/aparelho, quem abrir o link genérico dentro de 24h cai automaticamente na tela "Continuar de onde parou" **com nome, e-mail e respostas do paciente anterior** — sem nenhuma checagem de identidade.
- A retomada roda no `step === "welcome"`, **antes** de qualquer identificação (`ProfessionalAssessment.tsx:112`), e aplica o snapshot sozinha.

Ou seja: sua preocupação procede. Hoje o critério é puramente "mesmo dispositivo + mesmo link + 24h", nunca o e-mail. Em tablet de recepção, celular compartilhado ou dois pacientes seguidos no mesmo aparelho, isso vaza dados de um para o outro.

## O que será ajustado

### 1. Link genérico passa a exigir identidade, não dispositivo
O snapshot do link genérico continuará salvo localmente, mas a retomada **não será mais automática no welcome**. O fluxo passa a ser:

1. Paciente abre o link genérico → sempre começa uma avaliação nova, normalmente (nada muda no fluxo habitual).
2. Ele preenche **nome + e-mail** na identificação.
3. Só então o sistema procura um backup daquele link cuja identidade **bate com o e-mail informado** (comparação normalizada: minúsculas, sem espaços; se não houver e-mail, exige nome idêntico).
4. Se bater, aparece a tela "Continuar de onde parou" com as respostas; se não bater, o backup antigo é ignorado e descartado, e a nova avaliação segue limpa.

### 2. Chave passa a incluir a identidade
Para links genéricos a chave ganha um sufixo derivado do e-mail/nome informado (`...:anon:<hash-do-email>`), de modo que dois pacientes no mesmo aparelho tenham backups separados e nunca se sobreponham.

### 3. Nuvem continua desligada no link genérico
Sem token pessoal não existe segredo que prove identidade — usar o e-mail como chave em nuvem permitiria adivinhar o e-mail de outra pessoa e ler as respostas dela. Então o link genérico fica **só com backup local**; a conciliação entre aparelhos permanece exclusiva de link personalizado e reavaliação, onde o token é o segredo.

### 4. Salvaguardas de UX
- A tela de retomada passa a mostrar explicitamente para quem é o rascunho ("Retomando a avaliação de **Maria S.** — maria@…") e um botão "Não sou eu / começar do zero" que apaga o backup na hora.
- Backup do link genérico é apagado imediatamente ao concluir a avaliação (já ocorre) e também quando a identidade não confere.
- TTL de 24h mantido.

## Detalhes técnicos

- `src/lib/assessmentAutoResume.ts`: adicionar `identityKey(name, email)` e gravar `identity` dentro do snapshot; nova função `matchesIdentity(snapshot, name, email)`; `isSyncableScope` mantido como está.
- `ProfessionalAssessment.tsx` / `ClinicAssessment.tsx`: dividir o efeito de retomada em dois caminhos — escopo com token/reavaliação mantém o comportamento atual (auto no welcome, com nuvem); escopo `anon` passa a checar após o envio da identificação, com confirmação obrigatória.
- `ResumeSummary.tsx`: exibir identidade do rascunho e a ação "Não sou eu".
- Nenhuma mudança de schema; `assessment_progress` continua recebendo apenas escopos com token.
