import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

type LazySectionProps = {
  children: ReactNode;
  /** Reserved height while the block is not mounted yet (avoids scroll jumps). */
  minHeight?: number;
  /** How early the block starts mounting, in px of scroll distance. */
  rootMargin?: string;
};

/**
 * Mounts a landing block only when it gets close to the viewport, so the page
 * never pays for building every section at once. Keeps a reserved placeholder
 * so the scrollbar stays stable, and mounts immediately when IO is missing.
 */
const LazySection = ({ children, minHeight = 420, rootMargin = "900px 0px" }: LazySectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  if (visible) {
    return (
      <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>
        {children}
      </Suspense>
    );
  }

  return <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
};

export default LazySection;
