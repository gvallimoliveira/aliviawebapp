import { motion } from "framer-motion";
import { imageForTopic } from "../topics";
import { sectionHeight, surfaceFor, type BlockProps } from "./shared";

/**
 * Feature spotlight.
 * Treatments: 0 split (image right), 1 split reversed, 2 stacked bento pair.
 *
 * REGRA TAXATIVA DE COERÊNCIA: a imagem NUNCA é escolhida aqui nem escrita no
 * conteúdo — vem exclusivamente do `topic` do item (`imageForTopic`). Se o
 * tópico não tem screenshot da tela exata daquele assunto, o bloco renderiza
 * apenas tipografia. Nenhum fallback, nenhuma imagem "parecida".
 *
 * A seleção usa o `picker` (dívida editorial), então assuntos pouco divulgados
 * têm prioridade sobre os já saturados.
 */
const FeatureBlock = ({ content, rng, treatment, format, picker }: BlockProps) => {
  const items = picker.pick(content.features, treatment === 2 ? 2 : 1, rng, (f) => [f.topic]);
  const reversed = treatment === 1;

  return (
    <section className={`relative flex ${sectionHeight(format)} items-center ${surfaceFor(treatment + 3)}`}>
      <div className="container py-16">
        <div className={treatment === 2 ? "grid gap-6 md:grid-cols-2" : "grid items-center gap-8 md:grid-cols-2"}>
          {items.map((item, i) => {
            const image = imageForTopic(item.topic);
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={treatment === 2 ? "rounded-3xl border border-border bg-card p-6" : "contents"}
              >
                {treatment === 2 ? (
                  <>
                    {image && (
                      <img
                        src={image}
                        alt={item.title}
                        loading="lazy"
                        className="mb-5 aspect-[4/3] w-full rounded-2xl border border-border object-cover"
                      />
                    )}
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-primary">{item.tag}</p>
                    <h3 className="mb-2 text-xl font-bold leading-tight tracking-tight text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </>
                ) : (
                  <>
                    <div className={`${reversed ? "md:order-2" : ""} ${image ? "" : "md:col-span-2 mx-auto max-w-3xl text-center"}`}>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-primary md:text-xs">
                        {item.tag}
                      </p>
                      <h2
                        className={`mb-4 font-bold leading-tight tracking-tight text-foreground ${
                          image ? "text-2xl md:text-4xl" : "text-3xl md:text-6xl"
                        }`}
                      >
                        {item.title}
                      </h2>
                      <p
                        className={`leading-relaxed text-muted-foreground ${
                          image ? "text-base md:text-lg" : "text-lg md:text-2xl"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                    {image && (
                      <div className={reversed ? "md:order-1" : ""}>
                        <img
                          src={image}
                          alt={item.title}
                          loading="lazy"
                          className="w-full rounded-3xl border border-border object-cover shadow-[0_24px_60px_-30px_hsl(var(--foreground)/0.35)]"
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureBlock;
