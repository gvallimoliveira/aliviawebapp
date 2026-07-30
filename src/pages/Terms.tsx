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

const Terms = () => {
  useEffect(() => {
    setSeo({
      title: "Termos de Uso | Aliv.iA",
      description:
        "Condições de uso da plataforma Aliv.iA: contas, planos, responsabilidades clínicas, limites da inteligência artificial e cancelamento.",
      url: "https://aliviawebapp.com.br/termos",
      type: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container max-w-3xl px-4 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Termos de Uso</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Versão {POLICY_VERSION} · Última atualização em 30 de julho de 2026
        </p>

        <div className="mt-8 space-y-8">
          <Section title="1. Quem oferece o serviço">
            <p>
              A Aliv.iA é operada por <strong>Guilherme Vallim de Oliveira</strong>. Contato oficial:{" "}
              <a className="text-primary underline" href="mailto:aliviawebapp@gmail.com">
                aliviawebapp@gmail.com
              </a>
              . Ao criar uma conta ou usar a plataforma, você concorda com estes termos e com a{" "}
              <Link className="text-primary underline" to="/privacidade">
                Política de Privacidade
              </Link>
              .
            </p>
          </Section>

          <Section title="2. Natureza do serviço e limites clínicos">
            <p>
              A Aliv.iA é um <strong>sistema de apoio ao raciocínio clínico musculoesquelético</strong>. Os
              resultados gerados — hipóteses, planos de tratamento, exercícios domiciliares e resumos — são{" "}
              <strong>sugestões</strong> e não constituem diagnóstico médico, prescrição ou substituto de
              avaliação presencial por profissional habilitado.
            </p>
            <p>
              A decisão clínica é sempre do profissional de saúde responsável. Em situações de emergência,
              procure atendimento imediato ou ligue 192 (SAMU).
            </p>
          </Section>

          <Section title="3. Contas e elegibilidade">
            <ul className="list-disc pl-5 space-y-1">
              <li>Contas profissionais exigem registro válido no CREFITO e informações verdadeiras.</li>
              <li>Contas acadêmicas destinam-se a estudantes, não permitem exercício profissional e não aparecem na vitrine de profissionais.</li>
              <li>Você é responsável por manter suas credenciais em sigilo e por toda atividade na sua conta.</li>
              <li>Links institucionais de clínica devem ser usados para pacientes da clínica; o uso de recursos da clínica para atendimentos particulares fora dela é vedado.</li>
            </ul>
          </Section>

          <Section title="4. Responsabilidade sobre dados de pacientes">
            <p>
              Ao inserir dados de pacientes, o profissional declara ter base legal para isso (tutela da saúde
              ou consentimento do titular), compromete-se a informar o paciente sobre o uso da plataforma e é
              responsável pela exatidão e pela guarda do prontuário.
            </p>
          </Section>

          <Section title="5. Planos, pagamentos e cancelamento">
            <ul className="list-disc pl-5 space-y-1">
              <li>Assinaturas e créditos de IA são cobrados pela Stripe, nos valores e ciclos exibidos no momento da contratação.</li>
              <li>A renovação é automática até o cancelamento, que pode ser feito a qualquer momento e passa a valer no fim do período já pago.</li>
              <li>Compras digitais seguem o direito de arrependimento em até 7 dias (art. 49 do CDC) quando aplicável.</li>
              <li>Créditos de pacotes avulsos têm validade indicada na compra e não são cumulativos após o vencimento.</li>
            </ul>
          </Section>

          <Section title="6. Uso aceitável">
            <p>
              Não é permitido: tentar burlar controles de acesso ou limites de uso; extrair dados em massa;
              usar a plataforma para fins ilícitos, discriminatórios ou fora do escopo clínico; se passar por
              outro usuário, profissional ou pela administração da Aliv.iA; ou reproduzir conteúdo,
              metodologia e materiais da plataforma sem autorização.
            </p>
          </Section>

          <Section title="7. Propriedade intelectual">
            <p>
              O software, a marca Aliv.iA, a metodologia e os conteúdos produzidos pela plataforma pertencem
              ao seu titular. Os dados clínicos inseridos pertencem ao profissional/clínica e aos respectivos
              pacientes, com exportação disponível a qualquer momento.
            </p>
          </Section>

          <Section title="8. Disponibilidade e limitação de responsabilidade">
            <p>
              Buscamos alta disponibilidade, mas o serviço é fornecido "no estado em que se encontra", podendo
              haver manutenções e indisponibilidades. Não nos responsabilizamos por decisões clínicas tomadas
              com base nas sugestões da IA, nem por danos indiretos decorrentes do uso da plataforma, nos
              limites permitidos pela lei.
            </p>
          </Section>

          <Section title="9. Encerramento">
            <p>
              Você pode encerrar sua conta a qualquer momento em Minha Conta. Podemos suspender contas que
              violem estes termos, com aviso sempre que possível. Após o encerramento, os dados são eliminados
              ou anonimizados conforme a Política de Privacidade e as obrigações legais de guarda.
            </p>
          </Section>

          <Section title="10. Lei aplicável">
            <p>
              Estes termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do consumidor para
              dirimir controvérsias.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
