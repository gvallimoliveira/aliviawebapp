import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { setSeo } from "@/lib/seo";
import { POLICY_VERSION } from "@/lib/consentLog";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  useEffect(() => {
    setSeo({
      title: "Política de Privacidade | Aliv.iA",
      description:
        "Como a Aliv.iA coleta, usa, compartilha e protege dados pessoais e dados de saúde, conforme a LGPD (Lei 13.709/2018).",
      url: "https://aliviawebapp.com.br/privacidade",
      type: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container max-w-3xl px-4 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Versão {POLICY_VERSION} · Última atualização em 30 de julho de 2026
        </p>

        <div className="mt-8 space-y-8">
          <Section title="1. Quem é o controlador dos dados">
            <p>
              O controlador dos dados tratados na plataforma Aliv.iA é <strong>Guilherme Vallim de
              Oliveira</strong>, responsável pelo desenvolvimento e operação do software.
            </p>
            <p>
              <strong>Encarregado pelo tratamento de dados pessoais (DPO):</strong> Guilherme Vallim de
              Oliveira — contato:{" "}
              <a className="text-primary underline" href="mailto:aliviawebapp@gmail.com">
                aliviawebapp@gmail.com
              </a>
              .
            </p>
            <p>
              Quando um profissional ou uma clínica usa a Aliv.iA para atender seus próprios pacientes,
              esse profissional/clínica é o <strong>controlador dos dados clínicos dos pacientes</strong> e a
              Aliv.iA atua como <strong>operadora</strong>, tratando os dados apenas conforme as instruções
              dele e desta política.
            </p>
          </Section>

          <Section title="2. Quais dados tratamos">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cadastro:</strong> nome, e-mail, telefone, CPF/CNPJ (quando informado), CREFITO, cidade/estado, dados de instituição para contas acadêmicas.</li>
              <li><strong>Dados de saúde (dados sensíveis, art. 11 da LGPD):</strong> queixas, mapa de dor, respostas de anamnese e questionários validados, testes funcionais, hipóteses e planos de tratamento, notas de sessão, diário de dor, fotos e documentos enviados pelo profissional.</li>
              <li><strong>Uso da plataforma:</strong> registros técnicos de acesso, erros da aplicação, contadores de uso de recursos de IA.</li>
              <li><strong>Pagamento:</strong> identificadores de assinatura e transação. <strong>Não armazenamos dados de cartão</strong> — o processamento é feito integralmente pela Stripe.</li>
            </ul>
          </Section>

          <Section title="3. Bases legais e finalidades">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consentimento específico e destacado</strong> (art. 11, I) para autoavaliações realizadas pelo próprio paciente.</li>
              <li><strong>Tutela da saúde por profissional de saúde</strong> (art. 11, II, "f") quando o tratamento ocorre dentro do atendimento de um fisioterapeuta ou clínica.</li>
              <li><strong>Execução de contrato</strong> (art. 7º, V) para conta, assinatura, suporte e funcionamento do software.</li>
              <li><strong>Cumprimento de obrigação legal/regulatória</strong> (art. 7º, II) para guarda de prontuário e obrigações fiscais.</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX) para segurança, prevenção a fraude e melhoria técnica, sempre com minimização de dados.</li>
            </ul>
          </Section>

          <Section title="4. Uso de inteligência artificial">
            <p>
              A Aliv.iA usa modelos de IA para apoiar o raciocínio clínico, gerar hipóteses, planos de
              exercícios e transcrever notas de voz. Antes do envio aos modelos, aplicamos{" "}
              <strong>minimização e pseudonimização</strong>: nome completo, e-mail, telefone, CPF e endereço
              são removidos ou substituídos por iniciais e identificador curto, e textos livres passam por
              limpeza automática de CPF, telefone e e-mail.
            </p>
            <p>
              Os áudios de notas de voz são <strong>descartados após a transcrição</strong>; apenas o texto
              permanece no prontuário. Os resultados da IA são <strong>sugestões de apoio</strong> e não
              substituem a decisão do profissional de saúde nem constituem diagnóstico médico.
            </p>
          </Section>

          <Section title="5. Com quem compartilhamos (operadores/suboperadores)">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Lovable Cloud / Supabase</strong> — hospedagem, banco de dados, autenticação e armazenamento de arquivos.</li>
              <li><strong>Stripe</strong> — processamento de pagamentos e assinaturas.</li>
              <li><strong>Resend</strong> — envio de e-mails transacionais (avisos, acompanhamentos, suporte).</li>
              <li><strong>Provedores de modelos de IA</strong> acessados via gateway da Lovable (ex.: Google Gemini/OpenAI), recebendo apenas dados minimizados e pseudonimizados, sem uso para treinamento.</li>
              <li><strong>YouTube</strong> — apenas para exibição de vídeos de exercícios; nenhum dado clínico é enviado.</li>
            </ul>
            <p>
              Parte desses provedores opera fora do Brasil. A transferência internacional segue o art. 33 da
              LGPD, com cláusulas contratuais e garantias de segurança dos fornecedores. Não vendemos dados
              pessoais e não os usamos para publicidade comportamental.
            </p>
          </Section>

          <Section title="6. Cookies e medição">
            <p>
              Usamos apenas armazenamento local e cookies <strong>estritamente necessários</strong> para
              login, preferências de idioma, retomada de avaliações em andamento e segurança. Não utilizamos
              ferramentas de mapeamento de sessão, rastreamento comportamental ou publicidade de terceiros.
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Os dados trafegam criptografados (HTTPS) e ficam armazenados em infraestrutura gerenciada com
              criptografia em repouso. O acesso é controlado por autenticação, políticas de segurança em nível
              de linha (RLS) no banco de dados, controle de papéis por clínica e registros de auditoria de
              ações sensíveis. Em caso de incidente com risco relevante, comunicamos os titulares afetados e a
              ANPD nos prazos aplicáveis.
            </p>
          </Section>

          <Section title="8. Retenção e eliminação">
            <ul className="list-disc pl-5 space-y-1">
              <li>Dados de prontuário: mantidos enquanto durar a relação com o profissional/clínica e pelo prazo legal aplicável à guarda de prontuário.</li>
              <li>Rascunhos de avaliação em andamento: expiram automaticamente em 24 horas.</li>
              <li>Áudios de notas de voz: descartados imediatamente após a transcrição.</li>
              <li>Dados de conta: eliminados ou anonimizados após o pedido de exclusão, ressalvadas as obrigações legais e fiscais.</li>
            </ul>
          </Section>

          <Section title="9. Seus direitos como titular">
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
              informação sobre compartilhamentos, revogação de consentimento e eliminação dos dados.
            </p>
            <p>
              Usuários com conta podem exercer esses direitos diretamente em{" "}
              <Link className="text-primary underline" to="/conta">
                Minha Conta → Privacidade e meus dados
              </Link>{" "}
              (exportação em 1 clique e pedido formal registrado). Também é possível escrever para{" "}
              <a className="text-primary underline" href="mailto:aliviawebapp@gmail.com">
                aliviawebapp@gmail.com
              </a>
              . Respondemos em até 15 dias.
            </p>
            <p>
              Se os dados foram inseridos por um profissional ou clínica, encaminharemos a solicitação ao
              controlador responsável pelo atendimento.
            </p>
          </Section>

          <Section title="10. Menores de idade">
            <p>
              O tratamento de dados de crianças e adolescentes ocorre no melhor interesse do titular e depende
              do consentimento específico de pelo menos um dos pais ou do responsável legal, obtido pelo
              profissional responsável pelo atendimento.
            </p>
          </Section>

          <Section title="11. Alterações desta política">
            <p>
              Podemos atualizar esta política. Mudanças relevantes serão comunicadas na plataforma e a versão
              vigente sempre estará indicada no topo desta página. Consulte também os{" "}
              <Link className="text-primary underline" to="/termos">
                Termos de Uso
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
