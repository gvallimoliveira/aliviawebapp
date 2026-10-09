import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, HelpCircle, Camera, Link2, Smile, Palette, Users, Calendar,
  ClipboardList, AlertTriangle, FileText, Image as ImageIcon, Brain,
  MessageCircle, Video, Bell, BookOpen, TrendingUp, Shield, CreditCard,
  UserCog, Stethoscope, FileCheck, Sparkles, Heart, Layers, Mic, Archive,
  Lightbulb, GraduationCap,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportContactForm from "@/components/support/SupportContactForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { setSeo } from "@/lib/seo";
import InstallAppCard from "@/components/InstallAppCard";

type ToolItem = {
  key: string;
  icon: React.ElementType;
  title: string;
  desc: string;
};

type ToolCategory = {
  title: string;
  icon: React.ElementType;
  items: ToolItem[];
};

const categories: ToolCategory[] = [
  {
    title: "Captação e onboarding",
    icon: Link2,
    items: [
      {
        key: "pre_assessment",
        icon: Link2,
        title: "Link de pré-avaliação personalizado",
        desc: "Cada paciente recebe um link único da clínica. Ele preenche anamnese, mapa de dor e questionários antes da consulta. Você abre o prontuário com tudo pronto e ganha tempo clínico real.",
      },
      {
        key: "manual_assessment",
        icon: ClipboardList,
        title: "Avaliação manual no consultório",
        desc: "Para o paciente que chega sem ter preenchido o link, você cria a avaliação direto no painel — não precisa de e-mail nem cadastro do paciente. Útil também para idosos e pacientes presenciais.",
      },
      {
        key: "red_flags",
        icon: AlertTriangle,
        title: "Triagem automática de Red Flags",
        desc: "O sistema cruza sintomas e responde com alertas de sinais de alarme (neurológicos, viscerais, oncológicos). Em links de clínica e na avaliação manual, a avaliação NÃO é interrompida: o sinal de alarme fica registrado no prontuário/PDF e a hipótese diagnóstica vem destacada como 'sob ressalva — requer aval médico'. Qualquer terapeuta da clínica pode dispensar a red flag (ex.: paciente com acompanhamento médico ativo) registrando justificativa; o histórico fica visível como 'Dispensada em DD/MM por Dr(a). X'. Em avaliações feitas pelo próprio paciente final (sem profissional), o fluxo continua interrompendo por segurança.",
      },
      {
        key: "agenda_import",
        icon: Camera,
        title: "Importar agenda por foto (IA)",
        desc: "Tire uma foto ou screenshot da sua agenda atual (papel, Trello, planilha, outra plataforma) e a IA OCR cria todos os agendamentos automaticamente. Migração completa em menos de 1 minuto.",
      },
    ],
  },
  {
    title: "Prontuário e documentos",
    icon: FileText,
    items: [
      {
        key: "compact_record",
        icon: Layers,
        title: "Prontuário compacto e dor por região",
        desc: "Anamnese e saúde geral ficam na mesma faixa; documentos e fotos também. No celular, as faixas deslizam lateralmente, mantendo os atalhos para cada seção. Os mapas de avaliações aparecem lado a lado. A evolução da dor reúne as medidas por região, a legenda e a comparação inicial → atual em um único bloco. Pontuações gerais compartilhadas por várias regiões permanecem identificadas como dor geral, sem inventar medidas regionais.",
      },
      {
        key: "patient_files",
        icon: ImageIcon,
        title: "Upload de laudos, exames e fotos",
        desc: "Anexe ressonância, raio-x, exames laboratoriais e fotos de evolução postural diretamente ao prontuário do paciente. Limite de 20MB por arquivo, sem custo adicional de armazenamento.",
      },
      {
        key: "session_notes",
        icon: FileCheck,
        title: "Notas de sessão",
        desc: "Registre evolução, intervenções e observações clínicas a cada atendimento — com acesso rápido pelo botão \"Registrar evolução\" no topo do prontuário (no celular, botão flutuante). Tudo cronologicamente vinculado ao paciente e visível em PDF se você quiser compartilhar.",
      },
      {
        key: "white_label_pdf",
        icon: Palette,
        title: "PDFs com a marca da clínica",
        desc: "Logo, cor e identidade da clínica aplicados em todos os relatórios gerados. Profissionalismo na entrega ao paciente e ao convênio.",
      },
      {
        key: "hep_templates",
        icon: FileText,
        title: "Templates reutilizáveis no HEP",
        desc: "Salve programas de exercício como templates personalizados e reutilize em novos pacientes. Inclui templates pré-construídos (ex: progressão de ombro) e templates próprios que você cria e edita. Em clínica, os templates são compartilhados entre toda a equipe. Após aplicar um template, você pode remover exercícios individualmente se houver contraindicação para aquele paciente.",
      },
      {
        key: "studio_carousel",
        icon: Palette,
        title: "Studio: carrosséis e fios de posts",
        desc: "O Studio também pode apresentar um carrossel como uma sequência de posts curtos da marca, com começo, desenvolvimento e conclusão. Cada slide continua com controles próprios para baixar, salvar, editar texto e inverter cores.",
      },
      {
        key: "studio_creative_network",
        icon: Brain,
        title: "Studio: rede criativa da marca",
        desc: "O Studio conecta público, cena, problema, explicação, prova e próximo passo antes de escrever. Nos Diferenciais Aliv.iA, cada arte permanece em uma única funcionalidade e reaproveita automaticamente argumentos validados das páginas da marca — como continuidade sem retrabalho, segurança, entregáveis e conexão com o fisioterapeuta — sem criar novos controles. Títulos incompletos, conclusões cortadas, listas técnicas soltas e destaques repetidos são rejeitados. Em marcas veterinárias, o texto fala com o tutor, mas mantém o pet como centro da queixa, investigação e evolução. Qualquer marca pode criar a própria linha editorial com temas selecionáveis em conjunto. A geração é local e não consome créditos extras de IA. Listas e comparações removem argumentos repetidos ou muito semelhantes, mantendo apenas ideias complementares do mesmo tema, sem inventar itens para preencher espaço.",
      },
      {
        key: "studio_ecosystem",
        icon: Layers,
        title: "Studio: Ecossistema de soluções",
        desc: "Na marca Aliv.iA, selecione o modelo Ecossistema de soluções para conectar de três a cinco funcionalidades em uma única jornada. Escolha entre dez cadeias prontas, incluindo monitorização → avaliação funcional → relatório cardiorrespiratório, ou ajuste etapas e ordem. O Studio entrega seis argumentos visuais e um carrossel completo com o mesmo público, promessa e conclusão.",
      },
      {
        key: "studio_cardiorespiratory",
        icon: Activity,
        title: "Studio: jornada cardiorrespiratória",
        desc: "A marca Aliv.iA tem três diferenciais: monitorização com aparelhos, avaliação funcional e análise/relatório. O ecossistema conecta os três com protocolos e referências explícitos. Os textos distinguem envio de prints de conexão automática, reservam a decisão clínica ao fisioterapeuta e explicam que o teste não duplica a carga semanal. Use o novo recorte nos Diferenciais ou escolha a jornada no modelo Ecossistema de soluções.",
      },
      {
        key: "voice_notes",
        icon: Mic,
        title: "Notas de voz na avaliação manual (IA)",
        desc: "Durante uma avaliação manual no consultório, um botão flutuante de microfone permite gravar sua narrativa enquanto examina o paciente — sem interromper o atendimento para digitar. O áudio é processado pela IA (Gemini), transcrito e resumido automaticamente em texto clínico estruturado, salvo na avaliação. O áudio bruto é descartado por privacidade — só o texto permanece. Ganhe tempo real de consulta e tenha um prontuário rico mesmo no atendimento mais corrido.",
      },
      {
        key: "session_dictation",
        icon: Mic,
        title: "Ditar a evolução do paciente por voz",
        desc: "No prontuário, o campo de evolução tem uma barra de gravação anexa: toque em 'Ditar' e fale suas condutas — o texto aparece no campo a cada pausa da fala, exatamente como foi dito. Você escolhe se o ditado entra na evolução ou na observação, pode pausar, continuar e descartar. A mesma barra está disponível ao editar qualquer registro dentro do 'Histórico de evolução'. O áudio nunca é guardado: cada trecho é convertido em texto e descartado, e nada é salvo até você clicar em salvar.",
      },
      {
        key: "comparison",
        icon: TrendingUp,
        title: "Comparativo Antes vs. Depois",
        desc: "Quando há duas ou mais avaliações, o sistema gera um comparativo objetivo de dor, mobilidade e função. Excelente para alta, prestação de contas a convênios e marketing de resultado.",
      },
    ],
  },
  {
    title: "Inteligência clínica (IA)",
    icon: Brain,
    items: [
      {
        key: "ai_diagnosis",
        icon: Sparkles,
        title: "Hipótese diagnóstica assistida por IA",
        desc: "A IA aplica os frameworks STEPS e D.I.F.I sobre os dados da avaliação e sugere uma hipótese clínica com nível de confiança. Você revisa, ajusta e valida — o raciocínio final é sempre seu.",
      },
      {
        key: "final_hypothesis",
        icon: FileCheck,
        title: "Hipótese diagnóstica final (sobrescrever IA)",
        desc: "Você (owner ou terapeuta da clínica) pode concordar com a hipótese da IA ou sobrescrevê-la com seu próprio diagnóstico direto no prontuário do paciente ou na visualização da avaliação. A hipótese final aparece em destaque internamente, substitui totalmente a sugestão da IA no PDF entregue ao paciente e no compartilhamento por WhatsApp — a sugestão original da IA fica visível apenas para a equipe, em uma linha discreta. Secretárias não têm permissão para editar (decisão clínica). Editável a qualquer momento, com sincronização imediata em todos os pontos do sistema.",
      },
      {
        key: "treatment_plan",
        icon: Stethoscope,
        title: "Plano de tratamento sugerido",
        desc: "Com base no diagnóstico, a IA propõe condutas em fases (educação, controle de dor, ativação, fortalecimento, retorno funcional). Inclui exercícios e progressões.",
      },
      {
        key: "ai_test_suggestions",
        icon: Lightbulb,
        title: "Sugestões de testes na avaliação manual (IA)",
        desc: "Durante a avaliação manual, a IA analisa a anamnese, regiões de dor e questionários preenchidos nas etapas anteriores e sugere 2 a 6 testes clínicos adicionais (ortopédicos, de mobilidade, neurodinâmicos ou funcionais). Clicando em uma sugestão, o teste é inserido automaticamente no campo de testes funcionais como inspiração para o profissional.",
      },
      {
        key: "clinical_impression",
        icon: Brain,
        title: "Impressão clínica evolutiva",
        desc: "Resumo automático da evolução do paciente ao longo de várias avaliações. Útil em reuniões de equipe, troca de turno entre fisioterapeutas e laudos para convênio.",
      },
      {
        key: "differential_diagnosis",
        icon: Brain,
        title: "Diagnóstico diferencial assistido",
        desc: "Quando a confiança da hipótese da IA é baixa ou moderada, o card da hipótese diagnóstica (e a etapa de diagnóstico da avaliação manual) oferece um botão discreto para gerar 2 a 4 hipóteses concorrentes. Cada uma vem com plausibilidade, por que compete, o que fala contra e discriminadores práticos (testes/perguntas). O profissional pode adotar uma delas como hipótese final, enviar os discriminadores para as observações da sessão e decidir se o bloco entra no PDF. Não aparece em hipóteses de alta confiança.",
      },
      {
        key: "evolution_report",
        icon: TrendingUp,
        title: "Relatório de evolução para alta",
        desc: "Gera um documento comparativo final com ganhos objetivos e narrativa clínica. Antes de gerar, você escolhe o escopo: últimos 30/60/90 dias ou seleção manual das avaliações — quadros antigos não se misturam ao quadro atual. Ideal para alta, prestação de contas e fechamento de pacote.",
      },
      {
        key: "academic_mentor",
        icon: GraduationCap,
        title: "Modo acadêmico e trilhas do Mentor",
        desc: "Estudantes com PRO ativo, parceiros acadêmicos habilitados pelo admin e profissionais PRO podem estudar pelo Agente com /professor, /quiz, /caso, /traduzir e /trilha [tema] [1-5]. As trilhas entregam aulas didáticas por módulo — conceitos, avaliação, diagnóstico, tratamento e caso aplicado — com XP por conclusão.",
      },
      {
        key: "evidence_library",
        icon: BookOpen,
        title: "Biblioteca de Evidências por Nicho (PEDro validado)",
        desc: "Acesso integrado, dentro do Agente Clínico, à curadoria de artigos aprovados e usados pela própria IA — separados por nicho, com DOI/PMID e crivo PEDro. RCTs só entram com nota oficial PEDro ≥ 7; revisões/meta-análises com PEDro N/A ficam sem nota numérica. Disponível para Acadêmico assinante/parceiro acadêmico, PRO e Clínica.",
      },
      {
        key: "ai_credits_control",
        icon: Sparkles,
        title: "Controle de créditos de IA (widget 'Seu uso de IA')",
        desc: "Todo consumo mensal de IA da clínica (hipóteses, planos de tratamento, impressão clínica, HEP, sugestões de teste, notas de voz, Agente Clínico) é medido em créditos. Para acompanhar em tempo real, acesse o Dashboard da clínica → aba Insights e role até o card 'Seu uso de IA'. Você vê a barra de progresso do mês, quantos créditos restam e recebe avisos automáticos ao atingir 80% (banner âmbar) e 100% (banner vermelho — sem bloquear a operação). Clínicas com plano ativo não têm interrupção de uso.",
      },
    ],
  },
  {
    title: "Agenda e equipe",
    icon: Calendar,
    items: [
      {
        key: "shared_agenda",
        icon: Calendar,
        title: "Agenda compartilhada multi-profissional",
        desc: "Visualize a agenda de toda a clínica ou filtre por profissional. Cada terapeuta vê a sua, o dono e a secretária veem todas.",
      },
      {
        key: "drag_drop",
        icon: Calendar,
        title: "Drag-and-drop entre dias e horários",
        desc: "Remaneje atendimentos arrastando o card para outro dia ou horário. Funciona com mouse no desktop e com toque no celular.",
      },
      {
        key: "team_roles",
        icon: Users,
        title: "Equipe com permissões (RBAC)",
        desc: "Convide fisioterapeutas e secretárias por e-mail. Cada papel vê apenas o que precisa: secretária gerencia agenda; terapeuta vê seus pacientes; dono vê tudo.",
      },
      {
        key: "service_types",
        icon: Layers,
        title: "Múltiplos tipos de serviço",
        desc: "Configure Fisioterapia, Pilates, RPG, Avaliação, Acupuntura — cada um com sua duração e cor. A agenda fica organizada visualmente.",
      },
    ],
  },
  {
    title: "Comunicação com o paciente",
    icon: MessageCircle,
    items: [
      {
        key: "chat",
        icon: MessageCircle,
        title: "Chat interno com pacientes",
        desc: "Mensagens diretas dentro do app, sem expor seu WhatsApp pessoal. Histórico fica vinculado ao prontuário.",
      },
      {
        key: "video_call",
        icon: Video,
        title: "Vídeochamada P2P (telefisioterapia)",
        desc: "Inicie uma chamada de vídeo direto do chat, sem instalar nada. Ideal para orientação de exercícios à distância e acompanhamento.",
      },
      {
        key: "nps_survey",
        icon: Smile,
        title: "Pesquisa de satisfação (NPS) por link",
        desc: "Envie um link público de pesquisa de satisfação para o paciente após o atendimento. As respostas alimentam um dashboard de NPS por profissional e por serviço.",
      },
    ],
  },
  {
    title: "Insights inteligentes (preditivos)",
    icon: Sparkles,
    items: [
      {
        key: "insights_churn",
        icon: AlertTriangle,
        title: "Predição de evasão (churn)",
        desc: "O sistema cruza faltas, dor estagnada, baixa adesão a exercícios e silêncio no chat para sinalizar pacientes em risco de abandonar o tratamento — com sugestão de ação imediata para a equipe.",
      },
      {
        key: "insights_discharge",
        icon: FileCheck,
        title: "Predição de alta",
        desc: "Estimativa do número de sessões restantes até a alta, baseada na curva de evolução da dor e na adesão. Ajuda a planejar pacotes, organizar agenda e antecipar conversas com o paciente.",
      },
      {
        key: "insights_adherence",
        icon: Heart,
        title: "Score de adesão (0-100) por paciente",
        desc: "Combina exercícios concluídos, diário de dor, comparecimento e leitura de mensagens em um único score. A equipe identifica em segundos quem precisa de reforço.",
      },
      {
        key: "insights_benchmark",
        icon: TrendingUp,
        title: "Benchmarking anônimo entre clínicas",
        desc: "Compara seus indicadores (no-show, ocupação, avaliações/mês, tempo até alta) com a média de clínicas de porte semelhante. Os dados de outras clínicas são sempre anônimos.",
      },
      {
        key: "insights_revenue",
        icon: CreditCard,
        title: "Meta de receita + simulador 'what-if'",
        desc: "Defina sua meta mensal e o valor médio da sessão. O simulador mostra quanto a clínica ganharia ao reduzir no-show ou aumentar a ocupação em X pontos percentuais.",
      },
    ],
  },
  {
    title: "Engajamento e retenção",
    icon: Heart,
    items: [
      {
        key: "notification_center",
        icon: Bell,
        title: "Central de notificações por perfil",
        desc: "Em Minha conta → Notificações cada pessoa escolhe o que recebe no celular. Quem atende (dono, terapeuta, secretaria) tem a lista clínica completa: novas avaliações e reavaliações pelos links da clínica, mensagens e ligações, red flags, questionários e exercícios concluídos, assinatura e cobrança. Quem usa o Aliv.iA apenas como paciente vê uma lista própria — tratamento e exercícios, minha avaliação, mensagens do fisioterapeuta e pagamentos. Profissionais que também se acompanham como pacientes têm os dois blocos separados, então desligar um não desliga o outro.",
      },
      {
        key: "pain_diary",
        icon: BookOpen,
        title: "Diário de dor para o paciente",
        desc: "O paciente registra a dor diariamente (0-10) com gamificação. Você acompanha a curva de evolução pelo painel e detecta recaídas precocemente.",
      },
      {
        key: "exercise_program",
        icon: Sparkles,
        title: "Programa de exercícios em casa (HEP)",
        desc: "Monte ou revise o HEP proposto pelo Agente com vídeos, séries, repetições e frequência. O resumo estima intensidade e séries semanais efetivas por região: força ×1, estabilização/propriocepção ×0,5; mobilidade/flexibilidade não entram nessa conta. Escolha fisioterapia, academia ou outro esporte. Ao salvar, a dose planejada atualiza as sessões futuras do microciclo vinculado; sessões passadas são preservadas. O esforço alvo é estimado, entre 5 e 9: a resposta real vem do paciente pelo check-in. A decisão de ajustar continua com o fisioterapeuta.",
      },
      {
        key: "white_label_brand",
        icon: Palette,
        title: "White-label completo",
        desc: "Logo e cor da clínica no painel da equipe, nos PDFs, no link de avaliação e na pesquisa de satisfação. O paciente vê a sua marca em todos os pontos de contato.",
      },
      {
        key: "data_export",
        icon: Archive,
        title: "Exportar todos os dados (.zip) — backup & LGPD",
        desc: "No painel do proprietário, um clique gera um arquivo .zip completo com pacientes, avaliações, agendamentos, notas profissionais, notas de voz e índice de documentos/fotos (links seguros válidos por 1 hora). Você escolhe exatamente quais categorias incluir para reduzir o tamanho do arquivo. Garante portabilidade total dos dados da clínica (LGPD/CFF), backup secundário independente da plataforma e tranquilidade jurídica: os prontuários são SEUS, sempre exportáveis.",
      },
      {
        key: "all_inclusive",
        icon: Shield,
        title: "Tudo incluso, sem custo por atendimento",
        desc: "Tratamentos, IA, armazenamento e funcionalidades não geram custo adicional. Você paga uma única assinatura mensal/anual por porte de clínica.",
      },
    ],
  },
];

const faqKeys = [
  {
    q: "Como ler os totais da semana e a dose com sessões ainda pendentes?",
    a: "O total planejado inclui toda a semana; o total real soma o sRPE registrado até hoje, incluindo treinos extras. A classificação e o gráfico comparam apenas sessões já realizadas e respondidas. Por frente, o selo informa quantas sessões sustentam a leitura: Dose certa (1/2 sessões semanais) significa uma resposta de duas sessões planejadas, não que a semana inteira já foi cumprida. Subdosado (1/2 sessões semanais) permite revisar as próximas sessões da mesma frente, conforme tolerância e prontidão, sem compensação automática. Sessões futuras ou sem resposta não viram subdose; o paciente pode responder até 7 dias depois. Essa comparação não gera notificação no celular.",
  },
  {
    q: "Como funciona o controle de carga (sRPE) e a comparação entre dose planejada e percebida?",
    a: "Na seção \"Periodização e carga\" do prontuário, duração da sessão × RPE de 0 a 10 gera a carga da sessão, que alimenta carga aguda (7 dias), crônica (média de 28 dias) e ACWR. O paciente responde pelo check-in; o profissional também pode registrar a sessão monitorada. O preparador planeja duração e esforço alvo por frente. A comparação usa somente sessões já realizadas e respondidas: 320 planejado e 280 percebido dão razão 0,88 (subdosado); entre 0,90 e 1,10 é dose certa; acima de 1,10, superdosado. Os totais da semana ficam separados dessa comparação parcial, que traz a quantidade respondida/planejada. Os desvios aparecem no prontuário, sem notificação no celular. O cálculo é local e determinístico, sem créditos de IA; a decisão de ajustar é sempre do terapeuta responsável.",
  },
  {
    q: "Qual a diferença entre a dose do HEP e o link do preparador? Como as duas se relacionam?",
    a: "As duas alimentam o mesmo microciclo, por caminhos diferentes. O HEP calcula a dose de baixo para cima: cada exercício soma por região (séries × repetições ou tempo isométrico × carga), com força contando integral, estabilização/propriocepção pela metade e mobilidade/flexibilidade fora da conta — ao salvar ou editar o programa, a dose recalcula e atualiza as sessões futuras do microciclo com duração, esforço alvo e domínio (fisioterapia, academia ou outro esporte). O link do preparador planeja de cima para baixo: sessão por sessão, com frente, duração e esforço alvo, sem acesso ao prontuário clínico. O paciente relata o esforço real pelo check-in; o sistema cruza os dois na régua de dose (0,90–1,10 = dose certa) e alimenta a carga aguda/crônica e o ACWR. Em resumo: o HEP deriva a dose dos exercícios; o preparador prescreve a dose total da sessão — ambos convergem no mesmo calendário. Na frente do prontuário, as listas mostram só os últimos 3 dias (agrupadas por dia) e os gráficos os últimos 7 dias corridos; o histórico completo, sem nada apagado, fica em \"Ver histórico\" (abre nos últimos 45 dias).",
  },
  {
    q: "Posso lançar eu mesmo os dados do monitor cardíaco do paciente?",
    a: "Sim. No prontuário, em Carga e prontidão, use \"Lançar sessão monitorada\". Envie um print do app do monitor (cinta, relógio ou oxímetro) para a IA ler, ou digite duração, PSE, FC média e máxima, minutos por zona e SpO₂. O sistema mostra duas cargas: sRPE (duração × PSE) e TRIMP (minutos em cada zona de FC × peso 1 a 5). Se o paciente também fizer check-in da mesma data e frente, tudo vira uma sessão só, sem contar duas vezes no ACWR: vale a sua PSE, e a dele fica registrada como percepção do paciente.",
  },
  {
    q: "Como registro os testes funcionais cardiorrespiratórios (TSL, TC6M, degrau)?",
    a: "No prontuário, abra o card recolhido \"Avaliação cardiorrespiratória (testes funcionais)\", abaixo de \"Sessão monitorada\". Escolha TSL 1 min, caminhada de 6 min ou degrau de 6 min e preencha repouso, pico e recuperação, com Borg de falta de ar e de cansaço nas pernas. O laudo mostra o % do previsto (TC6M pela equação brasileira; TSL e degrau pelo valor da tabela que você informar), alertas de SpO₂ e de recuperação da FC e o padrão limitante sugerido, sempre como sugestão. Se já lançou o teste como sessão monitorada (print ou digitação), escolha essa sessão no formulário e a FC máxima, a SpO₂ mínima e a FC após 1 min entram sozinhas, sem redigitar. O teste não soma na carga semanal. Os botões \"Ficha\" copiam um link com instruções e critérios de parada. Os testes do período aparecem nos relatórios cardiovasculares técnico e do paciente.",
  },
  {
    q: "O que o app entrega de análise cardiovascular e como gerar o relatório?",
    a: "No prontuário, abra \"Análise cardiovascular e relatório\" e escolha 4, 8 ou 12 semanas. Você vê os minutos aeróbios por semana comparados à meta da OMS (150 min moderados; 1 min vigoroso vale 2), o tempo em cada zona de FC, as sessões acima do teto do perfil, a recuperação da FC no 1º minuto (queda de até 12 bpm é sinal de atenção, Cole 1999), a coerência entre esforço percebido e resposta cardíaca, a eficiência (metros por batimento ou watts por bpm) e a FC ao acordar. Para atleta e saudável/ativo, mostra a distribuição de intensidade frente ao modelo 80/20; para hipertenso, cardiopata e sedentário, o % de sessões dentro da zona prescrita (SBC 2020, ACSM). Para enriquecer, informe na sessão monitorada a FC 1 min após o esforço, a distância ou a potência; no card do teto, marque \"Usa betabloqueador\" para guiar pela PSE. Os botões geram o relatório técnico em PDF (com tabela de sessões, ressalvas e referências) e a versão do paciente em linguagem simples, que pode ser enviada pelo celular. A interpretação é feita por regras fixas, sem créditos de IA, e é sempre sugestão, não diagnóstico. A análise abre em uma janela separada, sem expandir gráficos no prontuário. Os relatórios equilibram conquistas e pontos a acompanhar, reconhecendo sessões e minutos realizados mesmo abaixo da referência da OMS. A versão do paciente começa valorizando o esforço e propõe próximos passos graduais com o fisioterapeuta, sem ocultar alertas nem presumir inatividade em semanas sem registro. Abra o ícone i no cabeçalho da análise para consultar públicos, FC máxima, teto versus zona-alvo, PSE/RPE e escalas Borg, metas e adaptações (VO₂máx e mitocôndrias). Referências iniciais do app: atleta 90%, saudável/ativo 85%, sedentário 75%, hipertenso controlado 70%, cardiopata 65% e pneumopata/DPOC 70% da FC máxima estimada. Não são limites universais de segurança nem metas a alcançar; tetos manuais são preservados. Em isquemia documentada no teste, considerar pelo menos 10 bpm abaixo do limiar, respeitando o laudo. Em pneumopatas, dispneia e alvo individual de SpO₂ são essenciais: FC e PSE global não confirmam sozinhas a prescrição respiratória. Os relatórios incluem essas ressalvas e orientações por perfil; não medem VO₂máx ou mitocôndrias.",
  },
  {
    q: "Um paciente lembrou de informações depois da avaliação. Como adiciono sem refazer tudo?",
    a: "No prontuário, no bloco \"Informações adicionais\" (abaixo da impressão clínica), qualquer terapeuta da clínica pode escrever o adendo ou gerar um link exclusivo daquela avaliação para o próprio paciente complementar (cirurgias, exames, medicação, o que piora/alivia). O adendo chega marcado como \"não interpretado\" e notifica a equipe. Se mudar o raciocínio, clique em \"Reinterpretar avaliação\": a IA reprocessa a avaliação original somada às novas informações e atualiza hipótese e impressão clínica, guardando a versão anterior. Se for irrelevante, não clique — nada é consumido e o texto fica registrado no prontuário e no PDF.",
  },
  {
    q: "Como aplico o FABQ-Brasil (medo-evitação / catastrofização) na clínica?",
    a: "O FABQ-Brasil é um questionário complementar do domínio Psicossocial (yellow flags): não depende de região corporal, e sim do perfil do paciente. Fica no painel de \"Questionários complementares\" da avaliação manual e da avaliação pelo link institucional. A IA o sugere em dor persistente (> 3 meses), mecanismo nociplástico/sensibilização central, dor de alta intensidade ou relatos de medo de mover, recidiva e afastamento do trabalho — e qualquer terapeuta da equipe também pode aplicá-lo manualmente, na versão completa (16 itens) ou curta (FABQ-PA, 4 itens). Em uma nova avaliação, o profissional pode reaplicar o questionário para comparar as subescalas Atividade Física (0–24, corte ≥ 15) e Trabalho (0–42, corte ≥ 34); os resultados ficam no prontuário, saem no PDF e orientam a IA a priorizar educação em dor e exposição gradual em vez de carga agressiva.",
  },
  {
    q: "Onde ficam as comorbidades (hipertensão, diabetes, cardiopatia) e a medicação contínua do paciente?",
    a: "São perguntas obrigatórias da anamnese em todos os fluxos — avaliação manual, autoavaliação básica/premium e avaliação pelo link institucional da clínica. Ficam no prontuário do paciente, saem em todos os relatórios em PDF e são enviadas ao raciocínio clínico da IA, que adapta a dosagem dos exercícios e sinaliza precauções (evitar Valsalva e isometrias intensas na hipertensão/cardiopatia, cuidados com pé diabético, liberação médica antes de alta intensidade).",
  },
  {
    q: "Preciso confirmar meu email para começar a usar?",
    a: "Não. Ao se cadastrar, você entra direto no painel — sem esperar email de confirmação. Isso evita atrasos em provedores que costumam filtrar nossos emails. Você ainda pode usar normalmente recuperação de senha e receber notificações no email cadastrado.",
  },
  {
    q: "Como cancelo, retomo ou mudo minha assinatura da clínica para anual?",
    a: "Direto no app: Minha Conta → seção 'Assinatura e cobrança' → card 'Minha assinatura'. Ali aparecem plano, valor, status e data da próxima cobrança, e você pode cancelar (o acesso continua até o fim do período já pago), desfazer um cancelamento agendado, mudar de mensal para anual (com crédito proporcional) ou abrir o portal do Stripe para trocar cartão e baixar recibos. Não precisa acionar o suporte — toda alteração é registrada e a equipe Aliv.iA é avisada na hora.",
  },

  {
    q: "Como funciona o trial de 15 dias?",
    a: "Você ativa o trial sem precisar de cartão de crédito. Tem acesso completo a todas as funcionalidades por 15 dias. Ao fim do período, escolhe um plano para continuar — ou seus dados ficam preservados caso retome depois.",
  },
  {
    q: "Como faço para migrar minha agenda atual para o Aliv.iA Clinic?",
    a: "Use a importação por foto (IA OCR): tire uma foto ou screenshot da sua agenda atual — papel, Trello, planilha, Google Agenda ou qualquer outra plataforma — e a IA cria todos os agendamentos automaticamente. Em menos de 1 minuto sua agenda está pronta.",
  },
  {
    q: "Quem da minha equipe consegue ver o quê?",
    a: "Você define papéis: Dono(a) vê tudo (financeiro, equipe, todos os pacientes); Secretária gerencia agenda e cadastros, mas não vê prontuário clínico; Fisioterapeuta vê apenas seus próprios pacientes e a agenda da clínica.",
  },
  {
    q: "Posso adicionar estudantes de fisioterapia como estagiários na minha clínica?",
    a: "Sim. Estudantes ativam o modo 'Acesso Estudante — Alivia Acadêmico' em Minha Conta (informam nome, instituição e período) e ficam isentos do CREFITO. Ao adicioná-los à equipe, escolha o papel 'Estagiário (Acadêmico)' no seletor — ele tem as mesmas permissões do Fisioterapeuta (acesso a pacientes, prontuários, agenda e documentos), mas deixa claro para a equipe que aquela pessoa é um aluno em formação. Todos os PDFs gerados por esse estagiário saem com o selo 'Alivia Acadêmico · Instituição · Período' no lugar do CREFITO. O estagiário não aparece na busca pública do marketplace e segue usando o link institucional da clínica como qualquer outro membro.",
  },
  {
    q: "Preciso enviar o link de pré-avaliação institucional ou posso usar meu link pessoal?",
    a: "Em modo Clínica, a equipe deve usar sempre o link institucional da clínica. Isso garante que o paciente seja vinculado ao prontuário compartilhado da clínica e não ao perfil pessoal do profissional. Evita também uso indevido dos recursos da clínica para pacientes particulares.",
  },
  {
    q: "Os tratamentos têm custo extra por paciente?",
    a: "Não. Em modo Clínica, todos os tratamentos, programas de exercício, IA, armazenamento e funcionalidades estão inclusos na assinatura. Você paga apenas o plano mensal/anual conforme o porte da clínica.",
  },
  {
    q: "Como personalizo a marca da clínica nos PDFs e no painel?",
    a: "No painel do dono(a), em Configurações da Clínica, você sobe o logo e escolhe a cor principal. Essa identidade aparece automaticamente nos relatórios PDF, no link de avaliação dos pacientes e na pesquisa de satisfação.",
  },
  {
    q: "O paciente precisa instalar algum app?",
    a: "Não. O paciente acessa tudo pelo navegador (link de avaliação, programa de exercícios, pesquisa de satisfação, vídeochamada). O Aliv.iA também pode ser instalado como PWA, sem passar por loja de app.",
  },
  {
    q: "Como funciona a pesquisa de satisfação (NPS)?",
    a: "Você gera um link público de pesquisa e envia ao paciente após o atendimento (por chat, e-mail ou WhatsApp). As respostas geram um dashboard de NPS por profissional e por tipo de serviço, ajudando você a tomar decisões sobre equipe e qualidade.",
  },
  {
    q: "A IA substitui o raciocínio do fisioterapeuta?",
    a: "Não. A IA é uma camada de apoio: organiza os dados, sugere hipóteses e fluxos baseados em evidência (STEPS, D.I.F.I, McKenzie, HIMA, HSR). A decisão clínica final é sempre do profissional.",
  },
  {
    q: "Como faço upload de exames e laudos do paciente?",
    a: "Dentro do prontuário do paciente há a aba de arquivos: faça upload de PDF, imagem ou foto (até 20MB por arquivo). Tudo fica vinculado ao paciente e acessível à equipe conforme as permissões.",
  },
  {
    q: "Os dados da clínica e dos pacientes são seguros?",
    a: "Sim. Os dados são criptografados em trânsito e em repouso, com regras de acesso por papel (RLS). A plataforma segue boas práticas de LGPD e pacientes podem solicitar exclusão dos dados a qualquer momento.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Não há fidelidade. Você pode cancelar pelo painel quando quiser e seus dados continuam disponíveis para exportação por um período após o cancelamento.",
  },
];

const ClinicSupport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0].title);

  useEffect(() => {
    setSeo({
      title: "Suporte Aliv.iA Clinic — Tire suas dúvidas",
      description: "Guia completo das funcionalidades do Aliv.iA Clinic: agenda IA, pré-avaliação, prontuário, NPS, white-label e muito mais.",
      url: "https://aliviawebapp.com.br/clinica/suporte",
      type: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container py-12 md:py-20">
        {user && (
          <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={() => navigate("/dashboard")}>
            <Building2 className="h-4 w-4" />
            Voltar ao Painel
          </Button>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Building2 className="h-4 w-4" />
            Suporte Aliv.iA Clinic
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Tudo o que sua clínica precisa, explicado com calma
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Guia das funcionalidades do modo Clínica — da migração da agenda à pesquisa de satisfação. Se ainda restar dúvida, fale com a gente.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto mb-10">
          <InstallAppCard defaultOpen={false} hideIfStandalone={false} />
        </div>



        {/* Quick links to landing & demo */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate("/clinica")}>
            <Sparkles className="h-4 w-4" />
            Ver página da Clínica
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate("/clinica/demo")}>
            <UserCog className="h-4 w-4" />
            Experimentar demo
          </Button>
        </div>

        {/* Categorias */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Funcionalidades por categoria
          </h2>

          <div className="space-y-4">
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const isOpen = openCategory === cat.title;
              return (
                <Card key={cat.title} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors">
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : cat.title)}
                    className="w-full flex items-center gap-4 p-5 text-left"
                  >
                    <div className="rounded-xl bg-primary/10 p-3 shrink-0">
                      <CatIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{cat.title}</h3>
                      <p className="text-sm text-muted-foreground">{cat.items.length} funcionalidades</p>
                    </div>
                    <span className="text-primary text-sm font-medium">{isOpen ? "Fechar" : "Abrir"}</span>
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-5">
                      <Accordion type="single" collapsible className="w-full">
                        {cat.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <AccordionItem key={item.key} value={item.key}>
                              <AccordionTrigger className="text-left text-base font-medium text-foreground gap-3">
                                <span className="flex items-center gap-3">
                                  <ItemIcon className="h-4 w-4 text-primary shrink-0" />
                                  {item.key === "studio_cardiorespiratory" || item.key === "studio_ecosystem" ? t(`support.pro.tool.${item.key}.title`) : item.title}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="text-muted-foreground leading-relaxed pl-7">
                                {item.key === "studio_cardiorespiratory" || item.key === "studio_ecosystem" ? t(`support.pro.tool.${item.key}.desc`) : item.desc}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqKeys.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Pricing reminder */}
        <Card className="max-w-3xl mx-auto mb-16 border-primary/30 bg-primary/5">
          <CardContent className="p-6 md:p-8 text-center">
            <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold text-foreground mb-2">Tudo incluso. Sem custo por atendimento.</h3>
            <p className="text-muted-foreground mb-4">
              IA, tratamentos, armazenamento, vídeochamada, pesquisa de satisfação e white-label estão inclusos no plano da clínica.
            </p>
            <Button onClick={() => navigate("/clinica#pricing")} className="gap-2 rounded-xl">
              Ver planos e preços
            </Button>
          </CardContent>
        </Card>

        {/* Contato */}
        {user ? (
          <SupportContactForm />
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Faça login para abrir um chamado de suporte com nossa equipe.</p>
            <Button onClick={() => navigate("/auth")} className="gap-2 rounded-xl">
              Entrar
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ClinicSupport;
