import { useEffect, useState } from "react";
import logoAlivia from "@/assets/logo-alivia.png";

const SESSION_KEY = "alivia:splash-shown";
const DURATION_MS = 2600;

/**
 * Opening splash screen — Aliv.iA logo zooms in from small to fill,
 * then fades out and reveals the app. Shows once per browser session.
 */
const SplashScreen = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    const fade = window.setTimeout(() => setFadingOut(true), DURATION_MS - 350);
    const hide = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-300 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fadingOut ? "none" : "auto" }}
    >
      {/* soft radial glow behind the logo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.18), transparent 60%)",
        }}
      />
      <img
        src={logoAlivia}
        alt=""
        className="splash-logo relative w-40 h-40 object-contain drop-shadow-xl"
      />
      <style>{`
        @keyframes splash-zoom {
          0%   { transform: scale(0.35); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scale(2.4); opacity: 1; }
        }
        .splash-logo {
          animation: splash-zoom 1.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-logo { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
