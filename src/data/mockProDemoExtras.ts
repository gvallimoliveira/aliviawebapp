// Mock session notes and patient documents for Pro/Clinic demo mode.
// Used by SessionNotesSection and PatientFilesSection when isDemo=true.

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export interface MockSessionNote {
  id: string;
  session_date: string;
  content: string;
  created_at: string;
  updated_at: string;
  appointment_id?: string | null;
}

export interface MockPatientFile {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
  created_at: string;
}

// ─── Session notes by patient_email ───
// Each patient has 3-6 entries of real clinical evolution narrative.
export const mockSessionNotes: Record<string, MockSessionNote[]> = {
  "maria.silva@exemplo.com": [
    { id: "sn-m1", session_date: daysAgo(56), content: "Sessão 1 — Avaliação física: Lasègue +60° à D, Bragard +, FAIR + à D. ADM lombar com flexão 40°/extensão 15°. Iniciada educação em dor e mobilização neural suave. EVA 7→6 pós-sessão.", created_at: new Date(Date.now() - 56*86400000).toISOString(), updated_at: new Date(Date.now() - 56*86400000).toISOString() },
    { id: "sn-m2", session_date: daysAgo(49), content: "Sessões 2-4 — Boa tolerância à mobilização neural. Introduzido bird-dog e dead bug com supervisão. Paciente relata melhora do sono. EVA média 5/10. Aderência ao HEP: 100%.", created_at: new Date(Date.now() - 49*86400000).toISOString(), updated_at: new Date(Date.now() - 49*86400000).toISOString() },
    { id: "sn-m3", session_date: daysAgo(35), content: "Sessões 5-7 — Resolução da irradiação para quadril D! Lasègue negativo bilateralmente. Progressão para prancha ventral 20s × 3 e agachamento parcial. Paciente retomou caminhada 20 min 3x/semana.", created_at: new Date(Date.now() - 35*86400000).toISOString(), updated_at: new Date(Date.now() - 35*86400000).toISOString() },
    { id: "sn-m4", session_date: daysAgo(21), content: "Sessões 8-10 — Excelente evolução. Oswestry caiu de 56% para 32%. EVA 3/10 apenas após permanecer sentada >2h. Introduzido fortalecimento avançado: agachamento completo, ponte unipodal, peso morto romeno com bastão.", created_at: new Date(Date.now() - 21*86400000).toISOString(), updated_at: new Date(Date.now() - 21*86400000).toISOString() },
    { id: "sn-m5", session_date: daysAgo(7), content: "Sessões 11-12 — Quadro praticamente resolvido. EVA 1/10. Tolera sentar-se a tarde toda no trabalho com pausas. Iniciada preparação para alta: revisão completa do HEP e orientações de prevenção secundária.", created_at: new Date(Date.now() - 7*86400000).toISOString(), updated_at: new Date(Date.now() - 7*86400000).toISOString() },
    { id: "sn-m6", session_date: daysAgo(2), content: "Sessão 13 — ALTA FUNCIONAL. Oswestry 8% (mínima). Paciente retomou todas atividades, inclusive aulas de dança 2x/semana. Programa de manutenção entregue. Reavaliação agendada em 3 meses.", created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date(Date.now() - 2*86400000).toISOString() },
  ],

  "joao.santos@exemplo.com": [
    { id: "sn-j1", session_date: daysAgo(60), content: "Sessão 1 — Pós-avaliação. Confirmada condromalácia grau II com base em sinais clínicos. Iniciado isometria de quadríceps em 60°, mobilização patelar e crioterapia. Orientado a evitar agachamento profundo temporariamente.", created_at: new Date(Date.now() - 60*86400000).toISOString(), updated_at: new Date(Date.now() - 60*86400000).toISOString() },
    { id: "sn-j2", session_date: daysAgo(55), content: "Sessões 2-3 — Boa resposta inicial. EVA 5→3. Introduzido mini-squat 0-45° e fortalecimento de glúteo médio. Paciente apresenta valgo dinâmico — trabalho específico de controle motor. Reforçada importância da adesão ao HEP.", created_at: new Date(Date.now() - 55*86400000).toISOString(), updated_at: new Date(Date.now() - 55*86400000).toISOString() },
    { id: "sn-j3", session_date: daysAgo(50), content: "Sessão 4 — Paciente faltou às duas sessões anteriores. Relata 'falta de tempo' e que voltou a correr (>10 km no fim de semana). Reorientado sobre risco de sobrecarga. Combinado plano de retomada — paciente NÃO retornou nas semanas seguintes.", created_at: new Date(Date.now() - 50*86400000).toISOString(), updated_at: new Date(Date.now() - 50*86400000).toISOString() },
    { id: "sn-j4", session_date: daysAgo(2), content: "REAVALIAÇÃO após 7 semanas sem comparecimento. PIORA CLÍNICA importante: EVA 7/10, edema reativo, crepitação franca, Trendelenburg dinâmico. KOOS caiu de 42% para 28% (-33%). Ganhou 6 kg. Entrevista motivacional realizada — paciente reconhece padrão de abandono. Pactuado novo plano com metas semanais curtas e check-in remoto.", created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date(Date.now() - 2*86400000).toISOString() },
  ],


  "ana.oliveira@exemplo.com": [
    { id: "sn-a1", session_date: daysAgo(9), content: "Sessão 1 — Iniciada terapia manual cervical (mobilização articular grau III), neurodinâmica do mediano e retração cervical. EVA 8→6. Orientação ergonômica detalhada para posto de trabalho. Encaminhado vídeo de exercícios.", created_at: new Date(Date.now() - 9*86400000).toISOString(), updated_at: new Date(Date.now() - 9*86400000).toISOString() },
    { id: "sn-a2", session_date: daysAgo(6), content: "Sessões 2-3 — Resolução da parestesia em dedos! Paciente relata sono restaurador pela primeira vez em meses. Introduzido fortalecimento DCF (Deep Cervical Flexors) com pressure biofeedback (alvo 22 mmHg × 10s × 10 rep).", created_at: new Date(Date.now() - 6*86400000).toISOString(), updated_at: new Date(Date.now() - 6*86400000).toISOString() },
    { id: "sn-a3", session_date: daysAgo(3), content: "Sessão 4 — REAVALIAÇÃO FORMAL. NDI caiu de 62% para 28% (melhora de 55%). DASH de 58% para 22%. Resolução completa da irradiação. Paciente entusiasmada. Próximos passos: progressão para fortalecimento global de cintura escapular.", created_at: new Date(Date.now() - 3*86400000).toISOString(), updated_at: new Date(Date.now() - 3*86400000).toISOString() },
  ],

  "carlos.mendes@exemplo.com": [
    { id: "sn-c1", session_date: daysAgo(1), content: "Avaliação inicial: identificadas múltiplas red flags (idade >55, início súbito sem trauma, dor noturna, sem alívio). Aplicado screening completo conforme STEPS framework. ENCAMINHAMENTO MÉDICO PRIORITÁRIO emitido. Tratamento fisioterapêutico SUSPENSO até avaliação médica.", created_at: new Date(Date.now() - 1*86400000).toISOString(), updated_at: new Date(Date.now() - 1*86400000).toISOString() },
    { id: "sn-c2", session_date: new Date().toISOString().split("T")[0], content: "Retorno após investigação. RM lombar (anexada nos documentos) confirma protusão discal L4-L5 sem compressão radicular. Sem sinais sistêmicos. Ortopedista liberou para fisioterapia. Iniciado protocolo McKenzie de extensão. EVA 9→6.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],

  "roberto.tavares@exemplo.com": [
    { id: "sn-r1", session_date: daysAgo(58), content: "Sessão 1 (10 dias pós-op SLAP D) — Avaliação e início do protocolo de proteção. Crioterapia compressiva 20 min, pendular de Codman 3x20, mobilização passiva flexão até 80° / RE em ABD 0° até 25°. Isometria escapular submáxima. Reforçadas restrições (não retirar tipoia, não realizar RE ativa). EVA 6→4 pós-sessão.", created_at: new Date(Date.now() - 58*86400000).toISOString(), updated_at: new Date(Date.now() - 58*86400000).toISOString() },
    { id: "sn-r2", session_date: daysAgo(50), content: "Sessões 2-5 — Boa tolerância. Progressão da mobilização passiva conforme protocolo (flexão 90°, RE em ABD 0° até 30°). Trabalho ativo de cotovelo, punho e mão com TheraBand leve. Paciente mantém adesão estrita à tipoia. Sono melhorou com travesseiro sob o cotovelo.", created_at: new Date(Date.now() - 50*86400000).toISOString(), updated_at: new Date(Date.now() - 50*86400000).toISOString() },
    { id: "sn-r3", session_date: daysAgo(35), content: "Sessões 6-10 (semanas 5-7) — Liberada retirada gradual da tipoia pelo cirurgião. Iniciada ADM ativa-assistida com bastão (flexão 120°, ABD 110°, RE em ABD 30° = 45°). Isometria multidirecional do manguito (10x10s) sem dor. Início do fortalecimento escapular (wall slide, prone Y).", created_at: new Date(Date.now() - 35*86400000).toISOString(), updated_at: new Date(Date.now() - 35*86400000).toISOString() },
    { id: "sn-r4", session_date: daysAgo(20), content: "Sessões 11-15 (semanas 8-10) — ADM passiva completa atingida. Iniciado fortalecimento dinâmico isotônico leve do manguito rotador (RE/RI em decúbito lateral com halter 1kg). Estabilização escapular avançada (prone T/W, push-up plus modificado). Paciente refere apenas dor leve ao final dos treinos.", created_at: new Date(Date.now() - 20*86400000).toISOString(), updated_at: new Date(Date.now() - 20*86400000).toISOString() },
    { id: "sn-r5", session_date: daysAgo(8), content: "Sessões 16-19 (semanas 11-13) — Progressão excelente. Iniciado treino em cadeia cinética fechada (push-up em parede → bancada → solo). Carga isotônica do manguito progredindo (RE com halter 2,5 kg). Início de gestos overhead controlados (alcance para prateleira). EVA 1-2/10 apenas pós-treino.", created_at: new Date(Date.now() - 8*86400000).toISOString(), updated_at: new Date(Date.now() - 8*86400000).toISOString() },
    { id: "sn-r6", session_date: daysAgo(4), content: "Sessão 20 — REAVALIAÇÃO formal. DASH 14% (mínimo). Isocinético: LSI 88% RE, 92% flexão. KJOC 84%. Sem dor noturna. Iniciada progressão para gestos esportivos específicos (kettlebell snatch leve, suporte invertido em parede). Liberação para retorno ao CrossFit prevista em 4-6 semanas.", created_at: new Date(Date.now() - 4*86400000).toISOString(), updated_at: new Date(Date.now() - 4*86400000).toISOString() },
  ],


  "juliana.castro@exemplo.com": [
    { id: "sn-jc1", session_date: daysAgo(88), content: "Sessão 1 (10 dias pós-op LCA E) — Edema 3+, ADM 0-65°, déficit de extensão 5°. Iniciada crioterapia compressiva, mobilização patelar, ADM passiva suave em CPM 30 min, isometria de quadríceps em 0° (QSET) e SLR. Reforçado uso de muletas com descarga parcial.", created_at: new Date(Date.now() - 88*86400000).toISOString(), updated_at: new Date(Date.now() - 88*86400000).toISOString() },
    { id: "sn-jc2", session_date: daysAgo(75), content: "Sessões 2-5 — Resolução do déficit de extensão na 3ª sessão. ADM 0-110° aos 25 dias. Liberada descarga total pelo ortopedista. Iniciado mini-squat 0-30° em parede e treino proprioceptivo simples (apoio bipodal com olhos fechados).", created_at: new Date(Date.now() - 75*86400000).toISOString(), updated_at: new Date(Date.now() - 75*86400000).toISOString() },
    { id: "sn-jc3", session_date: daysAgo(58), content: "Sessões 6-10 — Excelente progressão. Bike ergométrica 20 min, leg press 60% peso corporal, agachamento livre 0-60°. Treino unipodal em superfície estável. Quadríceps com LSI 65%. Sem efusão articular.", created_at: new Date(Date.now() - 58*86400000).toISOString(), updated_at: new Date(Date.now() - 58*86400000).toISOString() },
    { id: "sn-jc4", session_date: daysAgo(38), content: "Sessões 11-16 — Avançado para corrida em piscina (20 min) e elíptico. Treino proprioceptivo em prancha + bosu. Iniciado salto bipodal estático. LSI quadríceps 78%. Paciente ansiosa para voltar a correr — orientada sobre critérios de progressão.", created_at: new Date(Date.now() - 38*86400000).toISOString(), updated_at: new Date(Date.now() - 38*86400000).toISOString() },
    { id: "sn-jc5", session_date: daysAgo(20), content: "Sessões 17-22 — Pliometria progressiva (saltos bipodais → unipodais → drop jumps). Treino de aterrissagem com feedback de vídeo. Mudanças de direção 45° → 90°. LSI 88%. Hop tests com 86% de simetria. Iniciada corrida em esteira 5 km/h × 10 min sem dor.", created_at: new Date(Date.now() - 20*86400000).toISOString(), updated_at: new Date(Date.now() - 20*86400000).toISOString() },
    { id: "sn-jc6", session_date: daysAgo(5), content: "Sessões 23-25 — BATERIA RTS (Return to Sport) aplicada: LSI ≥95% em todos os testes, hop tests simétricos, IKDC 94%, TSK 22 (sem cinesiofobia). LIBERADA para retorno gradual à corrida em programa estruturado de 12 semanas. Entregue FIFA 11+ adaptado.", created_at: new Date(Date.now() - 5*86400000).toISOString(), updated_at: new Date(Date.now() - 5*86400000).toISOString() },
  ],

  "helena.rocha@exemplo.com": [
    { id: "sn-h1", session_date: daysAgo(48), content: "Sessão 1 (10 dias pós-ATQ D) — Avaliação inicial domiciliar. Reforçadas precauções anti-luxação posterior. Crioterapia + elevação MID, bombeamento de tornozelo, isometria de quadríceps e glúteos. Treino de transferências (cama-cadeira-sanitário elevado). Marcha com andador no corredor (10m × 3). EVA 5→3.", created_at: new Date(Date.now() - 48*86400000).toISOString(), updated_at: new Date(Date.now() - 48*86400000).toISOString() },
    { id: "sn-h2", session_date: daysAgo(40), content: "Sessões 2-4 — Boa evolução. Edema do MID reduzido. ABD ativa em DD progredindo (15° → 25°). Marcha estendida (corredor 20m × 5). Família participa do treino de transferências. Coordenado com cirurgião — liberada descarga total a partir da 3ª semana.", created_at: new Date(Date.now() - 40*86400000).toISOString(), updated_at: new Date(Date.now() - 40*86400000).toISOString() },
    { id: "sn-h3", session_date: daysAgo(28), content: "Sessões 5-8 (semanas 4-6) — Transição do andador para muleta canadense bilateral. Iniciado mini-agachamento bipodal ≤40°, abdução em pé com tornozeleira de 0,5 kg. Step de 10 cm com apoio. Trendelenburg evidente — foco em ativação isolada de glúteo médio (clamshell modificado dentro das precauções).", created_at: new Date(Date.now() - 28*86400000).toISOString(), updated_at: new Date(Date.now() - 28*86400000).toISOString() },
    { id: "sn-h4", session_date: daysAgo(22), content: "Sessão 9 — REAVALIAÇÃO 1. HOOS 32%→58% (+81%), Harris Hip Score 38→72. ADM flexão 95°, ABD 30° (dentro das precauções). Glúteo médio MRC 3+. Transição para bengala canadense em curtas distâncias.", created_at: new Date(Date.now() - 22*86400000).toISOString(), updated_at: new Date(Date.now() - 22*86400000).toISOString() },
    { id: "sn-h5", session_date: daysAgo(12), content: "Sessões 10-13 (semanas 8-10) — Marcha independente com bengala. Bicicleta estacionária 15 min sem carga (selim alto). Subida e descida de escada alternada com apoio. Glúteo médio MRC 4, Trendelenburg discreto residual. Educação sobre precauções vitalícias do implante.", created_at: new Date(Date.now() - 12*86400000).toISOString(), updated_at: new Date(Date.now() - 12*86400000).toISOString() },
    { id: "sn-h6", session_date: daysAgo(5), content: "Sessão 14 — REAVALIAÇÃO FINAL. HOOS 88%, Harris Hip Score 92 (excelente). Marcha independente sem dispositivo, sem Trendelenburg. ADM funcional (flexão 110°). Apta para ALTA com programa domiciliar de manutenção e seguimento anual com cirurgião. Reforçadas precauções vitalícias.", created_at: new Date(Date.now() - 5*86400000).toISOString(), updated_at: new Date(Date.now() - 5*86400000).toISOString() },
  ],

};

// ─── Patient documents by patient_email ───
// Listing only (no real files). Names follow realistic clinical pattern.
export const mockPatientFiles: Record<string, MockPatientFile[]> = {
  "maria.silva@exemplo.com": [
    { id: "doc-m1", file_name: "RM_Lombar_MariaSilva_2024.pdf", file_size_bytes: 2_450_000, mime_type: "application/pdf", description: "Ressonância magnética lombar — protusão L4-L5 sem compressão radicular", created_at: new Date(Date.now() - 60*86400000).toISOString() },
    { id: "doc-m2", file_name: "Encaminhamento_Ortopedista.pdf", file_size_bytes: 380_000, mime_type: "application/pdf", description: "Encaminhamento do ortopedista para fisioterapia", created_at: new Date(Date.now() - 58*86400000).toISOString() },
    { id: "doc-m3", file_name: "Resultados_ExamesLab_Set2025.pdf", file_size_bytes: 520_000, mime_type: "application/pdf", description: "Hemograma + VHS + PCR (sem alterações)", created_at: new Date(Date.now() - 55*86400000).toISOString() },
  ],
  "joao.santos@exemplo.com": [
    { id: "doc-j1", file_name: "RX_Joelho_D_Bilateral.pdf", file_size_bytes: 1_120_000, mime_type: "application/pdf", description: "Radiografia bilateral do joelho — patela alta D", created_at: new Date(Date.now() - 35*86400000).toISOString() },
    { id: "doc-j2", file_name: "RM_Joelho_D.pdf", file_size_bytes: 3_200_000, mime_type: "application/pdf", description: "Ressonância — condromalácia patelar grau II", created_at: new Date(Date.now() - 32*86400000).toISOString() },
  ],
  "ana.oliveira@exemplo.com": [
    { id: "doc-a1", file_name: "RM_Cervical_AnaOliveira.pdf", file_size_bytes: 2_850_000, mime_type: "application/pdf", description: "RM cervical — protusão C5-C6 com contato radicular", created_at: new Date(Date.now() - 14*86400000).toISOString() },
    { id: "doc-a2", file_name: "EMG_MembroSuperior_D.pdf", file_size_bytes: 680_000, mime_type: "application/pdf", description: "Eletromiografia — radiculopatia C6 leve", created_at: new Date(Date.now() - 12*86400000).toISOString() },
    { id: "doc-a3", file_name: "Laudo_NeurologistaAssistente.pdf", file_size_bytes: 420_000, mime_type: "application/pdf", description: "Relatório do neurologista", created_at: new Date(Date.now() - 11*86400000).toISOString() },
  ],
  "carlos.mendes@exemplo.com": [
    { id: "doc-c1", file_name: "RM_TorácoLombar_URGENCIA.pdf", file_size_bytes: 3_450_000, mime_type: "application/pdf", description: "RM toraco-lombar — sem sinais de patologia grave; protusão L4-L5", created_at: new Date(Date.now() - 18*3600000).toISOString() },
    { id: "doc-c2", file_name: "Laudo_Ortopedista_LiberacaoFisio.pdf", file_size_bytes: 290_000, mime_type: "application/pdf", description: "Liberação ortopédica para fisioterapia", created_at: new Date(Date.now() - 12*3600000).toISOString() },
    { id: "doc-c3", file_name: "Exames_Lab_PCR_VHS.pdf", file_size_bytes: 410_000, mime_type: "application/pdf", description: "Marcadores inflamatórios normais", created_at: new Date(Date.now() - 16*3600000).toISOString() },
  ],
  "roberto.tavares@exemplo.com": [
    { id: "doc-r1", file_name: "RM_Ombro_D_PreOperatorio.pdf", file_size_bytes: 3_650_000, mime_type: "application/pdf", description: "RM pré-op — lesão SLAP tipo II, manguito íntegro", created_at: new Date(Date.now() - 90*86400000).toISOString() },
    { id: "doc-r2", file_name: "Relatorio_Cirurgico_Artroscopia_SLAP.pdf", file_size_bytes: 880_000, mime_type: "application/pdf", description: "Relatório cirúrgico — reparo SLAP tipo II com âncora bioabsorvível", created_at: new Date(Date.now() - 70*86400000).toISOString() },
    { id: "doc-r3", file_name: "Protocolo_PosOp_Ortopedista.pdf", file_size_bytes: 460_000, mime_type: "application/pdf", description: "Protocolo de reabilitação pós-op do cirurgião (fases e restrições)", created_at: new Date(Date.now() - 68*86400000).toISOString() },
    { id: "doc-r4", file_name: "RX_Controle_6semanas.pdf", file_size_bytes: 720_000, mime_type: "application/pdf", description: "RX de controle — âncora bem posicionada", created_at: new Date(Date.now() - 28*86400000).toISOString() },
    { id: "doc-r5", file_name: "Avaliacao_Isocinetica_LSI.pdf", file_size_bytes: 540_000, mime_type: "application/pdf", description: "Avaliação isocinética bilateral — LSI por velocidade angular", created_at: new Date(Date.now() - 6*86400000).toISOString() },
  ],

  "juliana.castro@exemplo.com": [
    { id: "doc-jc1", file_name: "RM_Joelho_PreOperatorio.pdf", file_size_bytes: 3_800_000, mime_type: "application/pdf", description: "RM pré-op — ruptura completa LCA E, meniscos íntegros", created_at: new Date(Date.now() - 110*86400000).toISOString() },
    { id: "doc-jc2", file_name: "Relatorio_Cirurgico_LCA.pdf", file_size_bytes: 920_000, mime_type: "application/pdf", description: "Relatório cirúrgico — reconstrução com enxerto semitendíneo+gracilis", created_at: new Date(Date.now() - 90*86400000).toISOString() },
    { id: "doc-jc3", file_name: "Protocolo_PosOp_Ortopedista.pdf", file_size_bytes: 480_000, mime_type: "application/pdf", description: "Protocolo de progressão pós-op do cirurgião", created_at: new Date(Date.now() - 90*86400000).toISOString() },
    { id: "doc-jc4", file_name: "RX_Controle_30dias.pdf", file_size_bytes: 950_000, mime_type: "application/pdf", description: "RX de controle — túneis ósseos bem posicionados", created_at: new Date(Date.now() - 60*86400000).toISOString() },
    { id: "doc-jc5", file_name: "LiberacaoMedica_RetornoEsporte.pdf", file_size_bytes: 320_000, mime_type: "application/pdf", description: "Liberação formal do ortopedista para retorno esportivo", created_at: new Date(Date.now() - 5*86400000).toISOString() },
  ],
  "helena.rocha@exemplo.com": [
    { id: "doc-h1", file_name: "RX_Quadril_D_PreOperatorio.pdf", file_size_bytes: 1_180_000, mime_type: "application/pdf", description: "RX pré-op — coxartrose terminal Kellgren-Lawrence IV", created_at: new Date(Date.now() - 90*86400000).toISOString() },
    { id: "doc-h2", file_name: "Relatorio_Cirurgico_ATQ_PosteroLateral.pdf", file_size_bytes: 940_000, mime_type: "application/pdf", description: "Relatório cirúrgico — artroplastia total via póstero-lateral, prótese não-cimentada", created_at: new Date(Date.now() - 55*86400000).toISOString() },
    { id: "doc-h3", file_name: "Protocolo_PosOp_Cirurgiao.pdf", file_size_bytes: 410_000, mime_type: "application/pdf", description: "Protocolo de reabilitação e precauções anti-luxação posterior", created_at: new Date(Date.now() - 53*86400000).toISOString() },
    { id: "doc-h4", file_name: "RX_Controle_6semanas.pdf", file_size_bytes: 820_000, mime_type: "application/pdf", description: "RX de controle — componentes bem posicionados, sem sinais de afrouxamento", created_at: new Date(Date.now() - 12*86400000).toISOString() },
    { id: "doc-h5", file_name: "ExamesLab_Pre_Op.pdf", file_size_bytes: 380_000, mime_type: "application/pdf", description: "Hemograma, coagulograma e função renal pré-op", created_at: new Date(Date.now() - 95*86400000).toISOString() },
  ],

};

// ─── Registros manuais de "Saúde geral" por patient_email (demo) ───
// Demonstram a atualização feita pelo profissional direto no prontuário, sem
// precisar de nova avaliação, e os níveis de atenção (controlada x não manejada).
export interface MockHealthRecord {
  id: string;
  recorded_at: string;
  author_name: string | null;
  health_conditions: string[];
  health_conditions_other: string | null;
  health_conditions_other_onset: string | null;
  health_conditions_other_control: string | null;
  health_conditions_control: Record<string, string>;
  uses_continuous_medication: string | null;
  continuous_medications: string | null;
  change_summary: string | null;
  observations: string | null;
  suggestions: string | null;
}

export const mockHealthRecords: Record<string, MockHealthRecord[]> = {
  "maria.silva@exemplo.com": [
    {
      id: "hr-m1",
      recorded_at: daysAgo(5),
      author_name: "Dr. Demo (você)",
      health_conditions: ["hypertension"],
      health_conditions_other: null,
      health_conditions_other_onset: null,
      health_conditions_other_control: null,
      health_conditions_control: { hypertension: "controlled" },
      uses_continuous_medication: "yes",
      continuous_medications: "Losartana 50mg (1x/dia)",
      change_summary: "PA estabilizada em 124/78 mmHg nas últimas 3 sessões; cardiologista manteve a dose.",
      observations: "Sem tontura ao levantar. Tolera bem exercício resistido moderado com respiração contínua.",
      suggestions: "Manter aferição de PA antes das séries mais intensas e evitar Valsalva.",
    },
  ],
  "ana.oliveira@exemplo.com": [
    {
      id: "hr-a1",
      recorded_at: daysAgo(4),
      author_name: "Dr. Demo (você)",
      health_conditions: ["diabetes"],
      health_conditions_other: null,
      health_conditions_other_onset: null,
      health_conditions_other_control: null,
      health_conditions_control: { diabetes: "uncontrolled" },
      uses_continuous_medication: "yes",
      continuous_medications: "Metformina 850mg (2x/dia)",
      change_summary: "Glicemia capilar 212 mg/dL na sessão; paciente sem consulta com endocrinologista há 8 meses.",
      observations: "Relata formigamento plantar noturno — triagem de neuropatia pendente.",
      suggestions: "Encaminhamento para reavaliação médica; inspeção de pés a cada sessão e progressão conservadora.",
    },
  ],
  "carlos.mendes@exemplo.com": [
    {
      id: "hr-c1",
      recorded_at: daysAgo(1),
      author_name: "Dr. Demo (você)",
      health_conditions: ["hypertension", "heart_disease"],
      health_conditions_other: null,
      health_conditions_other_onset: null,
      health_conditions_other_control: null,
      health_conditions_control: { hypertension: "controlled", heart_disease: "partial" },
      uses_continuous_medication: "yes",
      continuous_medications: "Atenolol 25mg, AAS 100mg",
      change_summary: "Cardiologista liberou atividade leve a moderada; betabloqueador em uso.",
      observations: "FC não é parâmetro confiável (betabloqueador) — usar percepção de esforço (Borg 11-13).",
      suggestions: "Sem isometria sustentada em alta intensidade; liberação médica antes de progressão vigorosa.",
    },
  ],
};
