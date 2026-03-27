

## Integrar Microsoft Clarity para Heatmaps e Análise de Comportamento

### O que é

Microsoft Clarity é uma ferramenta gratuita que captura:
- **Heatmaps de clique** — onde os usuários clicam na página
- **Heatmaps de scroll** — até onde os usuários descem
- **Gravações de sessão** — replay completo da navegação do usuário
- **Dead clicks e rage clicks** — detecção automática de frustração
- **Insights automáticos** — métricas de engajamento por página

### Como funciona

1. Você cria uma conta gratuita em [clarity.microsoft.com](https://clarity.microsoft.com)
2. Cria um projeto e obtém o **Tracking ID** (ex: `abc123xyz`)
3. Eu integro o script do Clarity no `index.html` do app
4. Todos os dados ficam disponíveis no dashboard do Clarity

### Como acessar os dados depois

- Acesse [clarity.microsoft.com](https://clarity.microsoft.com) → seu projeto
- **Dashboard**: métricas gerais (sessões, scroll depth, rage clicks)
- **Heatmaps**: selecione qualquer página para ver mapas de calor de clique e scroll
- **Recordings**: assista gravações reais de sessões de usuários
- **Filtros**: filtre por dispositivo (mobile/desktop), país, página específica, etc.

### Implementação técnica

**Arquivo: `index.html`**
- Adicionar o script de tracking do Clarity no `<head>`, antes do fechamento
- O script é um snippet padrão JavaScript fornecido pelo Clarity, com o Tracking ID do projeto

```html
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "SEU_TRACKING_ID");
</script>
```

### Próximo passo

Para implementar, preciso que você:
1. Acesse [clarity.microsoft.com](https://clarity.microsoft.com) e crie uma conta (pode usar conta Microsoft/Google)
2. Crie um novo projeto com a URL `https://aliviawebapp.com.br`
3. Me envie o **Tracking ID** gerado (uma string curta tipo `abc123xyz`)

Com o ID em mãos, eu adiciono o script e o tracking começa automaticamente em todas as páginas.

