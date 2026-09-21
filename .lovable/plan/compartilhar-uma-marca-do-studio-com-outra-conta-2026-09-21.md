# Compartilhar uma marca do Studio com outra conta

Hoje cada marca do Studio pertence a uma única conta: tudo (kit da marca, artes, fotos, textos autorais, memórias do motor) só é visível para quem criou. A ideia é permitir que o criador da marca convide outras pessoas por e-mail — solução global, para qualquer marca e qualquer conta Aliv.iA, não um caso específico.

## O que o usuário vai ver

- Nos ajustes da marca, uma seção **Pessoas com acesso**: lista de membros (nome/e-mail, quem convidou, data) e um campo para convidar por e-mail.
- Convite por e-mail funciona antes do cadastro: ao entrar no Studio com aquele e-mail, a marca já aparece.
- No hub de marcas, marcas recebidas aparecem junto das próprias, com o selo **Compartilhada**.
- O membro faz tudo dentro da marca: gerar, editar textos/artes, baixar, favoritar, mover de pasta, subir fotos e ajustar o kit da marca.
- Somente o criador pode excluir a marca, convidar ou remover membros.
- Marca compartilhada **não** consome o limite de marcas do membro, e as gerações feitas nela usam a cota do criador (a marca é do criador; o convidado não precisa de plano).

## Como fica a divisão de papéis

| Ação | Criador | Membro |
| --- | --- | --- |
| Gerar, editar, baixar, organizar artes | sim | sim |
| Fotos e textos autorais da marca | sim | sim |
| Ajustar kit/manual da marca | sim | sim |
| Convidar/remover membros | sim | não |
| Excluir a marca | sim | não |

## Detalhes técnicos

**Banco (uma migração)**

- Nova tabela `public.studio_brand_members`: `id`, `brand_id` (FK `studio_brands` ON DELETE CASCADE), `email` (normalizado), `user_id` (nulo até o convidado existir), `invited_by`, `created_at`, `revoked_at`; único em `(brand_id, email)`. GRANTs para `authenticated`/`service_role` na mesma migração.
- Funções `SECURITY DEFINER` (evitam recursão de RLS):
  - `public.studio_brand_owner(_brand_id uuid) returns uuid`
  - `public.can_access_studio_brand(_brand_id uuid) returns boolean` — true para o dono e para membro ativo casado por `user_id` **ou** pelo e-mail do JWT (`auth.jwt()->>'email'`, comparação em minúsculas).
- Políticas adicionais (mantendo as de dono):
  - `studio_brands`: SELECT e UPDATE quando `can_access_studio_brand(id)`; DELETE continua só do dono.
  - `studio_creations`, `studio_photos` (via `brand_id`), `studio_texts`, `studio_phrase_memory`, `studio_copy_learning`, `studio_brand_briefs`, `studio_director_runs`: ALL quando `can_access_studio_brand(brand_id)`. Em `studio_photos` (hoje sem coluna de marca em algumas linhas) o acesso compartilhado vale só para fotos com `brand_id` da marca compartilhada; acervo sem marca segue privado.
  - `studio_brand_members`: dono da marca gerencia (ALL); membro lê apenas o próprio registro.
- Política de Storage do bucket de fotos: leitura/escrita liberada para quem passa em `can_access_studio_brand` da marca referenciada pela foto.

**Frontend**

- `studio_photos` precisa de `brand_id` preenchido nos uploads feitos dentro do espaço da marca (já existe filtro por `brand_id` em `src/pages/studio/photos.ts`); uploads dentro da marca passam a gravar o `brand_id` ativo.
- Inserções que hoje gravam `user_id: user.id` (artes, textos, memórias) continuam válidas — as políticas passam a autorizar por marca, não por dono.
- `StudioProApp.tsx` (hub): deixa de depender de filtro implícito por dono — lista o que o RLS devolver, marca as recebidas com selo **Compartilhada** e conta o limite de marcas apenas sobre as próprias.
- `StudioProBrand.tsx` (ajustes): novo card `BrandMembersCard` com lista, convite por e-mail (validação de formato), remover acesso e estado vazio explicativo; visível só para o dono.
- `useStudioQuota` / consumo de geração: quando a marca ativa não é do usuário, a geração debita a cota do dono da marca (função de servidor `consume_studio_generation` recebe a marca e resolve o dono).
- Ao logar, um passo leve casa convites pendentes: registros com o e-mail do usuário e `user_id` nulo recebem o `user_id` (função `SECURITY DEFINER` `claim_studio_brand_invites()`), como já ocorre com convites de clínica.

**Testes**

- Teste de acesso: dono vê e edita; membro ativo vê e edita; membro revogado não vê; terceiro não vê.
- Teste de que marca compartilhada não conta no limite de marcas do plano do membro.
