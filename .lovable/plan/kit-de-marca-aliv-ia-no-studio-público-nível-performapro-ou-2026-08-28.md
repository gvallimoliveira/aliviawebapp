# Kit de marca Aliv.iA no Studio público: nível PerformaPro (ou acima)

## O diagnóstico (verificado no banco)

Comparando as duas marcas cadastradas hoje em `studio_brands`:

| Campo | PerformaPro | Aliv.iA |
|---|---|---|
| Descrição | vazia | 167 caracteres (1 frase) |
| Posicionamento | 450 | 367 (genérico, fala de "burocracia") |
| Diretriz de tom | 2.199 (manual de marca inteiro) | 51 |
| Notas de estratégia | 494 | 394 (genérico) |
| Públicos | 4 | 5 |
| Palavras-chave (`topics`) | 9 | 9 (termos de SEO, não de linguagem de marca) |

Os públicos do Aliv.iA existem, mas são desiguais: Paciente tem 5 dores e só 2 desejos; Clínica tem 3/2/3; nenhum público tem sub-recortes. Como o motor usa `pains`, `desires`, `proof` e `cta` para montar headlines, comparativos, listas, carrosséis e legendas, público raso = repertório textual raso. Além disso o Aliv.iA usa `content_source = "alivia"`, então cada público novo precisa herdar um mundo editorial existente (paciente / pro / clínica / acadêmico) para não sair sem imagem nem sem acervo.

## O que vou fazer

### 1. Reescrever os campos-base do kit Aliv.iA (dados, não código)

- **Descrição**: 3 frases densas — o que é, para quem, o que entrega de concreto (autoavaliação guiada, hipótese mais provável, STEPS/D.I.F.I, HEP, prontuário, relatório em 1 clique, agente de raciocínio clínico).
- **Posicionamento 360°**: um parágrafo por camada — o problema estrutural do mercado, a tese do produto ("raciocínio clínico com alma de fisioterapeuta"), a amplitude (paciente → profissional → clínica → estudante) e o que nos separa de prontuário eletrônico comum e de "IA genérica".
- **Diretriz de tom**: texto longo de verdade, no nível do manual do PerformaPro — o que dizer, o que nunca dizer (promessa de cura, jargão vazio, tom infantilizado), como tratar dor, evidência, medo e alta. Continua sendo diretriz: nunca é impresso na arte.
- **Notas de estratégia**: como girar os 4 ângulos (informar / dor / desejo / venda) para cada público, com regra de proporção e temas proibidos (PEDro / biblioteca de evidências enquanto beta, termos de gestão de projeto).
- **Palavras-chave**: trocar termos de SEO por vocabulário de marca utilizável em kicker e marquee (raciocínio clínico, hipótese, evolução, adesão, alta, prontuário vivo, dor que volta, plano em casa…).

### 2. Ampliar e nivelar os públicos (de 5 para 10)

Mantidos e aprofundados: Paciente, Profissional, Clínica, Estudante, Recém-formado.
Novos sub-nichos, cada um herdando um mundo editorial: 

- **Paciente crônico** (mundo paciente) — dor de anos, já tentou tudo, medo de recaída.
- **Atleta / pessoa ativa** (mundo paciente) — voltar a treinar sem recair, retorno ao esporte.
- **Fisio domiciliar / itinerante** (mundo pro) — avaliar fora do consultório, relatório no celular.
- **Dono de clínica multiunidade** (mundo clínica) — padrão clínico entre unidades e indicadores comparáveis.
- **Coordenação de curso / professor** (mundo acadêmico) — turma raciocinando, casos comentados, acompanhamento de progresso.

Cada um dos 10 públicos passa a ter, obrigatoriamente: descrição de momento de vida, **6–8 dores**, **6–8 desejos**, **6–8 soluções que ofereço** e um CTA próprio. Isso multiplica diretamente o texto disponível para as artes.

### 3. Ligar os sub-nichos ao acervo editorial

Hoje só existe um mapeamento (`recem-formado → academico`). Vou estender o mapa de sub-nicho → mundo em `StudioProCreate.tsx` para os cinco novos públicos, para que cada um receba o acervo oficial do seu mundo + o overlay das próprias dores/desejos, com imagens temáticas corretas.

### 4. Enriquecer o acervo do mundo, onde ele é o gargalo

Nos arquivos de mundo (`patient.ts`, `professional.ts`, `clinic.ts`, `academic.ts`) vou acrescentar variações de headline, listas, comparativos, histórias e carrosséis nos temas que hoje repetem cedo — mantendo as regras já travadas (sem PEDro/evidências, sem jargão de gestão, sem texto cortado, imagem só via `topic` real).

### 5. Registrar o aprendizado

- Atualizar `docs/studio-brand-onboarding-playbook.md` com a régua de "kit completo": quantos públicos, quantas linhas por campo, o que caracteriza um kit raso.
- Atualizar a memória do projeto com essa régua, para que todo kit novo (meu ou de cliente) nasça nesse nível.

## Nota técnica

- Os campos do kit são dados em `studio_brands` (colunas `description`, `positioning`, `tone`, `strategy_notes`, `topics`, `audiences` jsonb) — atualizados por migração de dados restrita à marca Aliv.iA, sem tocar em nenhuma outra marca.
- Nenhuma mudança no isolamento de marca: blocos exclusivos (STEPS, D.I.F.I) seguem só para a marca dona, e os testes de `studio-brand-isolation` e `studio-coverage` precisam continuar passando.
- Cota e motor de geração não mudam.
