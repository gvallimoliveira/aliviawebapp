## Causa raiz confirmada

A função ativa `delete_my_assessments` tenta executar:

```sql
DELETE FROM public.assessment_progress
WHERE assessment_id = ...
```

Porém, a tabela `assessment_progress` **não possui a coluna `assessment_id`**; ela armazena rascunhos por `scope_key` e `snapshot`. Isso explica exatamente o erro atual `column "assessment_id" does not exist` e faz toda a transação ser revertida antes de excluir as avaliações.

Também confirmei uma inconsistência remanescente: `delete_all_my_assessments` ainda consulta diretamente a tabela interna de usuários, origem do erro anterior de permissão.

## Implementação

1. Substituir as duas funções de exclusão em uma única migração:
   - remover a referência inválida a `assessment_progress.assessment_id`;
   - manter a autorização por usuário, e-mail autenticado e profissional responsável;
   - alterar `delete_all_my_assessments` para usar o e-mail do token autenticado, sem consultar tabelas internas;
   - preservar a limpeza segura dos relacionamentos reais, respeitando `CASCADE` e `SET NULL` já configurados no banco.
2. Manter a interface usando apenas a função protegida do banco, sem fallback de exclusão direta.
3. Validar a função primeiro com lista vazia e depois conferir o caminho real de exclusão, incluindo retorno da quantidade excluída e ausência dos registros após a operação.
4. Rodar a verificação de segurança do banco após a migração.

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>