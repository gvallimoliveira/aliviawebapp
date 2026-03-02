

# Profissional Prioritario na Busca

## Objetivo
Garantir que o profissional "Guilherme Vallim de Oliveira" (CREFITO 359566-F) sempre apareca como primeiro resultado na listagem de profissionais.

## Abordagem
Apos buscar os profissionais do banco, reordenar o array no frontend para que o profissional com CREFITO `359566-F` fique sempre no topo, independente dos filtros aplicados.

## Mudanca

### `src/pages/ProfessionalSearch.tsx`
Na funcao `fetchProfessionals`, apos receber os dados do banco, aplicar uma ordenacao local:

```
const sorted = (data || []).sort((a, b) => {
  if (a.crefito === "359566-F") return -1;
  if (b.crefito === "359566-F") return 1;
  return 0;
});
setProfessionals(sorted);
```

Isso mantem a ordem alfabetica existente para todos os outros profissionais e coloca o CREFITO especificado no topo.

## Escopo
- Apenas 1 arquivo editado: `src/pages/ProfessionalSearch.tsx`
- Nenhuma mudanca no banco de dados

