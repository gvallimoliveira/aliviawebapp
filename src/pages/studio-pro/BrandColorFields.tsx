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
