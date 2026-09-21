---
name: Studio Brand Sharing
description: Compartilhar uma marca do Studio com outra conta Aliv.iA — membros por e-mail, acesso total à marca, cota do criador.
type: feature
---

# Compartilhar marca do Studio

- Tabela `studio_brand_members` (`brand_id`, `email`, `user_id` nulo até o 1º acesso, `invited_by`, `revoked_at`, único `(brand_id, email)`).
- Helpers SECURITY DEFINER: `studio_brand_owner`, `studio_current_email`, `can_access_studio_brand`, `claim_studio_brand_invites` (casa convite feito antes do cadastro), `studio_brand_credit_status`, `consume_studio_generation_for_brand`.
- RLS de membro nas tabelas do Studio (`studio_brands` SELECT/UPDATE; creations, photos, texts, phrase_memory, copy_learning, brand_briefs, director_runs ALL) + bucket `studio-photos`.
- Membro faz tudo dentro da marca (gerar, editar, baixar, fotos, kit). Só o criador convida, remove e exclui a marca.
- Marca compartilhada NÃO conta no limite de marcas do membro; gerações debitam a cota do criador (`useStudioQuota(brandId)`).
- UI: `BrandMembersCard` (etapa 7 "Pessoas com acesso", só dono) e selo "Compartilhada" no hub (`brandSharing.ts`: `isOwnBrand`, `isSharedBrand`, `countOwnBrands`).
