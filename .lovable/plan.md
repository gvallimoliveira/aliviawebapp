

## Validação de CREFITO no Cadastro Profissional

### Problema
O campo CREFITO é obrigatório no front-end mas aceita qualquer texto. Não há validação de formato nem verificação de duplicidade. Qualquer pessoa pode se cadastrar como fisioterapeuta inserindo texto aleatório.

### Solução

Implementar validação em 3 camadas:

**1. Validação de formato no front-end (`ProfessionalRegister.tsx`)**
- Regex para formato CREFITO brasileiro: `^\d{1,6}-[A-Z]$` (ex: `359566-F`, `12345-G`)
- Normalizar input: uppercase automático, trim
- Mensagem de erro clara: "Formato inválido. Use o padrão: 123456-F"
- Máscara visual no input com placeholder "000000-F"

**2. Verificação de duplicidade no front-end**
- Antes do submit, consultar `professionals` para verificar se o CREFITO já está em uso por outro `user_id`
- Mensagem: "Este CREFITO já está cadastrado por outro profissional"

**3. Constraint no banco de dados (migração SQL)**
- Tornar `crefito` NOT NULL na tabela `professionals` (já é obrigatório no front)
- Adicionar UNIQUE constraint no campo `crefito` para impedir duplicatas no nível do banco
- Adicionar CHECK constraint de formato via regex no Postgres

```sql
ALTER TABLE public.professionals 
  ALTER COLUMN crefito SET NOT NULL;

ALTER TABLE public.professionals 
  ADD CONSTRAINT professionals_crefito_unique UNIQUE (crefito);

ALTER TABLE public.professionals 
  ADD CONSTRAINT professionals_crefito_format 
  CHECK (crefito ~ '^\d{1,6}-[A-Z]$');
```

**4. Exibição no painel admin (`ProfessionalManagement.tsx`)**
- Destacar visualmente o CREFITO na tabela de pendentes para facilitar verificação manual pelo admin
- Adicionar link clicável para pesquisa no site do COFFITO (consulta pública)

**5. Traduções (`LanguageContext.tsx`)**
- `prof.crefito_invalid_format` — "Formato inválido. Ex: 123456-F"
- `prof.crefito_already_registered` — "Este CREFITO já está cadastrado"
- `prof.verify_crefito` — "Verificar no COFFITO"

### Arquivos alterados
- **Nova migração SQL** — constraints NOT NULL, UNIQUE, CHECK
- **ProfessionalRegister.tsx** — validação de formato + verificação de duplicidade
- **ProfessionalManagement.tsx** — link de verificação COFFITO
- **LanguageContext.tsx** — novas traduções

