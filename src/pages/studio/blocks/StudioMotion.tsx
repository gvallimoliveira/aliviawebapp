import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * Motion kinds applied to ~half of the Studio blocks.
 *
 * Contract: every effect must be NEUTRAL when the block is centered in the
 * viewport (scroll progress ~0.5). This keeps PNG export faithful — the art is
 * captured in its settled state, never mid-blur or mid-zoom.
 */
export type MotionKind =
  | "none"
  | "focusPull"
  | "zoomIn"
  | "zoomOut"
  | "gradientDrift"
  | "parallaxScrub"
  | "maskWipe"
  | "tiltRise";

export const MOTION_KINDS: MotionKind[] = [
  "focusPull",
  "zoomIn",
  "zoomOut",
  "gradientDrift",
  "parallaxScrub",
  "maskWipe",
  "tiltRise",
];

type Props = { kind?: MotionKind; children: ReactNode };

const StudioMotion = ({ kind = "none", children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  // In → settled (0.5) → out. Neutral at the middle for faithful capture.
  const blur = useTransform(p, [0, 0.42, 0.58, 1], ["8px", "0px", "0px", "6px"]);
  const zoomIn = useTransform(p, [0, 0.45, 0.55, 1], [0.9, 1, 1, 1.05]);
  const zoomOut = useTransform(p, [0, 0.45, 0.55, 1], [1.12, 1, 1, 0.96]);
  const rise = useTransform(p, [0, 0.45, 0.55, 1], [70, 0, 0, -50]);
  const tilt = useTransform(p, [0, 0.45, 0.55, 1], [7, 0, 0, -5]);
  const fade = useTransform(p, [0, 0.28, 0.72, 1], [0, 1, 1, 0.35]);
  const hue = useTransform(p, [0, 0.5, 1], [0.55, 1, 0.7]);
  const gradientY = useTransform(p, [0, 1], ["-18%", "18%"]);
  const wipe = useTransform(p, [0.05, 0.45], ["78%", "0%"]);
  const wipeClip = useTransform(wipe, (v) => `inset(0% 0% ${v} 0%)`);

  if (kind === "none") return <>{children}</>;

  if (kind === "gradientDrift") {
    return (
      <div ref={ref} className="relative isolate overflow-hidden">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-20%] inset-y-[-30%] -z-10"
          style={{
            y: gradientY,
            opacity: hue,
            background:
              "radial-gradient(45% 45% at 22% 28%, hsl(var(--primary) / 0.28), transparent 70%), radial-gradient(40% 40% at 78% 72%, hsl(var(--accent) / 0.45), transparent 72%)",
          }}
        />
        {children}
      </div>
    );
  }

  if (kind === "maskWipe") {
    return (
      <div ref={ref} className="overflow-hidden">
        <motion.div style={{ clipPath: wipeClip }}>{children}</motion.div>
      </div>
    );
  }

  if (kind === "parallaxScrub") {
    return (
      <div ref={ref} className="overflow-hidden">
        <motion.div style={{ y: rise, opacity: fade }}>{children}</motion.div>
      </div>
    );
  }

  if (kind === "focusPull") {
    return (
      <div ref={ref} className="overflow-hidden">
        <motion.div style={{ filter: blur, opacity: fade }}>{children}</motion.div>
      </div>
    );
  }

  if (kind === "tiltRise") {
    return (
      <div ref={ref} className="overflow-hidden [perspective:1200px]">
        <motion.div style={{ rotateX: tilt, y: rise }} className="origin-top will-change-transform">
          {children}
        </motion.div>
      </div>
    );
  }

  // zoomIn / zoomOut
  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div style={{ scale: kind === "zoomIn" ? zoomIn : zoomOut }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
};

export default StudioMotion;
