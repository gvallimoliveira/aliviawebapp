import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Flame,
  Wrench,
  StretchHorizontal,
  Dumbbell,
  Target,
  Trophy,
  ArrowRight } from
"lucide-react";
import aliviaMark from "@/assets/logo-alivia.png";

const steps = [
{ icon: Flame, key: "step1" },
{ icon: Wrench, key: "step2" },
{ icon: StretchHorizontal, key: "step3" },
{ icon: Dumbbell, key: "step4" },
{ icon: Target, key: "step5" },
{ icon: Trophy, key: "step6" }];


const difiItems = [
{ letter: "D", key: "dor" },
{ letter: "I", key: "inibicao" },
{ letter: "F", key: "fraqueza" },
{ letter: "I", key: "incapacidade" }];


const MethodologySection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center">
          
          <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
            {t("methodology.badge")}
          </span>
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            {t("methodology.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("methodology.subtitle")}
          </p>
        </motion.div>

        {/* STEPS Ladder */}
        <div className="mb-20">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center text-xl font-bold text-foreground md:text-2xl">
            
            {t("methodology.steps_title")}
          </motion.h3>

          <div className="mx-auto max-w-4xl">
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none sm:pb-0 md:grid-cols-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="relative flex flex-col items-center snap-start shrink-0 w-[calc(40%-0.375rem)] sm:w-auto sm:shrink">
                    
                    {/* Step card */}
                    <div
                      className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md w-full">
                      
                      
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        Step {i + 1}
                      </span>
                      <span className="text-xs font-medium text-foreground leading-tight">
                        {t(`methodology.steps.${step.key}.title`)}
                      </span>
                    </div>
                    {/* Arrow connector (hidden on mobile) */}
                    {i < 5 &&
                    <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 text-muted-foreground/40 md:block" />
                    }
                  </motion.div>);

              })}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("methodology.steps_desc")}
            </p>
          </div>
        </div>

        {/* D.I.F.I. Cycle */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center text-xl font-bold text-foreground md:text-2xl">
            
            {t("methodology.difi_title")}
          </motion.h3>

          <div className="mx-auto max-w-lg px-4">
            {/* Cycle diagram */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 my-8">
              
              {/* Circular path */}
              <svg className="absolute inset-[15%] w-[70%] h-[70%]" viewBox="0 0 320 320">
                <circle
                  cx="160"
                  cy="160"
                  r="120"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  strokeDasharray="6 6" />
                
                <path d="M 160 40 A 120 120 0 0 1 280 160" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrowhead)" opacity="0.7" />
                <path d="M 280 160 A 120 120 0 0 1 160 280" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrowhead)" opacity="0.7" />
                <path d="M 160 280 A 120 120 0 0 1 40 160" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrowhead)" opacity="0.7" />
                <path d="M 40 160 A 120 120 0 0 1 160 40" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrowhead)" opacity="0.7" />
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--destructive))" opacity="0.7" />
                  </marker>
                </defs>
              </svg>

              {/* D.I.F.I. nodes positioned with proper spacing */}
              {difiItems.map((item, i) => {
                const positions = [
                { top: "0%", left: "50%", transform: "translateX(-50%)" },
                { top: "50%", right: "0%", transform: "translateY(-50%)" },
                { bottom: "0%", left: "50%", transform: "translateX(-50%)" },
                { top: "50%", left: "0%", transform: "translateY(-50%)" }];

                const pos = positions[i] as React.CSSProperties;
                return (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.12 }}
                    className="absolute flex flex-col items-center"
                    style={pos}>
                    
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-destructive/30 bg-card shadow-md">
                      <span className="text-base font-black text-destructive">{item.letter}</span>
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-foreground whitespace-nowrap">
                      {t(`methodology.difi.${item.key}`)}
                    </span>
                  </motion.div>);

              })}

              {/* Break/Intervention indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
                  <img src={aliviaMark} alt="Símbolo da Aliv.iA" className="h-12 w-12 scale-125 object-contain" />
                </div>
                <span className="mt-1 text-[9px] font-bold text-primary whitespace-nowrap">
                  Aliv.iA
                </span>
              </motion.div>
            </motion.div>

            <p className="mt-6 text-center text-sm text-muted-foreground leading-relaxed">
              {t("methodology.difi_desc")}
            </p>
          </div>
        </div>

        {/* Authority footer */}
        






        
      </div>
    </section>);

};

export default MethodologySection;