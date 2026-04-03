# Aplicar slogan da Aliv.iA em 2 locais + meta description/SEO 

## Slogan

*"O Aliv.iA não é só um app — é um sistema de raciocínio clínico com alma de fisioterapeuta de verdade."*

## Local 1 — Seção "Sobre a Aliv.iA" (Gateway)

**Arquivo:** `src/pages/Gateway.tsx` (linhas 280-281)

Adicionar o slogan como uma citação estilizada (quote block) logo abaixo do texto "Sobre a Aliv.iA", após o parágrafo descritivo. Estilo: itálico, cor `text-primary`, com aspas decorativas ou borda lateral `border-l-4 border-primary`, separado visualmente do texto descritivo com `mt-4`.

## Local 2 — Tela de boas-vindas Premium (UpgradeWelcome)

**Arquivo:** `src/pages/UpgradeWelcome.tsx` (entre a nota de segurança e os CTAs, ~linha 190)

Adicionar o slogan como um bloco motivacional com fundo suave (`bg-primary/5 rounded-xl p-4`), texto centralizado em itálico, fonte `text-sm`, cor `text-primary/80`. Posicionado entre o ícone de segurança e os botões de ação, para reforçar confiança antes da conversão.

## Traduções

**Arquivo:** `src/locales/pt.json`, `en.json`, `es.json`

Nova chave `brand.slogan`:

- PT: `"O Aliv.iA não é só um app — é um sistema de raciocínio clínico com alma de fisioterapeuta de verdade."`
- EN: `"Aliv.iA is not just an app — it's a clinical reasoning system with the soul of a real physiotherapist."`
- ES: `"Aliv.iA no es solo una app — es un sistema de razonamiento clínico con alma de fisioterapeuta de verdad."`

## Arquivos alterados

1. `src/pages/Gateway.tsx` — quote estilizado na seção Sobre
2. `src/pages/UpgradeWelcome.tsx` — bloco motivacional antes dos CTAs
3. `src/locales/pt.json`, `en.json`, `es.json` — chave `brand.slogan`