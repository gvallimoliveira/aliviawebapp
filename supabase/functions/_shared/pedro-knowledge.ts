// Base de conhecimento PEDro (estudos com nota >=7/10) — fisioterapia cardiorrespiratoria e geriatrica.
// Injetado nos system prompts de generate-diagnosis e generate-treatment para guiar o raciocinio
// clinico da IA em quadros respiratorios e em idosos.

export const PEDRO_KNOWLEDGE_BASE = `

============================================================
EVIDENCE-BASED KNOWLEDGE BASE — PEDro studies (score >=7/10)
Use ONLY when the case involves cardiorespiratory physiotherapy
(COPD, asthma, heart failure, post-COVID, cardiac surgery)
OR geriatric physiotherapy (frailty, sarcopenia, falls, hip fracture,
Parkinson, dementia, knee OA, stroke in elderly).
For musculoskeletal non-geriatric cases, IGNORE this block.
============================================================

[A] CARDIORESPIRATORY PROTOCOL (evidence-based)

Mandatory assessment instruments:
- Dyspnea: mMRC (>=2 = significant limitation)
- COPD impact: CAT (>10 = impact; MCID 2 pts)
- COPD prognosis: BODE Index (>4 = high risk)
- Functional capacity: 6MWT (MCID +30-54m COPD; +25m HF)
- Inspiratory strength: PImax (<60 cmH2O = weakness; indicate IMT)
- Asthma control: ACQ-6 (>1.5 = uncontrolled); AQLQ
- HF quality of life: MLHFQ (MCID 5 pts)
- Post-COVID fatigue: FSS (>36 = clinical fatigue)
- Exertion oximetry: SpO2 in 6MWT (<92% = relevant desaturation)

Key exercise dosing (cite study in parentheses):
- Aerobic (COPD/HF/post-COVID): 60-80% VO2peak or Borg 4-6/10; 20-40 min, 3-5x/wk (Casaburi 1991; Seymour 2010)
- HIIT (stable HFrEF NYHA II-III): 4x4 min @ 90-95% HRpeak, 3 min recovery, 3x/wk (Wisloff 2007)
- Lower-limb strength: leg press + knee extension + plantar flexion; 3 sets x 10-15 reps; 50->70% 1-RM in 4 wk (Ortega 2002)
- IMT (PImax <60 cmH2O): threshold device 60-80% PImax; 30 min/day; +5 cmH2O/wk (Charususin 2018; Dall'Ago 2006)
- Post-cardiac-surgery: incentive spirometer 10x/hour awake; EPAP 10 cmH2O 15 min 4x/day; assisted cough with sternal pillow; mobilize <=6h post-extubation (Hulzebos 2006; Savci 2011)
- Asthma: Papworth/Buteyko breathing retraining; 8 sessions in 12 wk + daily self-practice (Thomas 2009; Hansen 2022)
- Post-COVID: Borg 2-3/10 week 1 -> 4-5/10 week 3; +10%/week; monitor SpO2 and FSS (Jimeno-Almazan 2022; TERECO 2022; Gloeckl 2021)
- Pulmonary rehab post-exacerbation: start <=4 wk; >=8 wk, >=3 sessions/wk (Puhan 2016; ATS/ERS Spruit 2013)

Cardiorespiratory red flags (mandatory stop / referral):
- SpO2 <88% at rest or <92% on exertion -> O2 or NIV (Borghi-Silva 2010)
- HR >85% HRmax in NYHA III; SBP >220 mmHg or drop >20 mmHg -> stop
- BODE >7 -> consider transplant evaluation
- Post-exercise fatigue worsening >24h (PEM) in post-COVID -> halve intensity (Jimeno-Almazan 2022)
- Angina, chest pain, syncope -> stop and refer
- Decompensated HF (acute edema, NYHA IV, weight gain >2 kg/wk) -> suspend aerobic exercise

[B] GERIATRIC PROTOCOL (evidence-based)

Mandatory assessment instruments:
- Frailty screen: Fried criteria (>=3 = frail); Clinical Frailty Scale (>=5)
- Sarcopenia: SARC-F (>=4) + grip dynamometry (<27 kg M / <16 kg F)
- Balance: Berg Balance Scale (<45 = fall risk; MCID 4 pts)
- Global mobility: TUG (>12s = risk; >20s = high risk; >30s = dependence)
- Functional performance: SPPB (<10 = frailty; MCID +1 pt)
- Gait speed: 4-m gait speed (<0.8 m/s = risk; <0.6 m/s = severe)
- Fear of falling: FES-I (>23 = moderate fear; MCID 4 pts)
- Knee OA: WOMAC / KOOS
- Parkinson: UPDRS-III + Hoehn-Yahr (>3 = severe imbalance)
- Cognition: MMSE / MoCA (<24 / <26)
- Depression: GDS-15 (>=5)
- ADLs: Barthel / Lawton IADL

Key exercise dosing:
- Balance (mandatory >=3h/week): Otago programme 17 progressive exercises (tandem -> single-leg -> eyes closed -> unstable); Tai Chi 60 min 2x/wk in Parkinson (Sherrington 2017; Campbell 1997; Li 2012)
- Lower-limb strength (3x/wk): leg press, knee extension, hip abduction, plantar flexion; 2-3 sets x 10-15 reps; 40->70% 1-RM in 6 wk (Bauer 2015; Mangione 2010)
- Functional gait training (3x/wk, 60 min): task-oriented circuit — sit-to-stand, steps, obstacles, turns, dual-task; target gait speed >=0.8 m/s (English/CIRCIT 2015)
- Multicomponent frailty programme (3x/wk, 60-90 min): strength + balance + light aerobic + cognitive-motor dual-task (Cadore 2013; Liao 2019)
- Post-hip-fracture: progressive lower-limb strengthening from week 4 + gait + stairs from week 6; home-based 12 months (Mangione 2010; Auais 2012)
- Parkinson: PDSAFE (5 home physio sessions) + Tango 2x/wk; visual/auditory cueing (floor tape, metronome); step training (Ashburn/PDSAFE 2019; Hackney 2009)
- Alzheimer/dementia: 30 min/day light aerobic + cognitive-motor dual-task, with trained caregiver (Teri/RALLI 2003; Ciezkowska 2023)
- Knee OA: quadriceps strengthening 3x15 reps (leg press/step) + walking 30 min 3x/wk + post-exercise cryotherapy (Ettinger/FAST 1997; Fransen 2015)
- Protein supplementation (frailty/sarcopenia): 1.2-1.5 g/kg/day; whey protein 25-30 g/main meal (Liao 2019; Bauer 2015)

Geriatric red flags:
- Fall during session -> full reassessment + SPPB + polypharmacy review (benzodiazepines, antihypertensives, anticholinergics)
- TUG >30 s -> home-based physio + assistive device (cane / 4-point walker)
- Orthostatic hypotension (SBP drop >20 mmHg) -> seated exercise + hydration + meds review
- Weight loss >2 kg/month -> refer to nutrition + investigate sarcopenia
- MMSE <15 without supervision -> only supervised individual/family training
- NRS pain >=7/10 in OA during exercise -> reduce load 30% + cryotherapy + analgesia
- Sudden new motor deficit in Parkinson -> suspect occult fracture or H&Y progression 4-5
- CFS >=7 (severely frail) -> only passive/active-assisted exercises + comfort
- Severe agitation in dementia -> stop, adapt environment, consider music as mediator (Teri/RALLI 2003)

How to use this knowledge:
- When the clinical picture matches one of the above areas, your hypothesis, recommended questionnaires/tests, and treatment plan MUST reflect these protocols.
- Always pick the validated instruments from this list FIRST before suggesting generic scales.
- When suggesting exercises, prefer the dosing windows above and reference frameworks (Otago, Papworth, PDSAFE, STEPS, D.I.F.I.) by name in the explanation.
- Respect the red flags listed: if any is present, surface it explicitly in the plan and downgrade intensity.
============================================================
`;
