import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Delay in seconds */
  delay?: number;
  /** Vertical travel in px */
  y?: number;
  /** Slight scale-up entrance (Apple-style) */
  scale?: boolean;
  className?: string;
};

/**
 * Scroll-triggered entrance used across the cinematic landings.
 * Runs once, uses only opacity/transform, and respects reduced-motion.
 */
const Reveal = ({ children, delay = 0, y = 28, scale = false, className }: RevealProps) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: scale ? 0.97 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
