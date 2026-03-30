

## Migração do sistema de traduções para i18next + arquivos JSON + Espanhol

### Situação atual

O arquivo `src/contexts/LanguageContext.tsx` contém **2.167 linhas** com todas as traduções PT e EN inline em um objeto gigante. São ~1.080 chaves por idioma. O sistema usa `useLanguage()` com `t("chave")` em **50 arquivos**. Suporta apenas 2 idiomas com toggle simples.

### O que será feito

1. **Instalar `react-i18next` + `i18next`** — biblioteca padrão da indústria para internacionalização em React
2. **Extrair traduções para arquivos JSON separados**: `src/locales/pt.json`, `src/locales/en.json`, `src/locales/es.json`
3. **Criar configuração i18next** em `src/i18n.ts` com detecção de idioma do navegador e fallback para PT
4. **Reescrever `LanguageContext.tsx`** para usar i18next internamente, mantendo a mesma API `useLanguage()` / `t()` / `language` / `toggleLanguage()` — zero mudanças nos 50 arquivos consumidores
5. **Adicionar espanhol (ES)** como terceiro idioma, com traduções completas
6. **Atualizar o toggle de idioma** no Header para suportar 3 idiomas (PT → EN → ES → PT)

### Abordagem de compatibilidade (baixo risco)

O `LanguageContext` continuará exportando `useLanguage()` com a mesma interface `{ language, toggleLanguage, t }`. Internamente, `t()` delegará para `i18next.t()`. Isso significa **nenhuma alteração nos 50 arquivos que consomem traduções** — a migração é transparente.

### Estrutura dos arquivos JSON

```text
src/
  locales/
    pt.json    (~1.080 chaves extraídas do objeto atual)
    en.json    (~1.080 chaves extraídas do objeto atual)
    es.json    (~1.080 chaves — tradução espanhol LATAM)
  i18n.ts      (configuração i18next)
```

### Toggle de idioma

O `toggleLanguage` passará a ciclar entre 3 idiomas. O botão no Header exibirá a sigla do próximo idioma (como já faz hoje com "EN"/"PT"), agora incluindo "ES".

Tipo `Language` atualizado para `"pt" | "en" | "es"`.

### Alterações

| Ação | Arquivo |
|------|---------|
| Instalar | `react-i18next`, `i18next` via package.json |
| Criar | `src/locales/pt.json` — chaves extraídas do objeto PT atual |
| Criar | `src/locales/en.json` — chaves extraídas do objeto EN atual |
| Criar | `src/locales/es.json` — traduções espanhol LATAM |
| Criar | `src/i18n.ts` — configuração i18next |
| Editar | `src/contexts/LanguageContext.tsx` — reescrever para delegar ao i18next, manter API pública |
| Editar | `src/components/Header.tsx` — toggle 3 idiomas |
| Editar | `src/main.tsx` — importar `src/i18n.ts` |

### Observações

- As ~1.080 chaves de espanhol serão traduzidas com vocabulário LATAM (ustedes, avaluación, etc.)
- Pluralização e interpolação ficam disponíveis nativamente via i18next para uso futuro
- Nenhum arquivo consumidor (`t("chave")`) precisa ser alterado

