
CREATE TABLE public.academic_fixed_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.academic_tracks(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  order_index INT NOT NULL,
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, order_index)
);

GRANT SELECT ON public.academic_fixed_quizzes TO authenticated;
GRANT ALL ON public.academic_fixed_quizzes TO service_role;

ALTER TABLE public.academic_fixed_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read fixed quizzes"
  ON public.academic_fixed_quizzes FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_fixed_quizzes_niche ON public.academic_fixed_quizzes(niche, order_index);

CREATE OR REPLACE FUNCTION public.get_next_fixed_quiz(_user_id UUID, _niche TEXT)
RETURNS TABLE (id UUID, topic TEXT, questions JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id UUID; _topic TEXT; _questions JSONB;
BEGIN
  SELECT q.id, q.topic, q.questions INTO _id, _topic, _questions
  FROM public.academic_fixed_quizzes q
  WHERE q.niche = _niche
    AND NOT EXISTS (
      SELECT 1 FROM public.academic_quiz_results r
      WHERE r.user_id = _user_id AND r.topic = q.topic
    )
  ORDER BY q.order_index
  LIMIT 1;

  IF _id IS NULL THEN
    SELECT q.id, q.topic, q.questions INTO _id, _topic, _questions
    FROM public.academic_fixed_quizzes q
    WHERE q.niche = _niche
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF _id IS NOT NULL THEN
    id := _id; topic := _topic; questions := _questions;
    RETURN NEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_fixed_quiz(UUID, TEXT) TO authenticated, service_role;

INSERT INTO public.academic_fixed_quizzes (track_id, niche, order_index, topic, questions)
SELECT t.id, t.niche, x.order_index, x.topic, x.questions::jsonb
FROM public.academic_tracks t
JOIN (VALUES
('cervical', 1, 'Cervicalgia mecânica', $j$[
{"type":"multiple_choice","question":"Qual é o achado clínico mais característico da cervicalgia mecânica simples?","options":["A) Dor irradiada para membro superior com parestesia distal","B) Dor cervical posterior que piora com movimento e melhora em repouso","C) Cefaleia em trovoada associada a rigidez de nuca","D) Fraqueza progressiva bilateral em membros inferiores"],"correct":"B","explanation":"Cervicalgia mecânica caracteriza-se por dor posterior modulada por movimento, sem déficit neurológico."},
{"type":"multiple_choice","question":"Qual conduta inicial tem melhor evidência para cervicalgia mecânica aguda?","options":["A) Repouso absoluto e colar cervical contínuo","B) Manter atividade + exercícios ativos e educação em dor","C) Tração cervical mecânica diária","D) Infiltração de corticoide facetária imediata"],"correct":"B","explanation":"Movimento ativo + educação superam imobilização. Colar prolongado aumenta cinesiofobia."},
{"type":"multiple_choice","question":"Qual teste auxilia a diferenciar cervicalgia mecânica de radiculopatia?","options":["A) Teste de Spurling","B) Teste de Thomas","C) Teste de Lasègue","D) Teste de Apley"],"correct":"A","explanation":"Spurling (extensão + rotação + compressão axial) reproduz dor radicular quando há compressão radicular cervical."}
]$j$),
('cervical', 2, 'Radiculopatia cervical', $j$[
{"type":"multiple_choice","question":"Radiculopatia de C6 cursa tipicamente com:","options":["A) Hipoestesia em 5º dedo e fraqueza de interósseos","B) Hipoestesia em polegar/indicador e fraqueza de bíceps","C) Hipoestesia em dedo médio e fraqueza de tríceps","D) Fraqueza isolada de flexores do punho"],"correct":"B","explanation":"C6: sensitivamente polegar e indicador; motor bíceps e extensores do punho."},
{"type":"multiple_choice","question":"Sinal de alívio com abdução do ombro sugere:","options":["A) Síndrome do desfiladeiro torácico","B) Compressão radicular cervical (C5-C6)","C) Capsulite adesiva","D) Tendinopatia do supraespinhal"],"correct":"B","explanation":"Abdução reduz tensão na raiz cervical comprometida."},
{"type":"multiple_choice","question":"Qual achado é red flag em paciente com queixa cervical?","options":["A) Dor que piora à noite com sinais neurológicos progressivos","B) Crepitação cervical isolada","C) Rigidez matinal de 10 minutos","D) Dor que melhora com calor local"],"correct":"A","explanation":"Dor noturna progressiva + déficit neurológico sugere mielopatia, neoplasia ou infecção."}
]$j$),
('cervical', 3, 'Cefaleia cervicogênica', $j$[
{"type":"multiple_choice","question":"Característica clássica da cefaleia cervicogênica:","options":["A) Bilateral pulsátil com fotofobia intensa","B) Unilateral, sem troca de lado, desencadeada por movimento cervical","C) Em salvas, com lacrimejamento ipsilateral","D) Difusa, em peso, melhora com analgésico simples"],"correct":"B","explanation":"Unilateral fixa, reproduzida por movimentos/posturas cervicais."},
{"type":"multiple_choice","question":"Qual teste tem boa especificidade para disfunção C1-C2?","options":["A) Flexion-rotation test","B) Teste de Spurling","C) Teste de Hawkins","D) Teste de Slump"],"correct":"A","explanation":"Isola rotação atlantoaxial; redução >10° vs lado oposto é sugestiva."},
{"type":"multiple_choice","question":"Tratamento com maior nível de evidência:","options":["A) Corticoide oral em pulso","B) Terapia manual cervical + exercícios de controle motor","C) Repouso prolongado e colar","D) Tração cervical isolada"],"correct":"B","explanation":"Combinação manual + exercícios é superior."}
]$j$),
('cervical', 4, 'Whiplash (lesão em chicote)', $j$[
{"type":"multiple_choice","question":"A classificação de Quebec WAD grau II indica:","options":["A) Sem queixa cervical","B) Dor cervical + sinais musculoesqueléticos","C) Dor cervical + sinais neurológicos","D) Fratura ou luxação"],"correct":"B","explanation":"WAD II = musculoesquelético sem déficit neurológico."},
{"type":"multiple_choice","question":"Fator prognóstico negativo bem estabelecido:","options":["A) Catastrofização e alta cinesiofobia inicial","B) Idade < 30 anos","C) Ausência de sintomas nas primeiras 48h","D) Prática esportiva regular"],"correct":"A","explanation":"Variáveis psicossociais predizem cronificação."},
{"type":"multiple_choice","question":"Conduta inicial recomendada em WAD II agudo:","options":["A) Colar cervical rígido por 4 semanas","B) Educação, manter atividade e exercícios precoces","C) Repouso absoluto em decúbito por 7 dias","D) Manipulação de alta velocidade no primeiro atendimento"],"correct":"B","explanation":"Guidelines priorizam atividade precoce e educação."}
]$j$),
('cervical', 5, 'Mielopatia cervical', $j$[
{"type":"multiple_choice","question":"Achado clínico clássico de mielopatia cervical:","options":["A) Hiperreflexia + Hoffmann + marcha instável","B) Hiporreflexia distal isolada","C) Dor lombar irradiada para perna","D) Hipoestesia em sela"],"correct":"A","explanation":"Sinais de neurônio motor superior abaixo da lesão."},
{"type":"multiple_choice","question":"Qual teste sugere disfunção do trato corticoespinhal?","options":["A) Hoffmann","B) Tinel no punho","C) Finkelstein","D) Phalen"],"correct":"A","explanation":"Hoffmann positivo sugere comprometimento do NMS."},
{"type":"multiple_choice","question":"Conduta diante de suspeita de mielopatia cervical progressiva:","options":["A) Manter conservador por 6 meses","B) Encaminhar para avaliação cirúrgica e RM","C) Manipulação cervical de alta velocidade","D) Tração cervical contínua"],"correct":"B","explanation":"Mielopatia progressiva exige imagem e avaliação cirúrgica."}
]$j$),
('lombar', 1, 'Lombalgia mecânica inespecífica', $j$[
{"type":"multiple_choice","question":"Em lombalgia aguda inespecífica sem red flags, a melhor conduta inicial é:","options":["A) Repouso no leito por 1 semana","B) Educação, manter atividade e exercícios graduais","C) RM lombar imediata","D) Opioides por 2 semanas"],"correct":"B","explanation":"NICE/ACP: manter atividade + educação."},
{"type":"multiple_choice","question":"Qual NÃO é red flag em lombalgia?","options":["A) Dor noturna progressiva","B) Perda de peso inexplicada","C) Dor que piora ao sentar e melhora ao caminhar","D) Anestesia em sela com disfunção esfincteriana"],"correct":"C","explanation":"Padrão mecânico não é red flag; as demais sim."},
{"type":"multiple_choice","question":"Sobre exercícios em lombalgia crônica:","options":["A) Qualquer modalidade supervisionada é superior à inatividade","B) Apenas Pilates funciona","C) Apenas fortalecimento de core","D) Alongamento isolado é suficiente"],"correct":"A","explanation":"Aderência > modalidade específica."}
]$j$),
('lombar', 2, 'Hérnia de disco lombar', $j$[
{"type":"multiple_choice","question":"Radiculopatia L5 cursa com:","options":["A) Fraqueza de flexão plantar e reflexo aquileu diminuído","B) Fraqueza de extensão do hálux e hipoestesia dorso do pé","C) Fraqueza de quadríceps","D) Hipoestesia em sela"],"correct":"B","explanation":"L5 inerva extensor longo do hálux e dorso do pé."},
{"type":"multiple_choice","question":"Teste de Lasègue positivo entre 30-70° sugere:","options":["A) Disfunção sacroilíaca","B) Tensão neural radicular (L5/S1)","C) Encurtamento isquiotibiais","D) Bursite trocantérica"],"correct":"B","explanation":"Reprodução de dor radicular nessa faixa é específica."},
{"type":"multiple_choice","question":"Indicação cirúrgica clara em hérnia lombar:","options":["A) Dor por 4 semanas sem déficit","B) Síndrome de cauda equina","C) Parestesia leve intermitente","D) Lombalgia mecânica isolada"],"correct":"B","explanation":"Cauda equina é emergência cirúrgica."}
]$j$),
('lombar', 3, 'Estenose de canal lombar', $j$[
{"type":"multiple_choice","question":"Quadro clínico clássico da estenose lombar:","options":["A) Claudicação neurogênica que melhora com flexão do tronco","B) Dor noturna em repouso com sudorese","C) Lombalgia aguda após esforço","D) Cervicalgia com cefaleia"],"correct":"A","explanation":"Flexão amplia o canal e alivia sintomas."},
{"type":"multiple_choice","question":"Diferencial entre claudicação neurogênica e vascular:","options":["A) Vascular alivia parando de pé; neurogênica precisa sentar/flexionar","B) Ambas aliviam apenas com repouso em pé","C) Neurogênica tem pulsos ausentes","D) Vascular piora com flexão"],"correct":"A","explanation":"Neurogênica precisa de flexão para alívio."},
{"type":"multiple_choice","question":"Exercício de escolha inicial:","options":["A) Flexão lombar e fortalecimento global","B) Extensões repetidas em prono","C) Manipulação de alta velocidade","D) Imobilização lombar"],"correct":"A","explanation":"Programa em flexão + condicionamento aeróbico."}
]$j$),
('lombar', 4, 'Disfunção sacroilíaca', $j$[
{"type":"multiple_choice","question":"Cluster diagnóstico de Laslett requer:","options":["A) ≥3 de 5 testes provocativos positivos","B) RM positiva","C) Lasègue positivo","D) Spurling positivo"],"correct":"A","explanation":"Cluster com ≥3 positivos tem boa acurácia."},
{"type":"multiple_choice","question":"Localização típica da dor sacroilíaca:","options":["A) Abaixo de L5, sobre o sulco SI (apontada com 1 dedo)","B) Difusa em toda lombar","C) Irradiada até o pé sempre","D) Em região inguinal isolada"],"correct":"A","explanation":"'Fortin finger sign'."},
{"type":"multiple_choice","question":"Tratamento inicial mais indicado:","options":["A) Educação + exercícios de controle motor pélvico","B) Artrodese imediata","C) Repouso prolongado","D) Manipulação de alta velocidade isolada"],"correct":"A","explanation":"Reabilitação ativa é primeira linha."}
]$j$),
('lombar', 5, 'Red flags em lombalgia', $j$[
{"type":"multiple_choice","question":"Cauda equina caracteriza-se por:","options":["A) Anestesia em sela, retenção/incontinência e fraqueza bilateral em MMII","B) Dor lombar isolada","C) Cervicalgia + cefaleia","D) Dor irradiada unilateral leve"],"correct":"A","explanation":"Tríade clássica exige cirurgia em até 48h."},
{"type":"multiple_choice","question":"Qual sugere neoplasia/metástase?","options":["A) Dor noturna + perda de peso + idade > 50","B) Lombalgia que melhora deitado","C) Dor lateral pós esforço único","D) Dor súbita após levantar caixa"],"correct":"A","explanation":"Tríade clássica de suspeita neoplásica."},
{"type":"multiple_choice","question":"Suspeita de infecção espinhal:","options":["A) Febre + dor lombar progressiva + drogas IV ou imunossupressão","B) Dor mecânica de 2 dias","C) Dor que melhora com repouso","D) Lombalgia pós academia"],"correct":"A","explanation":"Sinais sistêmicos + risco exigem investigação urgente."}
]$j$),
('anatomia', 1, 'Coluna vertebral', $j$[
{"type":"multiple_choice","question":"Quantas vértebras tem a coluna cervical?","options":["A) 5","B) 7","C) 12","D) 9"],"correct":"B","explanation":"7 cervicais, 12 torácicas, 5 lombares."},
{"type":"multiple_choice","question":"O processo odontoide pertence a:","options":["A) C1 (atlas)","B) C2 (áxis)","C) C7","D) T1"],"correct":"B","explanation":"O dente do áxis articula-se com o atlas."},
{"type":"multiple_choice","question":"Curva primária da coluna:","options":["A) Lordose cervical","B) Cifose torácica","C) Lordose lombar","D) Escoliose"],"correct":"B","explanation":"Cifoses torácica e sacral são primárias."}
]$j$),
('anatomia', 2, 'Membro superior', $j$[
{"type":"multiple_choice","question":"O manguito rotador é formado por:","options":["A) Supraespinhal, infraespinhal, redondo menor e subescapular","B) Deltoide, bíceps, tríceps e coracobraquial","C) Redondo maior, latíssimo, peitoral menor e serrátil","D) Trapézio, romboide, levantador da escápula e serrátil"],"correct":"A","explanation":"SITS."},
{"type":"multiple_choice","question":"O nervo axilar emerge de qual fascículo do plexo braquial?","options":["A) Lateral","B) Medial","C) Posterior","D) Superior"],"correct":"C","explanation":"Fascículo posterior origina axilar e radial."},
{"type":"multiple_choice","question":"O movimento principal do bíceps braquial é:","options":["A) Flexão do cotovelo e supinação do antebraço","B) Pronação do antebraço","C) Extensão do cotovelo","D) Abdução do ombro"],"correct":"A","explanation":"Bíceps é flexor e supinador potente."}
]$j$),
('anatomia', 3, 'Membro inferior', $j$[
{"type":"multiple_choice","question":"Os músculos isquiotibiais incluem:","options":["A) Bíceps femoral, semitendíneo e semimembranoso","B) Reto femoral, vasto lateral e vasto medial","C) Sóleo, gastrocnêmio e plantar","D) Iliopsoas e pectíneo"],"correct":"A","explanation":"Isquiotibiais."},
{"type":"multiple_choice","question":"O nervo ciático origina-se das raízes:","options":["A) L2-L4","B) L4-S3","C) T12-L2","D) S2-S4"],"correct":"B","explanation":"L4-S3, divide em tibial e fibular comum."},
{"type":"multiple_choice","question":"Os ligamentos cruzados do joelho são responsáveis por:","options":["A) Estabilidade ântero-posterior","B) Estabilidade médio-lateral","C) Produção de líquido sinovial","D) Flexão ativa do joelho"],"correct":"A","explanation":"LCA evita translação anterior; LCP, posterior."}
]$j$),
('anatomia', 4, 'Sistema nervoso periférico', $j$[
{"type":"multiple_choice","question":"O nervo mediano é responsável por:","options":["A) Sensibilidade do polegar, indicador, médio e metade radial do anelar; pinça fina","B) Sensibilidade do 5º dedo","C) Extensão do punho","D) Abdução dos dedos"],"correct":"A","explanation":"3,5 dedos radiais palmares."},
{"type":"multiple_choice","question":"Lesão do nervo radial alto causa:","options":["A) Mão caída (queda do punho)","B) Mão em garra ulnar","C) Mão símia","D) Pé equino"],"correct":"A","explanation":"Radial alto = wrist drop."},
{"type":"multiple_choice","question":"O dermátomo C7 corresponde a:","options":["A) Polegar","B) Dedo médio","C) Quinto dedo","D) Ombro"],"correct":"B","explanation":"Polegar=C6, médio=C7, mínimo=C8."}
]$j$),
('anatomia', 5, 'Articulações e tipos', $j$[
{"type":"multiple_choice","question":"O ombro glenoumeral é classificado como:","options":["A) Esferóide (enartrose)","B) Trocleartrose","C) Gínglimo","D) Sela"],"correct":"A","explanation":"Esferóide: 3 eixos."},
{"type":"multiple_choice","question":"Qual articulação é do tipo selar?","options":["A) Trapézio-metacarpiana do polegar","B) Cotovelo","C) Quadril","D) Atlantoaxial"],"correct":"A","explanation":"CMC do polegar é selar."},
{"type":"multiple_choice","question":"Articulações sinoviais NÃO possuem obrigatoriamente:","options":["A) Cápsula articular","B) Líquido sinovial","C) Cartilagem hialina","D) Disco fibrocartilaginoso em todas"],"correct":"D","explanation":"Disco/menisco existe apenas em algumas."}
]$j$),
('biomecanica', 1, 'Forças e alavancas', $j$[
{"type":"multiple_choice","question":"O cotovelo durante flexão com bíceps é exemplo de alavanca:","options":["A) Interfixa (1ª classe)","B) Inter-resistente (2ª classe)","C) Interpotente (3ª classe)","D) Sem alavanca"],"correct":"C","explanation":"Maioria das alavancas humanas é de 3ª classe."},
{"type":"multiple_choice","question":"Vantagem de alavancas de 3ª classe:","options":["A) Maior amplitude e velocidade distal","B) Maior força com menor esforço","C) Apenas equilíbrio","D) Não há vantagem"],"correct":"A","explanation":"Sacrifica força ganhando velocidade/ADM."},
{"type":"multiple_choice","question":"Torque articular depende de:","options":["A) Força aplicada e braço de alavanca","B) Apenas massa muscular","C) Apenas comprimento ósseo","D) Tipo de fibra apenas"],"correct":"A","explanation":"Torque = força × braço."}
]$j$),
('biomecanica', 2, 'Marcha humana', $j$[
{"type":"multiple_choice","question":"A fase de apoio na marcha normal corresponde a:","options":["A) ~60% do ciclo","B) ~40% do ciclo","C) ~80% do ciclo","D) ~20% do ciclo"],"correct":"A","explanation":"Apoio 60%, balanço 40%."},
{"type":"multiple_choice","question":"Trendelenburg positivo indica fraqueza de:","options":["A) Glúteo médio do lado de apoio","B) Quadríceps do lado oposto","C) Tibial anterior","D) Iliopsoas bilateral"],"correct":"A","explanation":"Glúteo médio estabiliza no apoio unipodal."},
{"type":"multiple_choice","question":"Marcha em estepagem sugere fraqueza de:","options":["A) Dorsiflexores (n. fibular)","B) Glúteo máximo","C) Quadríceps","D) Sóleo"],"correct":"A","explanation":"Compensa para não arrastar o pé."}
]$j$),
('biomecanica', 3, 'Coluna e cargas', $j$[
{"type":"multiple_choice","question":"Postura que gera maior pressão intradiscal lombar (Nachemson):","options":["A) Sentado inclinado para frente com peso","B) Em pé relaxado","C) Decúbito dorsal","D) Decúbito lateral"],"correct":"A","explanation":"Sentado + flexão + carga gera pressão máxima."},
{"type":"multiple_choice","question":"Função do core na transferência de carga:","options":["A) Estabilizar a coluna e transmitir força entre tronco e membros","B) Apenas estética abdominal","C) Substituir alongamento","D) Aumentar lordose"],"correct":"A","explanation":"Cilindro de pressão."},
{"type":"multiple_choice","question":"Discos intervertebrais são nutridos por:","options":["A) Difusão por movimento (carga-descarga)","B) Vascularização direta","C) Fluxo linfático","D) Cápsula sinovial"],"correct":"A","explanation":"Avascular no adulto."}
]$j$),
('biomecanica', 4, 'Quadril e joelho', $j$[
{"type":"multiple_choice","question":"Valgo dinâmico de joelho está associado a fraqueza de:","options":["A) Abdutores e rotadores externos do quadril","B) Quadríceps isolado","C) Gastrocnêmio","D) Adutores"],"correct":"A","explanation":"Controle proximal pobre → valgo dinâmico."},
{"type":"multiple_choice","question":"Q-angle aumentado predispõe a:","options":["A) Sobrecarga patelofemoral lateral","B) Lombalgia","C) Tendinite aquilea","D) Cervicalgia"],"correct":"A","explanation":"Vetor lateral aumenta estresse patelofemoral."},
{"type":"multiple_choice","question":"Durante o agachamento, o LCA é mais solicitado:","options":["A) Em extensão terminal","B) Em flexão profunda","C) Sempre igual","D) Apenas em saltos"],"correct":"A","explanation":"Translação anterior tibial maior próximo à extensão."}
]$j$),
('biomecanica', 5, 'Tecidos e propriedades', $j$[
{"type":"multiple_choice","question":"Tendões respondem melhor a sobrecarga quando submetidos a:","options":["A) Carga gradual e progressiva","B) Repouso absoluto","C) Alongamento estático intenso","D) Imobilização"],"correct":"A","explanation":"Lei de Wolff/Davis."},
{"type":"multiple_choice","question":"Creep (fluência) é:","options":["A) Deformação tecidual sob carga constante ao longo do tempo","B) Ruptura súbita","C) Recuperação elástica","D) Encurtamento muscular permanente"],"correct":"A","explanation":"Deformação progressiva sob carga sustentada."},
{"type":"multiple_choice","question":"Cartilagem articular se nutre por:","options":["A) Difusão pelo líquido sinovial com movimento","B) Vasos próprios","C) Inervação direta","D) Sangue venoso subcondral"],"correct":"A","explanation":"Avascular; depende de movimento."}
]$j$),
('cinesiologia', 1, 'Planos e eixos', $j$[
{"type":"multiple_choice","question":"Flexão e extensão ocorrem no plano:","options":["A) Sagital","B) Frontal","C) Transverso","D) Oblíquo"],"correct":"A","explanation":"Sagital."},
{"type":"multiple_choice","question":"Abdução e adução ocorrem no plano:","options":["A) Frontal","B) Sagital","C) Transverso","D) Coronal-sagital"],"correct":"A","explanation":"Frontal (coronal)."},
{"type":"multiple_choice","question":"Rotação interna/externa do ombro ocorre no plano:","options":["A) Transverso","B) Sagital","C) Frontal","D) Oblíquo"],"correct":"A","explanation":"Transverso, eixo vertical."}
]$j$),
('cinesiologia', 2, 'Tipos de contração muscular', $j$[
{"type":"multiple_choice","question":"Contração concêntrica caracteriza-se por:","options":["A) Encurtamento muscular contra resistência","B) Alongamento sob tensão","C) Sem alteração de comprimento","D) Relaxamento ativo"],"correct":"A","explanation":"Força > resistência."},
{"type":"multiple_choice","question":"Contração excêntrica:","options":["A) Resistência > força; músculo alonga sob tensão","B) Apenas relaxamento","C) Sem produção de força","D) Mesmo comprimento"],"correct":"A","explanation":"Produz mais força; chave em reabilitação de tendões."},
{"type":"multiple_choice","question":"Contração isométrica:","options":["A) Sem alteração de comprimento, com tensão","B) Encurtamento contínuo","C) Alongamento descontrolado","D) Sem tensão"],"correct":"A","explanation":"Tensão sem mudança de comprimento."}
]$j$),
('cinesiologia', 3, 'Sinergistas e antagonistas', $j$[
{"type":"multiple_choice","question":"Agonista é o músculo:","options":["A) Principal responsável pelo movimento","B) Que se opõe ao movimento","C) Que estabiliza o segmento proximal","D) Que produz movimento secundário"],"correct":"A","explanation":"Motor primário."},
{"type":"multiple_choice","question":"Durante flexão de cotovelo, o tríceps atua como:","options":["A) Antagonista (controle excêntrico)","B) Agonista","C) Estabilizador escapular","D) Não participa"],"correct":"A","explanation":"Antagonistas modulam o movimento."},
{"type":"multiple_choice","question":"Estabilizadores escapulares incluem:","options":["A) Trapézio, serrátil anterior e romboides","B) Bíceps e tríceps","C) Glúteos","D) Quadríceps"],"correct":"A","explanation":"Estabilizam a escápula."}
]$j$),
('cinesiologia', 4, 'Cadeia cinética', $j$[
{"type":"multiple_choice","question":"Cadeia cinética fechada caracteriza-se por:","options":["A) Extremidade distal fixa (ex.: agachamento)","B) Extremidade distal livre","C) Não envolve articulações","D) Apenas isométricos"],"correct":"A","explanation":"Pé/mão fixo; co-contração e propriocepção."},
{"type":"multiple_choice","question":"Vantagem da CCF na reabilitação do joelho:","options":["A) Menor cisalhamento no LCA com co-contração","B) Maior isolamento do quadríceps","C) Aumenta cisalhamento patelar","D) Não tem vantagem"],"correct":"A","explanation":"Co-ativação dos isquiotibiais protege LCA."},
{"type":"multiple_choice","question":"Exemplo de cadeia cinética aberta:","options":["A) Leg extension","B) Agachamento","C) Avanço","D) Subir escada"],"correct":"A","explanation":"Pé livre = cadeia aberta."}
]$j$),
('cinesiologia', 5, 'Controle motor e propriocepção', $j$[
{"type":"multiple_choice","question":"Propriocepção depende de receptores em:","options":["A) Fusos musculares, OTG, cápsula e ligamentos","B) Apenas pele","C) Apenas vísceras","D) Apenas vestibular"],"correct":"A","explanation":"Múltiplos mecanorreceptores."},
{"type":"multiple_choice","question":"Treino proprioceptivo é fundamental após:","options":["A) Entorse de tornozelo","B) Resfriado","C) Lombalgia aguda sem instabilidade","D) Cefaleia"],"correct":"A","explanation":"Reduz recidiva."},
{"type":"multiple_choice","question":"Pré-ativação muscular antes do impacto é exemplo de:","options":["A) Controle motor antecipatório (feedforward)","B) Feedback puro","C) Reflexo medular isolado","D) Resposta voluntária consciente"],"correct":"A","explanation":"SNC antecipa carga."}
]$j$),
('joelho', 1, 'Lesão de LCA', $j$[
{"type":"multiple_choice","question":"Mecanismo clássico de lesão isolada do LCA:","options":["A) Trauma em valgo + rotação externa da tíbia com pé fixo","B) Trauma direto na face anterior do joelho","C) Hiperextensão pura sem rotação","D) Compressão axial isolada"],"correct":"A","explanation":"Sem contato, desaceleração + valgo + rotação."},
{"type":"multiple_choice","question":"Teste mais sensível para LCA crônica:","options":["A) Lachman","B) Gaveta posterior","C) McMurray","D) Apley"],"correct":"A","explanation":"Lachman > gaveta anterior."},
{"type":"multiple_choice","question":"Reabilitação pós-reconstrução de LCA prioriza:","options":["A) Restaurar extensão completa e controle neuromuscular precocemente","B) Imobilizar 6 semanas em flexão","C) Iniciar pliometria na 2ª semana","D) Evitar carga total por 3 meses"],"correct":"A","explanation":"Previne rigidez e recidiva."}
]$j$),
('joelho', 2, 'Lesão meniscal', $j$[
{"type":"multiple_choice","question":"Sintoma clássico de lesão meniscal em alça de balde:","options":["A) Bloqueio articular mecânico","B) Dor irradiada para coxa","C) Fraqueza de quadríceps isolada","D) Febre"],"correct":"A","explanation":"Fragmento deslocado bloqueia extensão."},
{"type":"multiple_choice","question":"Teste com boa especificidade para lesão meniscal:","options":["A) Thessaly","B) Lachman","C) Pivot shift","D) Spurling"],"correct":"A","explanation":"Thessaly tem boa acurácia."},
{"type":"multiple_choice","question":"Lesão degenerativa meniscal em > 50 anos sem bloqueio:","options":["A) Reabilitação inicial supervisionada é primeira linha","B) Meniscectomia imediata","C) Imobilização total","D) Apenas analgésicos"],"correct":"A","explanation":"Evidência: exercícios = cirurgia em casos sem bloqueio."}
]$j$),
('joelho', 3, 'Dor patelofemoral', $j$[
{"type":"multiple_choice","question":"Fator de risco principal modificável para SDPF:","options":["A) Fraqueza de abdutores e rotadores externos do quadril","B) Genética","C) Sexo masculino","D) Idade > 60 anos"],"correct":"A","explanation":"Controle proximal é determinante."},
{"type":"multiple_choice","question":"Tratamento com maior evidência inicial:","options":["A) Exercícios de quadril + joelho","B) Cirurgia precoce","C) Repouso prolongado","D) Bandagem isolada como única medida"],"correct":"A","explanation":"Combinação é superior (consenso 2018)."},
{"type":"multiple_choice","question":"Sinal clínico típico:","options":["A) Dor anterior em escadas, agachar e sentar prolongado","B) Bloqueio articular","C) Instabilidade súbita","D) Dor posterior em repouso"],"correct":"A","explanation":"Carga + flexão sustentada provocam dor."}
]$j$),
('joelho', 4, 'Tendinopatia patelar', $j$[
{"type":"multiple_choice","question":"Dor à palpação do polo inferior da patela em atleta de salto sugere:","options":["A) Tendinopatia patelar (jumper's knee)","B) Lesão meniscal","C) Bursite anserina","D) SDPF"],"correct":"A","explanation":"Classicamente em saltadores."},
{"type":"multiple_choice","question":"Protocolo com melhor evidência atual:","options":["A) Isométricos e excêntricos progressivos (HSR/excêntrico)","B) Repouso absoluto até dor zero","C) Apenas crioterapia","D) Infiltração de corticoide intratendínea"],"correct":"A","explanation":"HSR e excêntrico são primeira linha."},
{"type":"multiple_choice","question":"Sobre dor durante reabilitação de tendinopatia:","options":["A) Dor ≤ 5/10 durante exercício é aceitável se não piora 24h","B) Qualquer dor contraindica","C) Quanto mais dor, melhor","D) Não há relação"],"correct":"A","explanation":"Pain monitoring model (Silbernagel)."}
]$j$),
('joelho', 5, 'Osteoartrite de joelho', $j$[
{"type":"multiple_choice","question":"Tratamento de primeira linha (OARSI):","options":["A) Exercício terapêutico + educação + controle de peso","B) Artroplastia imediata","C) Repouso prolongado","D) Opioides crônicos"],"correct":"A","explanation":"Pilares básicos."},
{"type":"multiple_choice","question":"Rigidez matinal típica de OA é:","options":["A) Curta, geralmente < 30 min","B) > 1 hora, simétrica em pequenas articulações","C) Acompanhada de febre","D) Inexistente"],"correct":"A","explanation":"Rigidez prolongada sugere AR."},
{"type":"multiple_choice","question":"Exercício mais indicado em OA moderada:","options":["A) Fortalecimento + aeróbico de baixo impacto","B) Corrida em alta intensidade","C) Apenas alongamento","D) Imobilização"],"correct":"A","explanation":"Reduz dor e melhora função."}
]$j$),
('ombro', 1, 'Síndrome do impacto', $j$[
{"type":"multiple_choice","question":"Teste clássico para impacto subacromial:","options":["A) Neer e Hawkins-Kennedy","B) Lachman","C) McMurray","D) Spurling"],"correct":"A","explanation":"Neer e Hawkins-Kennedy provocam impacto."},
{"type":"multiple_choice","question":"Causa funcional comum de impacto:","options":["A) Discinesia escapular e fraqueza do manguito","B) Fratura coracoide","C) Capsulite adesiva","D) Tendinopatia do bíceps isolada"],"correct":"A","explanation":"Controle escapular ruim altera espaço subacromial."},
{"type":"multiple_choice","question":"Conduta inicial:","options":["A) Reabilitação com foco em manguito e escápula","B) Acromioplastia imediata","C) Repouso prolongado","D) Manipulação sob anestesia"],"correct":"A","explanation":"CSAW trial: exercícios primeira linha."}
]$j$),
('ombro', 2, 'Lesão do manguito rotador', $j$[
{"type":"multiple_choice","question":"Teste para supraespinhal:","options":["A) Jobe (empty can)","B) Lift-off","C) Yergason","D) O'Brien"],"correct":"A","explanation":"Jobe isola o supraespinhal."},
{"type":"multiple_choice","question":"Subescapular avaliado por:","options":["A) Lift-off / Belly press","B) Jobe","C) Hawkins","D) Neer"],"correct":"A","explanation":"Lift-off e Belly press."},
{"type":"multiple_choice","question":"Sobre lesão parcial do manguito em > 60 anos:","options":["A) Reabilitação supervisionada é primeira escolha em muitos casos","B) Cirurgia obrigatória","C) Repouso absoluto","D) Imobilização por 8 semanas"],"correct":"A","explanation":"Conservador é primeira linha."}
]$j$),
('ombro', 3, 'Capsulite adesiva', $j$[
{"type":"multiple_choice","question":"Achado clínico essencial da capsulite adesiva:","options":["A) Perda significativa de ADM ativa E passiva, sobretudo rotação externa","B) Apenas perda ativa","C) Sem perda de ADM","D) Apenas dor noturna"],"correct":"A","explanation":"Restrição global ativa e passiva."},
{"type":"multiple_choice","question":"Fase 'congelante' caracteriza-se por:","options":["A) Dor predominante, ADM começando a reduzir","B) Apenas rigidez sem dor","C) Recuperação total","D) Crepitação isolada"],"correct":"A","explanation":"Fase 1: dor > rigidez."},
{"type":"multiple_choice","question":"Conduta com boa evidência:","options":["A) Educação + mobilizações + exercícios progressivos; corticoide intra-articular pode acelerar fase dolorosa","B) Imobilização contínua","C) Manipulação cervical","D) Repouso até resolução espontânea"],"correct":"A","explanation":"Programa ativo + corticoide quando indicado."}
]$j$),
('ombro', 4, 'Instabilidade glenoumeral', $j$[
{"type":"multiple_choice","question":"Sinal de apreensão positivo sugere:","options":["A) Instabilidade anterior","B) Capsulite adesiva","C) Tendinopatia bicipital","D) SLAP"],"correct":"A","explanation":"Apreensão em RE + abdução."},
{"type":"multiple_choice","question":"Lesão de Bankart corresponde a:","options":["A) Desinserção do lábio glenoidal ântero-inferior","B) Fratura do colo do úmero","C) Lesão do manguito","D) Lesão acromioclavicular"],"correct":"A","explanation":"Avulsão labral pós luxação anterior."},
{"type":"multiple_choice","question":"Reabilitação inicial após luxação primária em jovem:","options":["A) Fortalecimento de manguito e escápula com progressão funcional","B) Imobilização por 8 semanas","C) Cirurgia imediata sempre","D) Apenas crioterapia"],"correct":"A","explanation":"Programa progressivo; cirurgia se recidivas."}
]$j$),
('ombro', 5, 'Discinesia escapular', $j$[
{"type":"multiple_choice","question":"Escápula alada (winging) sugere fraqueza de:","options":["A) Serrátil anterior","B) Trapézio inferior isolado","C) Romboide maior","D) Subescapular"],"correct":"A","explanation":"Serrátil anterior estabiliza/protrai."},
{"type":"multiple_choice","question":"Padrão SICK scapula relaciona-se a:","options":["A) Atletas de arremesso com discinesia, dor e queda funcional","B) Trauma agudo","C) Doença reumática","D) Lesão neural pura"],"correct":"A","explanation":"Scapular malposition, Inferior border, Coracoid pain, dysKinesis."},
{"type":"multiple_choice","question":"Conduta:","options":["A) Reeducação escapular e fortalecimento progressivo","B) Imobilização","C) Cirurgia precoce","D) Apenas alongamento de peitoral"],"correct":"A","explanation":"Programa ativo."}
]$j$),
('quadril', 1, 'Impacto femoroacetabular (FAI)', $j$[
{"type":"multiple_choice","question":"Teste clínico mais usado para FAI:","options":["A) FADIR (flexão + adução + rotação interna)","B) FABER isolado","C) Lasègue","D) Thomas"],"correct":"A","explanation":"FADIR provoca conflito anterior."},
{"type":"multiple_choice","question":"Tipos morfológicos do FAI:","options":["A) Cam, Pincer e misto","B) Apenas cam","C) Apenas pincer","D) Tipo A, B e C"],"correct":"A","explanation":"Cam (femoral), Pincer (acetabular), misto."},
{"type":"multiple_choice","question":"Tratamento inicial:","options":["A) Reabilitação focada em controle motor, mobilidade e força","B) Artroscopia imediata","C) Imobilização total","D) Repouso por 3 meses"],"correct":"A","explanation":"Reabilitação primeira linha em muitos casos."}
]$j$),
('quadril', 2, 'Tendinopatia glútea', $j$[
{"type":"multiple_choice","question":"Dor lateral no quadril em mulheres > 40 anos, piora ao deitar do lado, sugere:","options":["A) Síndrome dolorosa do trocânter maior / tendinopatia glútea","B) Lombalgia mecânica","C) FAI","D) Coxartrose avançada"],"correct":"A","explanation":"GTPS é mais comum nesse perfil."},
{"type":"multiple_choice","question":"Teste útil:","options":["A) Apreensão em rotação externa em decúbito lateral + dor à palpação trocantérica","B) Lachman","C) McMurray","D) Spurling"],"correct":"A","explanation":"Cargas compressivas reproduzem dor."},
{"type":"multiple_choice","question":"Tratamento de primeira linha (LEAP trial):","options":["A) Educação + exercícios de carga progressiva","B) Infiltração de corticoide repetida","C) Cirurgia precoce","D) Repouso absoluto"],"correct":"A","explanation":"Superam corticoide a médio prazo."}
]$j$),
('quadril', 3, 'Coxartrose', $j$[
{"type":"multiple_choice","question":"Sinal clássico inicial de coxartrose:","options":["A) Dor inguinal + limitação da rotação interna","B) Dor lateral isolada","C) Bloqueio articular","D) Edema importante"],"correct":"A","explanation":"Rotação interna é a primeira a reduzir."},
{"type":"multiple_choice","question":"Primeira linha de tratamento (OARSI):","options":["A) Exercício + controle de peso + educação","B) Prótese imediata","C) Opioides crônicos","D) Repouso"],"correct":"A","explanation":"Mesma base da OA de joelho."},
{"type":"multiple_choice","question":"Quando considerar artroplastia:","options":["A) Dor incapacitante refratária + perda funcional importante","B) Toda OA radiográfica","C) Apenas em jovens","D) Em qualquer paciente com dor leve"],"correct":"A","explanation":"Combina dor, função e falha conservadora."}
]$j$),
('quadril', 4, 'Bursite trocantérica vs tendinopatia', $j$[
{"type":"multiple_choice","question":"GTPS é entendida atualmente principalmente como:","options":["A) Tendinopatia dos glúteos médio/mínimo, com ou sem bursite secundária","B) Bursite primária pura","C) Doença degenerativa óssea","D) Lesão neural"],"correct":"A","explanation":"Tendinopatia é o componente dominante."},
{"type":"multiple_choice","question":"Postura que agrava GTPS:","options":["A) Cruzar pernas e deitar do lado afetado","B) Decúbito dorsal com pernas estendidas","C) Sentar reto","D) Caminhar leve"],"correct":"A","explanation":"Compressão trocantérica piora os sintomas."},
{"type":"multiple_choice","question":"Exercício inicial recomendado:","options":["A) Isométrico de abdutores em posição neutra (evitar adução)","B) Cadeira adutora pesada","C) Alongamento agressivo do glúteo","D) Corrida em ladeira"],"correct":"A","explanation":"Isométricos analgésicos sem compressão."}
]$j$),
('quadril', 5, 'Lesão do labrum acetabular', $j$[
{"type":"multiple_choice","question":"Sintoma típico de lesão labral:","options":["A) Dor inguinal + clique mecânico + sensação de travamento","B) Dor lateral isolada","C) Dor noturna em repouso sem padrão mecânico","D) Cefaleia"],"correct":"A","explanation":"Dor mecânica + clique."},
{"type":"multiple_choice","question":"Teste auxiliar:","options":["A) FADIR positivo + dor reprodutível","B) Spurling","C) Tinel","D) Phalen"],"correct":"A","explanation":"FADIR e flexão-adução reproduzem o sintoma."},
{"type":"multiple_choice","question":"Conduta inicial em lesão labral sem instabilidade:","options":["A) Reabilitação supervisionada com controle motor e fortalecimento","B) Reparo cirúrgico imediato","C) Imobilização","D) Repouso prolongado"],"correct":"A","explanation":"Conservador é primeira linha."}
]$j$)
) AS x(niche, order_index, topic, questions)
ON t.niche = x.niche;
