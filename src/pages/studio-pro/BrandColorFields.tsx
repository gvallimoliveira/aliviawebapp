import { useRef, useState } from "react";
import { ImageUp, Pipette, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MAX_EXTRA_COLORS, type BrandColorKit } from "./brandColors";
import { deepen, judgeContrast, lighten, readableOn } from "./contrast";
import {
  extractPalette,
  pickPixelHex,
  pickWithEyeDropper,
  supportsEyeDropper,
  type PaletteSwatch,
} from "./paletteExtract";


/**
 * Campos de cores do kit de marca: duas principais sempre, duas secundárias
 * opcionais e quantas cores extras o usuário quiser em cada categoria.
 */

type Props = {
  idPrefix: string;
  kit: BrandColorKit;
  onChange: (next: BrandColorKit) => void;
};


const Swatch = ({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <div className={disabled ? "opacity-50" : undefined}>
    <Label htmlFor={id} className="text-xs">
      {label}
    </Label>
    <div className="mt-1 flex items-center gap-2">
      <Input
        id={id}
        type="color"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 shrink-0 p-1"
      />
      <Input
        value={value.toUpperCase()}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 font-mono text-xs uppercase"
      />
      {/* Conta-gotas: pega o tom exato de qualquer ponto da tela (manual aberto ao lado). */}
      {supportsEyeDropper() && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={disabled}
          aria-label={`Conta-gotas para ${label}`}
          title="Conta-gotas: clicar e capturar a cor de qualquer ponto da tela"
          className="h-10 w-10 shrink-0"
          onClick={async () => {
            const picked = await pickWithEyeDropper();
            if (picked) onChange(picked);
          }}
        >
          <Pipette className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

/**
 * Cores extras de uma categoria: lista aberta (até MAX_EXTRA_COLORS), com
 * adicionar e remover. Entram na rotação de acento das artes.
 */
const ExtraColors = ({
  idPrefix,
  label,
  colors,
  seed,
  onChange,
}: {
  idPrefix: string;
  label: string;
  colors: string[];
  seed: string;
  onChange: (next: string[]) => void;
}) => (
  <div className="mt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={colors.length >= MAX_EXTRA_COLORS}
        onClick={() => onChange([...colors, seed])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar cor
      </Button>
    </div>
    {colors.length > 0 && (
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {colors.map((color, index) => (
          <div key={`${idPrefix}-extra-${index}`} className="flex items-end gap-2">
            <div className="flex-1">
              <Swatch
                id={`${idPrefix}-extra-${index}`}
                label={`Cor extra ${index + 1}`}
                value={color}
                onChange={(value) => onChange(colors.map((c, i) => (i === index ? value : c)))}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Remover cor extra ${index + 1}`}
              onClick={() => onChange(colors.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
);




type SampleRole = "primary" | "primary2" | "secondary" | "secondary2" | "extraPrimary" | "extraSecondary";

const ROLE_LABEL: Record<SampleRole, string> = {
  primary: "Cor de marca (fundo)",
  primary2: "Cor do texto sobre ela",
  secondary: "Apoio (destaque)",
  secondary2: "Fundo claro / neutro",
  extraPrimary: "Cor principal adicional",
  extraSecondary: "Cor secundária adicional",
};

/**
 * LEITURA DE COR NO PIXEL
 *
 * O manual da marca nem sempre escreve o hexadecimal — às vezes só imprime a
 * amostra. Aqui o dono da marca sobe a página do manual (ou o logo) e o sistema
 * lê os tons EXATOS pixel por pixel. Também é possível clicar num ponto da
 * imagem para capturar aquele tom específico. Nada disso consome crédito de IA.
 */
const ColorSampler = ({
  idPrefix,
  kit,
  onChange,
}: {
  idPrefix: string;
  kit: BrandColorKit;
  onChange: (next: BrandColorKit) => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteSwatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<SampleRole>("primary");

  const apply = (hex: string) => {
    if (role === "extraPrimary") {
      if (kit.extraPrimary.length >= MAX_EXTRA_COLORS) {
        toast.error("Limite de cores principais adicionais atingido.");
        return;
      }
      onChange({ ...kit, extraPrimary: [...kit.extraPrimary, hex] });
    } else if (role === "extraSecondary") {
      if (kit.extraSecondary.length >= MAX_EXTRA_COLORS) {
        toast.error("Limite de cores secundárias adicionais atingido.");
        return;
      }
      onChange({ ...kit, useSecondary: true, extraSecondary: [...kit.extraSecondary, hex] });
    } else if (role === "secondary" || role === "secondary2") {
      onChange({ ...kit, useSecondary: true, [role]: hex } as BrandColorKit);
    } else {
      onChange({ ...kit, [role]: hex } as BrandColorKit);
    }
    toast.success(`${hex} aplicado em “${ROLE_LABEL[role]}”.`);
  };

  const load = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (print do manual, página exportada ou logo).");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setSrc(dataUrl);
      const found = await extractPalette(dataUrl, 10);
      setPalette(found);
      if (!found.length) toast.error("Não foi possível ler cores nesta imagem.");
    } catch {
      toast.error("Não foi possível ler esta imagem.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const pickFromImage = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!src) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const hex = await pickPixelHex(
      src,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    );
    if (hex) apply(hex);
  };

  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Capturar o tom exato do manual</p>
          <p className="text-xs text-muted-foreground">
            Suba a página do manual (ou o logo). O sistema lê os tons pixel por pixel — clique numa
            cor da lista ou direto na imagem para aplicar.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImageUp className="mr-1.5 h-3.5 w-3.5" />
          {busy ? "Lendo…" : "Enviar imagem"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void load(e.target.files?.[0])}
        />
      </div>

      {src && (
        <>
          <div className="mt-3">
            <Label htmlFor={`${idPrefix}-sample-role`} className="text-xs">
              Aplicar a cor capturada em
            </Label>
            <select
              id={`${idPrefix}-sample-role`}
              value={role}
              onChange={(e) => setRole(e.target.value as SampleRole)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base md:text-xs"
            >
              {(Object.keys(ROLE_LABEL) as SampleRole[]).map((key) => (
                <option key={key} value={key}>
                  {ROLE_LABEL[key]}
                </option>
              ))}
            </select>
          </div>

          <img
            src={src}
            alt="Amostra do manual da marca para captura de cores"
            onClick={(e) => void pickFromImage(e)}
            className="mt-3 max-h-56 w-full cursor-crosshair rounded-xl border border-border object-contain"
          />

          {palette.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {palette.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => apply(swatch.hex)}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-mono uppercase hover:border-primary"
                  title={`${swatch.hex} — ${(swatch.share * 100).toFixed(1)}% da imagem${swatch.neutral ? " (neutro)" : ""}`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ background: swatch.hex }}
                  />
                  {swatch.hex}
                  <span className="text-muted-foreground">{(swatch.share * 100).toFixed(0)}%</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BrandColorFields = ({ idPrefix, kit, onChange }: Props) => {
  const verdict = judgeContrast(kit.primary, kit.primary2);
  const suggest = () => {
    /** Marca fica no fundo; a segunda cor passa a ser a de texto legível. */
    const surface = deepen(kit.primary);
    onChange({
      ...kit,
      primary: surface,
      primary2: readableOn(surface),
      secondary: kit.useSecondary ? lighten(kit.secondary) : kit.secondary,
      secondary2: kit.useSecondary ? readableOn(lighten(kit.secondary)) : kit.secondary2,
    });
  };

  return (
  <div className="sm:col-span-2 space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
    <ColorSampler idPrefix={idPrefix} kit={kit} onChange={onChange} />

    <div>
      <p className="text-sm font-semibold">Cores principais</p>
      <p className="text-xs text-muted-foreground">
        A primeira é a cor de marca (fundos, formas, destaques). A segunda é a cor que fica{" "}
        <strong>por cima</strong> dela — texto e ícones.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Swatch
          id={`${idPrefix}-primary`}
          label="Cor de marca (fundo)"
          value={kit.primary}
          onChange={(primary) => onChange({ ...kit, primary })}
        />
        <Swatch
          id={`${idPrefix}-primary2`}
          label="Cor do texto sobre ela"
          value={kit.primary2}
          onChange={(primary2) => onChange({ ...kit, primary2 })}
        />
      </div>

      {/* Prova visual + veredito de contraste: evita arte ilegível antes de gerar. */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className="rounded-xl px-3 py-2 text-sm font-bold"
          style={{ background: kit.primary, color: kit.primary2 }}
        >
          Texto de exemplo
        </span>
        <span
          className={`text-xs font-semibold ${
            verdict.level === "ok"
              ? "text-emerald-600"
              : verdict.level === "aviso"
                ? "text-amber-600"
                : "text-destructive"
          }`}
        >
          Contraste {verdict.ratio.toFixed(1)}:1 — {verdict.message}
        </span>
        {verdict.level !== "ok" && (
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={suggest}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            Sugerir cores legíveis
          </Button>
        )}
      </div>

      <ExtraColors
        idPrefix={`${idPrefix}-primary`}
        label="Cores principais adicionais (opcional)"
        colors={kit.extraPrimary}
        seed={deepen(kit.primary)}
        onChange={(extraPrimary) => onChange({ ...kit, extraPrimary })}
      />
    </div>


    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Cores secundárias</p>
          <p className="text-xs text-muted-foreground">
            Desative se a marca não tiver paleta secundária.
          </p>
        </div>
        <Switch
          id={`${idPrefix}-use-secondary`}
          checked={kit.useSecondary}
          onCheckedChange={(useSecondary) => onChange({ ...kit, useSecondary })}
        />
      </div>
      {kit.useSecondary && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Swatch
              id={`${idPrefix}-secondary`}
              label="Apoio (destaque)"
              value={kit.secondary}
              onChange={(secondary) => onChange({ ...kit, secondary })}
            />
            <Swatch
              id={`${idPrefix}-secondary2`}
              label="Fundo claro / neutro"
              value={kit.secondary2}
              onChange={(secondary2) => onChange({ ...kit, secondary2 })}
            />
          </div>
          <ExtraColors
            idPrefix={`${idPrefix}-secondary`}
            label="Cores secundárias adicionais (opcional)"
            colors={kit.extraSecondary}
            seed={lighten(kit.secondary)}
            onChange={(extraSecondary) => onChange({ ...kit, extraSecondary })}
          />
        </>
      )}
    </div>

  </div>
  );
};


export default BrandColorFields;
