import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
    <circle cx="18" cy="6" r="1.5" fill="currentColor" />
  </svg>
);

const profiles = [
  { handle: "@aliviawebapp", url: "https://www.instagram.com/aliviawebapp" },
  { handle: "@gvallim.fisioterapia", url: "https://instagram.com/gvallim.fisioterapia" },
];

const SocialSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center text-2xl font-bold text-foreground md:text-3xl"
        >
          {t("social.title")}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-md flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8"
        >
          {profiles.map((p) => (
            <a
              key={p.handle}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 text-white">
                <InstagramIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {p.handle}
              </span>
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialSection;
