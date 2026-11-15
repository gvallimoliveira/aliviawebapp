# Roadmap

## Entrada contínua no trial da clínica
- [x] Validar CNPJ antes do envio e apresentar erros amigáveis em todas as entradas.
- [x] Preservar e-mail, WhatsApp, CNPJ e plano na sessão; login/cadastro seguido de ativação autenticada e painel da clínica, sem nova escolha de perfil.
- [x] Ajuda pt/en/es atualizada; 17 testes aprovados e build OK. Cadastro real no computador e login real no celular abriram a mesma clínica; 20 créditos, plano, início do trial, ausência de duplicação e rejeição de conta divergente conferidos. Contas/clínicas técnicas removidas. Não publicado; aparelho físico e cobrança Stripe não exercitados nesta tarefa.

## Agenda — nome específico do serviço no modal
- [x] Serviço exibe o nome personalizado do catálogo (Recovery), com seleção por ID sincronizada ao valor; tipos salvos, filtros e preços preservados. Categoria genérica apenas como fallback de registro antigo sem serviço resolvido.
- [x] 15 regressões da agenda/ditado/evolução passaram; build OK. Modal autenticado em 855×670 com catálogo isolado: Recovery no campo e na lista, sem Personalizado. Nenhuma gravação real nem publicação; cadastro real Recovery não alterado.

## Agenda — evolução em aberto confirma comparecimento
- [x] Evolução disponível em aberto; salvar texto não vazio confirma Compareceu somente após persistência. Falha de status avisa e mantém evolução sem duplicar; classificação manual existente preservada.
- [x] 15 testes aprovados (salvamento, rascunho, vazio, falhas, classificações existentes e regressões de agenda/ditado), build OK. Clínica autenticada → modal em aberto → salvar → Compareceu conferidos em 855×670 com respostas isoladas para não escrever em prontuários reais. Ajuda pt/en/es atualizada. Gravação real e métricas com atendimento real não exercitadas; sem publicação.

## PhysioTech — ticket inválido no paciente Exemplo
- [x] Reproduzido issue 200 → PhysioTech 401 (Dados do ticket inválidos) com o proprietário e oito cargas reais; e-mail não válido no cadastro bloqueava o schema do destinatário. Normalizar somente o contato enviado para null, preservando cadastro, ID, check-in e cargas.
- [x] Função implantada; 11 testes passaram, build OK. Mesmo proprietário/paciente: ticket com contato null e oito cargas → PhysioTech 200 → página Exemplo carregada em computador e celular 390px; check-in recebido. Cadastro original preservado, sem editar sessão clínica. iPhone físico não testado; apresentação das cargas no gráfico do outro projeto não auditada nesta correção de acesso.

## PhysioTech — sessões sRPE e ACWR
- [x] Cargas opcionais em issue/patient e checkin/raiz, pelo paciente autorizado/pid do token; 35 dias inclusivos, até 200 registros já unificados, sem agrupar frentes diferentes. Consulta limitada a 2s; erros omitem ambos os campos.
- [x] Função implantada; 13 testes passaram (paridade com periodization.ts, data de São Paulo, limites, histórico insuficiente, sessão unificada e falhas). Issue → verify → checkin reais retornaram 200, paciente do token e campos corretos; conta autorizada sem sessões recentes, portanto retorno real não vazio/ACWR numérico e visualização no PhysioTech não exercitados. Sem gravações clínicas; ajuda pt/en/es atualizada, build OK.

## Studio — textos e destaques da hospedagem
- [x] Hospedagem usa destaque do assunto, nunca o verbo/adjetivo mais longo; corrige toleras→toalhas e roupas da cama→roupas de cama. Contato sem rastreamento e cartaz com frase completa. Kit real: acrescentado Roupa de cama e banho aos destaques de Interna da casa; demais campos, temas, fotos e destino preservados. Textos atuais do kit já estavam escritos corretamente.
- [x] Conta proprietária → 50 Tons → Interna da casa → Minimalista + Letras empilhadas → geração real conferida com destaque completo e endereço curto; imagens desktop e celular 390px legíveis. 20 testes aprovados (11 novamente após correção do teste), build OK. Não publicou, não alterou artes salvas nem testou iPhone físico; artes anteriores exigem nova versão ou edição.

## Studio — circulação da biblioteca de ganchos
- [x] Hospedagem preserva biblioteca ativa do tema em vez de substituí-la por poucos fatos; rotação prioriza inéditos com identidade estável e histórico sem decaimento, inclusive em lotes rápidos. Ganchos únicos não são deslocados pelas rotas; prioridade factual de software preservada.
- [x] 42 testes aprovados: circulação de 60 ganchos em dez lotes sem repetição, identidade registrada, determinismo, temas isolados, desativação e histórico antes/depois de salvar. Ajuda pt/en/es atualizada, build OK. Conta autorizada → Aliv.iA → modelo Ganchos → Nova versão conferidos com arte visível; 50 Tons não disponível nesta sessão (só Aliv.iA), portanto seu kit real não foi exercitado. Sem alterações em kits, fotos ou artes salvas; não publicado.

## Studio — película e fundo no PNG
- [x] Safari reproduzido sem Canvas.filter: fotos cruas no foreignObject cobriam o repinte filtrado; superfícies translúcidas também lavavam/tonalizavam o PNG. Fotos de fundo pintadas uma vez, fallback de filtros em pixels, fundo neutro/opaco e todas as cores de superfícies ancestrais recompostas atrás da foto.
- [x] Inserções suprimem decoração reversivelmente e reaplicam o escurecimento escolhido após o render; snapshots guardam os estilos originais. Conta autorizada Aliv.iA → inserir foto → PNG real → remover conferidos; 12 PNGs Chromium/WebKit (0/50/100, gradiente e inserção) comparados por pixels, texto preservado e 35 testes aprovados, build OK. Foto anexada usada apenas na sessão, sem gravar acervo/artes. 50 Tons não disponível na sessão autorizada; mecanismo compartilhado validado, iPhone físico e publicação não executados.

## Studio — foto invisível no modelo de moldura
- [x] Erro reproduzido: modelo cinético usava seção 150vh/sticky da landing, deixando a foto fora do quadro. Agora usa seção própria do Studio; seletor reinicia modo/slot e não trata inserções recriadas como fotos originais.
- [x] Conta real Aliv.iA → foto local → fundo → trocar → primeiro plano → PNG → celular 390×844 conferidos, imagens visíveis; 11 testes passaram, build OK. Acervos/artes salvas preservados. Marca 50 Tons indisponível na sessão autorizada: reproduzido e validado no mesmo modelo compartilhado, não em sua marca. Não publicado nem testado em iPhone físico.

## Studio — 50 Tons de Verde
- [x] Controle 0–100% por lote e arte; zero remove película e filtros da imagem, sem exportador reativar overlay invisível. Preferência por marca e ajuste por arte persistem; galeria lê HTML salvo.
- [x] Hospedagem reconhecida pela oferta/nicho, não pelo aplicativo de reservas. Conteúdo e diretor usam fatos da casa/estadia e ignoram rotas genéricas de resultados; interpretação futura atualizada e implantada.
- [x] Área de lazer e Interna da casa refinadas no kit real: IDs, nomes, outros públicos, identidade e 30 fotos preservados. Capacidade mantém até 12 / até 18 sob consulta; sem promessas de segurança total ou avistamento.
- [x] Conta proprietária → ambos os temas → fotos em destaque → película zero → PNG → salvar → galeria → editar para 100 → reabrir conferidos. Celular 390×844 sem overflow, nenhum erro de execução; 68 testes distintos passaram (33 novamente após ajustes). Ajuda pt/en/es atualizada. Três artes técnicas removidas; original preservada. iPhone físico e publicação não executados. Afinidade depende das legendas declaradas; não foi feita nova interpretação visual das 30 fotos.

## Studio — exclusão de fotos da marca
- [x] Controles separados e lixeira de 40px no celular; confirmação/cancelamento e feedback de falha, retorno do ID excluído verificado. Conta própria → marca Aliv.iA → foto técnica enviada → cancelar → confirmar → recarregar conferidos; foto e arquivo técnicos removidos, acervo original preservado. Dez testes passaram, build OK. PhysioTech não disponível nesta sessão; regra compartilhada em todas as marcas. iPhone físico não testado; limpeza de arquivos enviados por outro membro permanece best-effort com aviso interno, sem ampliar permissões.

## Studio — acervo PhysioTech na geração
- [x] Conta proprietária → PhysioTech: sete prints carregados, mas zero fotos nas artes por falta de tópico/afinidade da copy de produto. Diretor agora envia o fato real à seleção; interfaces gerais declaradas podem ilustrar software, sem inventar tópico clínico nem liberar prints específicos em temas errados. Fotos em destaque: 9–12 imagens renderizadas; PNG real de 4,4 MB baixado e inspecionado com foto/texto/logo. 51 testes passaram, build OK; kit/fotos/artes salvas preservados. Publicação e iPhone físico não executados.

## Studio — falha persistente de PNG PhysioTech
- [x] Falha reproduzida com a URL real da logo PhysioTech: imagem visível, fetch bloqueado por CORS e export-failed. Resolução por URL exata usa cópia oficial idêntica já existente no Aliv.iA; vale para tema e snapshots antigos no exportador. Conta proprietária real → PhysioTech → PNG desktop e celular simulado baixados e inspecionados com texto/logo (2160×2160 e 2160×2703); 22 testes passaram, incluindo isolamento de outras marcas, build OK. Não alterou kit, artes salvas nem projeto PhysioTech. iPhone físico e download real de outra marca não exercitados; avisos de CSS remoto de fontes não impediram o download. Requer publicar Aliv.iA.

## Studio — download e leitura PhysioTech
- [x] PNG real baixado em desktop e celular simulado; captura revelou texto ausente por animações de entrada no clone e foi corrigida, PNG final com texto conferido. Celular prepara primeiro e oferece novo toque para entregar. Erro original do iPhone não reproduzido; aparelho físico e marca PhysioTech não disponíveis na sessão (somente Aliv.iA).
- [x] Enumerações de exames viram fatos individuais, com região preservada no apoio; destaque PhysioTech com seis palavras aprovadas. 60 testes passaram; kit e artes salvas preservados, publicação não feita.
- [x] Manual é interpretado como texto, sem extração automática de imagens; galeria aceita imagens separadas, informado ao usuário.

## Studio — essência e demonstração de produtos
- [x] Política compartilhada reserva pelo menos 90% das unidades editoriais de software para fatos declarados do produto; carrosséis contam uma vez e lotes pequenos arredondam para cima. Inclui Aliv.iA com acervos canônicos por público; sem alterar kits salvos ou cobrança.
- [x] Públicos, segurança clínica, marcas de atendimento e geração local preservados; ajuda pt/en/es e sete testes novos. 117 testes distintos aprovados; build OK. Regra arquitetural registrada no AGENTS do Studio (raiz sem espaço).
- [x] Conta real → Aliv.iA → Profissional → 19 artes → PNG conferidos, sem erros; celular sem transbordamento. Não salvou artes nem publicou. PhysioTech não está acessível na sessão atual (só Aliv.iA): geração real dessa marca não verificada nesta rodada; extrator usa os mesmos campos do manual e foi testado com capacidades declaradas. Acabamento/contraste de formatos antigos não revisados globalmente.

## Studio — relevância comercial PhysioTech
- [x] Kit PhysioTech real conferido na conta proprietária autorizada: oferta, públicos e diferenciais presentes; PDF original não é persistido pelo importador e não foi relido.
- [x] Prioridade compartilhada por oferta/desejo/público, biblioteca dirigida de 56 ganchos e prova ligada ao benefício; Readiness não confunde escore Doppler. Software mantém vocabulário de produto e não recebe léxico clínico genérico. Interpretação futura reforçada e função implantada, sem reinterpretar ou sobrescrever a marca atual; ajuda pt/en/es atualizada.
- [x] Geração autenticada → gestor/esportivo → biblioteca em Mensagem conferidos, sem erros de execução; celular sem transbordamento; 63 testes passaram e build OK. Artes, kit, fotos e identidade não gravados nem publicação realizada. Dois testes adicionais antigos de subnichos esperam “avaliação” onde a regra vigente retorna “autoavaliação”; mantidos sem alterar regra/copy. Heurística editorial não prevê conversão; revisão textual fina de formatos legados e novo upload/interpretação do PDF não realizados.

## Studio — oferta com faixas diagonais
- [x] Modelo Oferta / faixas diagonais registrado no motor compartilhado, com oferta declarada e cores da marca, sem desconto/prazo da referência. Ajuda PRO/clínica pt/en/es atualizada; 54 testes passaram, build OK. Conta real → marca → seleção → geração → PNG baixado e celular sem transbordamento conferidos; quebra da faixa no PNG corrigida. Não salvou artes nem publicou; textos editoriais antigos do kit preservados.

## PhysioTech — laudos permanentes do Lucas
- [x] Cópia permanente por ID inclusive sem e-mail; PDF obrigatório, validação de origem/formato/20MB, falhas não registram sucesso. Abertura assina somente cópia local; exclusão autorizada remove PDF e bloco clínico, preservando original PhysioTech. Ajuda pt/en/es atualizada; funções implantadas, cinco testes e build OK.
- [x] Quatro laudos originais de Lucas recuperados usando sessão própria no PhysioTech; quatro cópias locais de 10–14MB confirmadas. Conta real → Lucas → SSO com paciente correto → reenviar exame real → pdfAttached true → recarga → PDF local 200 → exclusão só da nova duplicata conferidos; quatro originais preservados. Todos os PDFs abertos e download em Documentos verificado; visual desktop/celular conferido. Nova tela ainda precisa publicar; demais usuários antigos não recuperados nesta tarefa, aparelhos físicos e perfis de terceiros não testados.

## Edição de cadastro — Lucas Kegele
- [x] Edição atualiza o ID original e os IDs das avaliações do prontuário, incluindo sem e-mail; nome/chave/seleção atualizados juntos. Busca por ID não cria substituto após erro ou ausência. Onze testes aprovados, build OK.
- [x] Duplicata vazia removida após conferir vínculos; avaliação e três agendamentos corrigidos, cadastro original preservado. Conta do profissional → Lucas → Dados cadastrais → editar/salvar Lucas Kegele → recarregar/reabrir conferidos: avaliação, nascimento, ocupação e frequência mantidos. Não publicada.

## Landings — refinamento editorial e preços da clínica
- [x] Textos intermediários PRO/Paciente revisados em pt/en/es e clínica em português, com cenas reais e respaldo técnico; sem novas seções. Removidas promessas absolutas de diferenciação/tempo e esclarecido saldo de IA no FAQ da clínica.
- [x] Mensal/anual imediatamente acima dos preços, fixo somente durante os três cards; créditos/reembolso depois, teste reduzido a uma linha. Três planos alternados em 440px/1280px, formulário de teste aberto sem enviar; páginas sem erros, sete testes e build OK. Pagamento real não executado; EN/ES não abertos no navegador; versão não publicada.

## Blog — estrutura GEO sem reescrever artigos
- [x] Sete publicados e três rascunhos inventariados; Semrush BR e orientação Google pesquisados, estratégia/limites em docs/blog-geo-strategy.md. Avaliação: 480/mês KD21; renda: 20/mês KD0, SERP desconhecida; referência: dados desconhecidos.
- [x] Sumário derivado, links relacionados e trilha de desejos; schema com corpo/seções/autor institucional/breadcrumbs; sitemap estático ampliado aos sete publicados. Textos, títulos, slugs, resumos e publicação no banco preservados.
- [x] Blog → consulta → seção → artigo relacionado conferidos com artigos reais; desktop/celular sem transbordamento ou erros; seis testes passaram, build OK. Não publicada; indexação/citações em IA não verificadas. HTML inicial para robôs sem JS não resolvido (exige mudança arquitetural separada). Conteúdo promocional antigo/teleatendimento preservado pela restrição editorial do pedido.

## Proteção de caixa — imagens, gratuidade e cobrança
- [x] Gemini 3.8 Flash verificado no catálogo privado, superfície chat sem retenção; leitura de monitor e Studio implantadas. Print fictício: cinco valores exatos; Studio autenticado retornou temas e resumo. Raciocínio clínico, dinamometria, ADM e importação de treino preservados.
- [x] Duas avaliações básicas por e-mail/30 dias, ledger após exclusão, trava transacional e retomada por ID; início anônimo → duas gravações → terceira recusada → edição/leitura real conferidos. Avaliações técnicas removidas. Não percorrida nova anamnese completa até diagnóstico nem concorrência contra PostgreSQL real.
- [x] Fotos novas otimizadas no prontuário (1600px) e Studio (2400px), transparência/original de reserva mantidos; navegador comprovou redução 141386 → 12010 bytes. Arquivos antigos, documentos, assinaturas e medições preservados; upload real de foto em prontuário não executado.
- [ ] Recuperação Stripe: opções de tentativas/avisos são configuradas somente no painel Stripe, não expostas pela API disponível. Aguardam usuário configurar em Revenue recovery: tentativas nos dias 3/5/7 e cancelamento após esgotamento; avisos de pagamento falho com link hospedado podem usar o próprio Stripe. Nenhuma fatura automática aberta hoje; sem cobrar clientes manualmente ou criar rotina concorrente com Stripe.
- [x] Ajuda PRO/clínica/paciente pt/en/es atualizada; testes de quota e fotos aprovados, build OK, suporte aberto. Não publicada nova versão.

## Comunicação de capacidade da IA nas landings
- [x] Parágrafo por público e dois cards com ícones em PRO, Clínica e Acadêmico (ambos os layouts), pt/en/es, sem destacar cotas numéricas; combinações alternativas estimadas, saldo na conta e pacote opcional preservados. Páginas públicas conferidas em 1280px e 440px, sem transbordamento ou erros; 41 testes passaram e build OK. Layouts antigos e idiomas EN/ES não abertos no navegador; publicação não solicitada.

## Visibilidade dos créditos nas landings
- [x] Créditos destacados junto aos preços em PRO, Acadêmico e Clínica, nos dois layouts; mensal/anual mostra 30/33 e 20/22, clínicas 80/150/250. Páginas públicas atuais verificadas em 1280px e 440px, sem transbordamento ou erros; 41 testes passaram e build OK. Layouts preservados não abertos; publicação não solicitada.

## Cotas e pacotes de IA — novembro
- [x] PRO 30/33, Acadêmico 20/22, clínicas Small 80, Medium 120, Large 200 compartilhados; migração 0069 e cotas correntes atualizadas, sem apagar consumo ou saldo comprado. Margens e bloqueios atuais mantidos.
- [x] Pacotes 15/R$39, 30/R$69, 60/R$129 criados no Stripe, catálogo compartilhado e funções implantadas; webhook verifica pares exatos de ID/preço atual ou anterior para preservar sessões pendentes.
- [x] Telas/suporte pt/en/es atualizados; 41 testes passaram, build OK. Conta administradora → clínica → Insights → pacotes → Stripe Mini R$39 verificados sem cobrança. Conta admin continua ilimitada; saldo não-VIP e pools testados em banco isolado, não na tela real de assinante. Compra paga/liberação real continua pendente de compra autorizada; demais bloqueadores antigos abaixo não fazem parte desta revisão.

## Admin — consumo recente e avaliações gratuitas
- [x] Hoje (São Paulo), Últimas 24h, tabela das 100 chamadas recentes e atualização a cada minuto visível/manual; consultas concorrentes protegidas. Conta real: 30d → Hoje → 24h → 7d → atualizar → Leads conferidos, sem erros. Hoje/24h realmente sem chamadas; 7d mostra 43 registros. 401 sem sessão e janela inválida recusados; build OK.
- [x] Diagnóstico/tratamento gravam apenas referência autorizada de avaliação; admin resolve nome/e-mail e distingue link institucional de fluxo básico. Nome salvo também ao iniciar avaliação; Leads mostra nome existente e busca nome/e-mail. 47 testes distintos passaram. Registro anônimo antigo não contém assessment_id: impossível atribuí-lo com certeza, mantido sem vínculo sem inventar. Nova avaliação completa até IA não criada para evitar gravação clínica/custo; identificação de uma nova chamada ainda não exercitada ponta a ponta, aparelho físico não testado.

## Pré-operatório LCA — avaliação testagem externa
- [x] Reconhecimento inclui preventionGoalDetails e data marcada em outro campo, inclusive 12/12/26; trajetória reúne preparação e etapas pós-operatórias consultáveis, mantendo confirmação da cirurgia/data realizada e beta admin.
- [x] Lista genérica sem dor substituída por escolha profissional opcional, sem instrumentos automáticos nem adaptação de KOOS; respostas históricas preservadas e ajuda pt/en/es atualizada.
- [x] 39 testes passaram, build OK. Conta administradora do paciente: ativação e recarga conferidas, 42 dias até 12/12/2026, fase futura aberta; preparação mantida no paciente de teste sem marcar metas. Formulário de cirurgia abriu sem data inventada e foi cancelado, nenhum pós-operatório criado. Etapa de questionários percorrida sem lista genérica; avaliação/hipótese/impressão originais não alteradas. Nova avaliação completa e cirurgia real não gravadas; iPhone físico não testado.

## Pré-operatório de LCA
- [x] Registro explícito de pré-operatório de LCA na avaliação habilita preparação no prontuário, com três etapas, metas e data cirúrgica opcional; mesma autorização beta/paciente. Região ou início isolados não ativam. Dados guardados separadamente sem alterar pós-operatórios.
- [x] 21 testes passaram; quadro real montado no navegador autenticado com anamnese técnica: data 20/11 pré-preenchida, 21 dias até cirurgia, metas gravadas/lidas, avanço e etapas futuras conferidos. Paciente técnico removido. Ajuda pt/en/es e inserção em relatório ajustadas, build OK. Avaliação manual completa até prontuário e download PDF não reexecutados; Valéria não alterada.

## R-LCA — material clínico e organização didática
- [x] Sete prints transcritos em docs/rlca-referencia-clinica.md com origem, métricas, métodos, objetivos e avançar/manter/regredir; cortes não universais separados da evidência identificada.
- [x] Referência curada compartilhada no chat, impressão, hipótese, plano e relatório evolutivo; histórico cirúrgico preservado e cache versionado sem reescrever relatórios salvos. Futura seção ortopédica não criada.
- [x] Cinco funções implantadas; chamadas autenticadas com caso fictício retornaram 200 e chat lido pela tela. Primeiro teste trouxe corte psicológico não sustentado: instruções reforçadas e reteste não o repetiu. Planos condicionaram fases avançadas à avaliação/liberação. Trinta testes passaram, build OK; nenhum prontuário alterado. Não garante todas as respostas futuras nem valida todos os cortes dos prints; emissão de PDF/fluxo completo de avaliação não reexecutados.

## Idioma — equipe e agenda no iPhone privado
- [x] Menu deixa de trocar PT→EN em um toque: escolha explícita PT/EN/ES compartilhada entre menus e painel. Contexto segue o idioma efetivo após carregar traduções, sem efeitos dentro de atualização de estado ou toques concorrentes. Imagens mostram idioma geral em inglês; não foi possível confirmar o toque que originou a mudança no aparelho.
- [x] Conta Sifeg autenticada em WebKit móvel, sessão nova com navegador en-US: identificação na equipe e edição de Diego Ramos no PRO demo abertas em português, sem salvar dados. Menu abriu sem mudar idioma; escolha English e retorno Português conferidos. Dez testes passaram, build OK. iPhone físico não testado.

## Relatórios — identidade e assinatura dos colaboradores
- [x] Resolução compartilhada preserva o emissor e a assinatura mesmo sem conselho; marca da clínica mantida. Causa: Sifeg tinha assinatura salva, mas CREFITO provisório fazia o emissor cair no dono.
- [x] Nome completo e conselho/número em Minha conta e edição por dono/admin na Equipe, separados por clínica; autorização no servidor e ajuda pt/en/es.
- [x] Cadastro de Sifeg salvo sem inventar dados, recarga conferida e encaminhamento real de Aline baixado com marca GV Fisio e assinatura de Sifeg; dez testes aprovados, build OK. Servidor recusou alteração do dono por Sifeg, registro fictício e acesso a outra clínica. Nome completo/número reais de Sifeg não fornecidos; mantido cadastro existente. Edição pelo dono/admin e aparelho físico não exercitados.

## Studio — manual editorial Aliv.iA atualizado
- [x] Interpretar com IA executado na conta de Guilherme; resultado revisado editorialmente antes do salvamento final. Manual atualizado com recursos recentes e limites reais, nove públicos/subnichos com frases completas e 14 diálogos por público. Os 34 públicos/temas originais, logo, cores, fontes e slogan foram preservados; salvamento e recarga conferidos pela tela e leitura autenticada, sem erros. Não realizada nova auditoria de lotes nesta tarefa.

## Studio — sombras no PNG
- [x] Falha de sombras deslocadas reproduzida em WebKit; sombras convertidas em camada estável no exportador compartilhado, texto centralizado preservado. Download PNG real comparado antes/depois e regressões de exportação aprovadas; aparelho físico não testado.

## Studio — linguagem após auditoria de três lotes
- [x] Escrita natural preserva frases completas e fatos; intervalos/negações protegidos, concordância e corte de frases da pinça corrigidos.
- [x] Copiar/baixar/salvar legendas usa texto renderizado; objeções soltas removidas, público oficial ligado ao seu acervo em vez de um sorteio independente.
- [x] Três gerações autenticadas finais: 16, 12 e 13 artes, sem erro de execução; imagens e legendas conferidas. Sem publicar ou salvar na galeria. Ainda há textos promocionais antigos e descrições extensas a revisar editorialmente; não se promete qualidade definitiva de todas as peças.

## Trial restaurado e aviso de reembolso anual
- [x] Renovação automática exclusiva restaurada; GV Fisio renovada até 13/11/2026, confirmada no banco e sete testes de isolamento/15 dias aprovados.
- [x] Aviso anual discreto e suporte pt/en/es para paciente/PRO/Acadêmico/clínica; antigas negativas de reembolso acadêmico corrigidas. Nove testes passaram; seleção anual/mensal no PRO e avisos acadêmico/clínica e suportes conferidos no navegador sem erros. Paciente atualmente oferece mensal/avulso, sem seletor anual; nenhum plano novo criado. Reembolso informado como solicitação ao suporte, sem execução automática de pagamento. Trial restaurado confirmado no banco, não no painel autenticado do proprietário (sessão disponível corresponde a outra conta).

## Assinatura dentro do aviso de trial encerrado
- [x] Planos mensal/anual no aviso e por botão durante trial; proprietário/admin segue direto ao Stripe. Clínica validada no servidor e transmitida ao provisionamento, retorno/cancelamento no painel e recarga do contexto após pagamento.
- [x] Doze testes passaram; aviso expirado conferido na conta real com expiração simulada só na leitura, três planos e checkout real aberto sem pagar. Preços Essencial mensal R$197/anual R$1.344 confirmados no Stripe; IDs dos seis preços conferidos por teste. Ajuda pt/en/es atualizada, funções implantadas e build OK. O Stripe abriu mas o valor não apareceu no navegador automatizado; cobrança final/reativação após pagamento não executadas, pois exigem compra autorizada.

## Trial pessoal do administrador e acesso aos planos
- [x] Trial da GV Fisio renovado até 13/11/2026; renovação de 15 dias ao acessar/após expirar com a tela aberta, exclusiva do proprietário Guilherme com autoridade admin no servidor; criação preservada.
- [x] Botões do trial levam diretamente aos planos (#planos/#pricing compatíveis); 'Ver planos' no início das duas versões da página.
- [x] Sete testes passaram (15 dias, isolamento, autoridade, assinatura paga e acesso anônimo); clínica real autenticada mostra 15 dias, clique do trial e botão inicial posicionam preços abaixo do cabeçalho. Ajuda pt/en/es atualizada e build OK. Nenhuma compra realizada; expiração futura validada em teste isolado.

## Erro ao criar HEP na clínica pagante
- [x] Recusa 403 reproduzida na conta afetada: HEP exigia PRO solo apesar da clínica ativa. Migração 0056 corrige programas e itens pelo escopo clínico, mantém autoria/membros clínicos ativos e pagamento separado do PRO. Edição verifica erros sem trocar clínica. Oito testes de RLS passaram; build OK. Criação real autenticada retornou 201, item e autoria conferidos no banco, link exibiu exercício e marca corretos; registro técnico removido sem alterar pacientes. Envio push e dose no microciclo não executados neste teste para não prescrever/notificar paciente real.

## Lista compacta de solicitações na Agenda
- [x] Painel compartilhado PRO/clínica limitado à altura real dos três primeiros pedidos, com rolagem interna, total e data/hora de criação em ordem de chegada. Ajuda pt/en/es atualizada; sete testes passaram e build OK. Clínica autenticada: seis pedidos simulados apenas nas respostas de leitura, três visíveis, ordem correta, rolagem até o último e aprovação aberta sem gravar. Clínica sem pedidos reais; PRO disponível apenas em demo, portanto não houve aprovação real nem validação visual do PRO real.

## Revisão do suporte do paciente
- [x] Ajuda específica para check-in, HEP, solicitações e avisos; localização de histórico, diário, comparação, indicação e plano pessoal corrigida em pt/en/es. Guia para PRO e clínica e dúvidas sobre vínculo acrescentados. Tópicos do paciente e da clínica abertos no navegador, sem erros; traduções presentes e build OK. Somente orientações alteradas, sem mudanças de acesso ou dados.

## Organização do perfil pessoal do paciente
- [x] Rotina em Hoje, histórico em Minha Evolução, Agenda preservada e Mensagens & Avisos reunidos; vínculo determinado pelas consultas existentes, ofertas fora do topo e indicação recolhida.
- [x] Ajuda pt/en/es atualizada; 12 testes passaram, build OK. Perfil real autenticado: Hoje → Evolução → Agenda → Avisos → abertura do check-in conferidos no celular/computador sem erros ou sobreposição; links antigos health/notices conferidos. Nenhuma resposta clínica alterada. Conta sem HEP ativo, avisos ou agendamentos: execução/gravação desses recursos não repetida; componentes e permissões existentes preservados.

## Organização dos pacientes na clínica
- [x] Totais e relatório movidos para o registro Resumo dos Insights; lista sem métricas/status duplicados. Cálculos e acessos mantidos, ajuda pt/en/es atualizada. Percurso autenticado Pacientes → Insights → Resumo conferido no desktop/celular com dados reais; oito testes passaram e build OK.

## Correção dos controles de parceiros
- [x] Validação de CREFITO corrigida sem registro fictício; desativação do Acadêmico e remoção de Juliana realizadas no Admin autenticado e confirmadas no banco, preservando conta/histórico. Cinco testes passaram; build OK. Toggles recarregam dados e mantêm a pessoa na lista até remoção explícita.

## Preparação dos créditos de IA
- [x] PRO com margem de 10%; parceiros 25/mês e compra permitida; clínica mantém 20%; ilimitado só admin/VIP.
- [x] Avisos 80/100%, recuperação contextual e controles seletivos no Admin; chave geral desligada e categorias vazias.
- [x] 29 testes aprovados para política, compra idempotente, saldo compartilhado, débitos fracionados, expiração e permissões. Admin autenticado, parceiros reais e clínica pagante consultados; pagamento aberto sem cobrança. Aviso de 100% → renovação → pacotes conferido com saldo simulado apenas no navegador; ajuda pt/en/es atualizada.
- [ ] Antes da ativação hard: confirmar um pagamento real de pacote até o saldo aparecer (aguarda compra autorizada) e executar concorrência/escopo clínica-PRO com contas não-VIP representativas (aguarda contas autorizadas). Nenhum bloqueio ativado.

## Categorias de clínicas no Admin
- [x] Separados 1 assinante, 4 parceiros ativos gratuitos e 2 clínicas em teste/inativas; busca e detalhes preservados. Quatro testes passaram, build OK e navegação autenticada desktop/celular conferida com dados reais, sem alterar acessos.

## Blindagem de compromissos pessoais
- [x] Compromissos excluídos nos cards locais e em 10 RPCs, incluindo notas explicitamente vinculadas; Agenda e escopos preservados. Migração 0044 aplicada e definições conferidas no servidor.
- [x] 44 testes passaram: invariância dos cálculos com compromissos em todos os status, notas, tipos nulos, clínica/solo e recusas de acesso. Insights → Operação conferido na clínica autenticada, sem erros; build OK. Clínica acessível sem atendimentos representativos e PRO disponível só demo: confronto visual com compromissos reais não realizado; regressões usam dados isolados, sem escrever em produção.
- [x] Ajuda pt/en/es atualizada; regra registrada no AGENTS dos Insights.

## Serviço na solicitação
- [x] Serviço escolhido visível no pedido e na confirmação, com ID pré-selecionado e nomes do catálogo no mesmo escopo (incluindo inativos). Pedido real consultado: Avaliação. Tela autenticada da clínica sem pedidos reais; visual desktop/celular conferido com resposta simulada somente de leitura, sem aprovar ou gravar. Build OK. Aprovação real no PRO não reexecutada: conta disponível tem PRO demo.

## Correção de localização dos painéis
- [x] Solicitações devolvidas à Agenda no PRO e na clínica, com permissões e atualização existentes preservadas.
- [x] Serviços e valores em Insights → Operação, retirados de Pacientes/Equipe; ajuda pt/en/es atualizada.
- [x] Navegação autenticada da clínica conferida, 9 testes aprovados e build OK; sem alterações nos dados. Conta disponível sem PRO real ou solicitações pendentes: aprovação e navegação PRO não reexecutadas nesta correção de localização.

## Concluído (esta rodada)
- [x] Insights deixam de usar diário de dor e mensagens; sinais agora: check-in de prontidão (dor por região/nota), HEP e comparecimento na agenda (migrações 0032–0034, RPCs validadas).
- [x] Verificada a aba Pacientes vazia na clínica de teste: integração OK, ausência real de dados no escopo; escopo rico produz sinais (~20 silêncios, dor estagnada).
- [x] Previsão de alta multi-sinal: dor, fase STEPS, progresso de carga e prontidão, com % de progresso e chips de fatores.
- [x] Financeiro com catálogo de serviços da clínica (preço por sessão ou mensal diluído), serviço vinculável ao agendamento, LTV/cadeira vazia/receita por hora com preço correto.
- [x] Prontuário em dia não mostra mais 100% falso: horários passados sem classificação viram pendência; sem casos avaliáveis mostra "—".
- [x] Ajuda atualizada (locales pt/en/es + ClinicSupport inline); testes (18) e build OK.

## Rodada 2 (concluída)
- [x] Cancelamento tardio: slot sem hora não finge antecedência; janela segue a data do cancelamento.
- [x] Sem próximo horário: nome da sessão mais recente; sessões só com evolução resolvem nome pelo cadastro.
- [x] Gargalo de capacidade: solo não mostra 100% falso; card ganhou "ocupação da agenda" (horários usados ÷ possíveis).

## Catálogo PRO
- [x] Editor agora em Insights → Operação → Serviços e valores; mecanismo de gravação/leitura/remoção preservado.

## Ajustes solicitados agora
- [x] Agenda corrigida: respostas antigas não substituem o período atual; horários 26/10 12:15 e 13:00 verificados com atraso artificial no celular, sem alterar registros.
- [x] Serviços PRO/clínica agora em Insights → Operação → Serviços e valores (clínica: dono/admin); ajuda pt/en/es e 9 testes aprovados.
- [x] Abandono silencioso: rolagem e descarte persistente pelo mecanismo existente.
- [x] Adesão: causa confirmada (ambos sem e-mail); RPC usa ID do paciente, canais ausentes não diluem e lista completa pesquisável.
- [x] Frequência: comparar somente oportunidades decorridas no mês, considerando início do acompanhamento.
- [x] Financeiro: detalhar pacientes, dias, horários e valores de LTV/cadeira vazia com os mesmos dados dos totais.
- [x] 29 testes passaram, incluindo execução SQL e isolamento; ajuda pt/en/es; UI autenticada da clínica sem erros.
- [ ] Conferir visualmente Francisco/Fábio e detalhes financeiros com dados: conta disponível não possui os perfis PRO desses pacientes e clínica acessível não tem preços/casos representativos. Aguarda acesso ao perfil correspondente.

## PhysioTech — franquia e add-on (beta fechado)
- [x] Regra única de direito (lista manual ilimitada; add-on; anual 3/mês por 6 meses; mensal 1 degustação); envio de laudo bloqueado ao esgotar; aviso com desconto no app.
- [x] Add-ons no Stripe: mensal R$89/139, anual R$590/990; ativação e cancelamento pelo webhook. Conta VIP conferida como ilimitada. Checkout real e franquia não testados (só lista liberada tem acesso).
- [ ] Lançamento geral: remover a trava da lista manual no SSO e no botão — aguarda decisão do Guilherme.
