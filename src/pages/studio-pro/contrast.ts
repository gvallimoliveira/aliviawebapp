/**
 * CONTRASTE DO KIT DE CORES (Studio público)
 *
 * As duas cores principais têm papéis distintos nas artes:
 * `primary` = cor de marca (fundos, formas, destaques) e `primary2` = cor que
 * fica POR CIMA dela (texto/ícones). Quando o par não tem contraste, a arte sai
 * ilegível — cliente com neon sobre branco é o caso clássico.
 *
 * Aqui ficam os cálculos (WCAG) e as sugestões automáticas. Puro cálculo local:
 * não consome crédito de IA.
 */

export type ColorRole = "surface" | "onSurface";

const clamp255 = (n: number) => Math.min(255, Math.max(0, n));

export const parseHex = (hex: string): [number, number, number] | null => {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

const toHex = (rgb: [number, number, number]) =>
  `#${rgb.map((v) => clamp255(Math.round(v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string): number => {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Razão de contraste WCAG (1 a 21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

export const isLight = (hex: string) => luminance(hex) > 0.45;

/** Texto legível (preto suave ou branco) sobre a cor informada. */
export const readableOn = (hex: string) => (isLight(hex) ? "#111111" : "#FFFFFF");

export const mix = (hex: string, target: [number, number, number], amount: number) => {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex([
    rgb[0] + (target[0] - rgb[0]) * amount,
    rgb[1] + (target[1] - rgb[1]) * amount,
    rgb[2] + (target[2] - rgb[2]) * amount,
  ]);
};


/** Escurece a cor até ter contraste suficiente com branco (fundo escuro de marca). */
export const deepen = (hex: string, minRatio = 4.5) => {
  let out = hex;
  for (let i = 0; i < 12; i += 1) {
    if (contrastRatio(out, "#FFFFFF") >= minRatio) break;
    out = mix(out, [0, 0, 0], 0.12);
  }
  return out;
};

/** Clareia a cor até destacar de fundos escuros (uso em texto sobre preto). */
export const lighten = (hex: string, minRatio = 4.5) => {
  let out = hex;
  for (let i = 0; i < 12; i += 1) {
    if (contrastRatio(out, "#111111") >= minRatio) break;
    out = mix(out, [255, 255, 255], 0.12);
  }
  return out;
};

export type ContrastVerdict = {
  ratio: number;
  level: "ok" | "aviso" | "ruim";
  message: string;
};

export const judgeContrast = (surface: string, onSurface: string): ContrastVerdict => {
  const ratio = contrastRatio(surface, onSurface);
  if (ratio >= 4.5) return { ratio, level: "ok", message: "Contraste bom para texto em qualquer tamanho." };
  if (ratio >= 3)
    return {
      ratio,
      level: "aviso",
      message: "Só funciona em texto grande (título). Frases pequenas ficam difíceis de ler.",
    };
  return { ratio, level: "ruim", message: "Texto fica ilegível nas artes. Ajuste uma das duas cores." };
};

/**
 * TOKENS COM CONTRASTE GARANTIDO (verificação antes de aprovar a arte)
 *
 * Antes, o tema da marca só sobrescrevia `--primary`, `--background` e
 * `--accent`; os pares de texto (`*-foreground`) continuavam vindo do tema
 * Aliv.iA. Resultado: chip escuro com texto escuro, título ilegível sobre fundo
 * de marca, etc.
 *
 * Aqui cada superfície recebe o seu texto CALCULADO: se o par não atinge 4,5:1
 * (WCAG AA), a cor do texto é trocada por preto suave ou branco — a cor de marca
 * do FUNDO nunca é alterada, só o texto que fica por cima.
 */
export const ensureReadable = (surface: string, candidate: string, minRatio = 4.5) =>
  contrastRatio(surface, candidate) >= minRatio ? candidate : readableOn(surface);

/** Texto secundário: mais suave que o principal, mas ainda legível (4,5:1). */
const softInk = (surface: string, ink: string) => {
  let out = mix(ink, parseHex(surface) ?? [255, 255, 255], 0.42);
  for (let i = 0; i < 8; i += 1) {
    if (contrastRatio(surface, out) >= 4.5) break;
    out = mix(out, parseHex(ink) ?? [0, 0, 0], 0.2);
  }
  return out;
};

export type ThemeSurfaces = {
  background: string;
  primary: string;
  accent: string;
  secondary: string;
};

/** Mapa token → hex, com todos os pares superfície/texto já validados. */
export const readableThemeTokens = (surfaces: ThemeSurfaces): Record<string, string> => {
  const bg = surfaces.background;
  const ink = readableOn(bg);
  return {
    "--background": bg,
    "--foreground": ink,
    "--card": bg,
    "--card-foreground": ink,
    "--popover": bg,
    "--popover-foreground": ink,
    "--muted": mix(bg, parseHex(ink) ?? [0, 0, 0], 0.06),
    "--muted-foreground": softInk(bg, ink),
    "--border": mix(bg, parseHex(ink) ?? [0, 0, 0], 0.16),
    "--input": mix(bg, parseHex(ink) ?? [0, 0, 0], 0.16),
    "--primary": surfaces.primary,
    "--primary-foreground": readableOn(surfaces.primary),
    "--accent": surfaces.accent,
    "--accent-foreground": readableOn(surfaces.accent),
    "--secondary": surfaces.secondary,
    "--secondary-foreground": readableOn(surfaces.secondary),
  };
};
