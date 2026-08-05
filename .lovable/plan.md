# Dinamometria: extração completa das medidas + scroll estável

## O que está acontecendo

Verifiquei o cache de IA do backend: a última extração dessa imagem (hoje, 23:03) foi salva com apenas uma medida por lado, sem `leftTrials`/`rightTrials` e sem tempo até o pico:

```text
{ "movement": "Joelho Extensão Sentado", "leftValue": "26.1", "rightValue": "24.8" }
```

Dois problemas somados:

1. **Cache sem versão de prompt.** A chave do cache é só (bytes do arquivo + mimeType + idioma). Qualquer melhoria no prompt de extração não invalida resultados antigos — o mesmo arquivo continua devolvendo a extração antiga (1 medida por lado), mesmo depois de ajustarmos as regras.
2. **Extração ainda frágil.** O resultado gravado não trouxe as tentativas, então além do cache o prompt precisa ser mais explícito e o modelo mais capaz para ler tabelas com 2–3 medidas por lado, média e tempo de pico.

Sobre o scroll: não confirmei ainda a origem exata do salto ao topo depois do upload. O plano trata isso preservando a posição de forma explícita, em vez de adivinhar a causa.

## O que vou fazer

### 1. Invalidar cache por versão de prompt
Incluir uma versão (`promptVersion`) na chave do cache da extração de dinamometria. Toda mudança no prompt passa a gerar chave nova, então o mesmo arquivo é reinterpretado com as regras atuais. Também vou apagar as entradas antigas de `extract-dynamometry` para o reteste sair limpo.

### 2. Extração alinhada às métricas que definimos
Reescrever o prompt e a saída da função para capturar, por movimento e por lado:
- todas as medidas/tentativas na ordem em que aparecem (1 entrada por medida, nunca colapsar repetições);
- força máxima e média (média recalculada no backend a partir das medidas, nunca "inventada");
- tempo até o pico por medida, apenas quando existir no laudo (segue opcional);
- unidade (converter N → kgf) e nome do movimento como no laudo.

Reforços técnicos:
- migrar a extração para **saída estruturada via tool/function calling** (schema com `leftTrials`/`rightTrials`), em vez de JSON solto em texto — é o que evita o modelo "resumir" a tabela;
- subir o modelo principal da cadeia para um modelo de visão mais forte, mantendo fallback;
- aumentar o limite de tokens (tabelas com muitas medidas estouravam o teto);
- instruções explícitas de leitura de tabela: percorrer linha a linha, repetir o movimento quando ele aparece em mais de uma linha, e nunca deduplicar por nome de movimento;
- pós-processamento: se o laudo trouxer coluna de média, ela é usada para conferência; divergência grande sinaliza a linha para revisão em vez de descartar dados.

### 3. Manter a tela na seção de dinamometria
- Ancorar a seção de dinamometria e preservar a posição de scroll durante o upload/importação e o salvamento (captura da posição antes e restauração depois do re-render).
- Evitar que o evento de recarregar a lista de pacientes force remontagem/reposicionamento da página quando a origem foi a dinamometria.
- Se após isso o salto persistir, instrumento a página para identificar o disparo exato e corrijo na origem.

### 4. Reteste
Reprocessar a mesma imagem da Eugênia após a mudança e conferir na tabela: nº de medidas por lado, máxima, média, CV%, tempo de pico quando existir, assimetria L/R e agonista/antagonista com o limite de 10%.

## Arquivos envolvidos

- `supabase/functions/extract-dynamometry/index.ts` — prompt, tool schema, modelo, tokens, versão de cache.
- `src/components/assessment/StrengthTable.tsx` — mapeamento das medidas recebidas e preservação de scroll no import.
- `src/components/dashboard/patient-evolution/PatientStrengthSection.tsx` — âncora da seção e preservação de scroll no salvar.
- Limpeza das entradas antigas em `ai_response_cache` para `extract-dynamometry`.
