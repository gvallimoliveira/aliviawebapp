import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BrandColorKit } from "./brandColors";

/**
 * Campos de cores do kit de marca: duas principais sempre, duas secundárias
 * opcionais (desativáveis para marcas que não têm paleta secundária).
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
    </div>
  </div>
);

const BrandColorFields = ({ idPrefix, kit, onChange }: Props) => (
  <div className="sm:col-span-2 space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
    <div>
      <p className="text-sm font-semibold">Cores principais</p>
      <p className="text-xs text-muted-foreground">
        Duas cores que definem a marca (ex.: Aliv.iA usa verde e branco).
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Swatch
          id={`${idPrefix}-primary`}
          label="Principal 1"
          value={kit.primary}
          onChange={(primary) => onChange({ ...kit, primary })}
        />
        <Swatch
          id={`${idPrefix}-primary2`}
          label="Principal 2"
          value={kit.primary2}
          onChange={(primary2) => onChange({ ...kit, primary2 })}
        />
      </div>
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Swatch
            id={`${idPrefix}-secondary`}
            label="Secundária 1"
            value={kit.secondary}
            onChange={(secondary) => onChange({ ...kit, secondary })}
          />
          <Swatch
            id={`${idPrefix}-secondary2`}
            label="Secundária 2"
            value={kit.secondary2}
            onChange={(secondary2) => onChange({ ...kit, secondary2 })}
          />
        </div>
      )}
    </div>
  </div>
);

export default BrandColorFields;
