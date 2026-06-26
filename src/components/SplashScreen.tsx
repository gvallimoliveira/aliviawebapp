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
      <div className="relative flex flex-col items-center">
        <img
          src={logoAlivia}
          alt=""
          className="splash-logo w-40 h-40 object-contain drop-shadow-xl"
        />
        <p className="splash-slogan mt-6 max-w-[18rem] text-center text-sm md:text-base italic text-muted-foreground px-4">
          ...sistema de raciocínio clínico com alma de fisioterapeuta
        </p>
      </div>
      <style>{`
        @keyframes splash-zoom {
          0%   { transform: scale(0.35); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scale(1.6); opacity: 1; }
        }
        @keyframes splash-slogan-in {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-logo {
          animation: splash-zoom 1.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        .splash-slogan {
          opacity: 0;
          animation: splash-slogan-in 0.7s ease-out forwards;
          animation-delay: 1.3s;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-logo, .splash-slogan { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
