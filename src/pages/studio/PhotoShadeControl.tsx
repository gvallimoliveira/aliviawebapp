import { Label } from '@/components/ui/label';
import { useId } from 'react';
import { Slider } from '@/components/ui/slider';
type Props = { value: number; onChange: (value: number) => void; label?: string };
export default function PhotoShadeControl({ value, onChange, label = 'Escurecimento da foto' }: Props) {
  const labelId = useId();
  return <div className="mx-auto my-3 w-full max-w-sm space-y-2 px-2">
    <div className="flex items-center justify-between gap-3 text-xs">
      <Label id={labelId} className="text-xs">{label}</Label><span className="tabular-nums text-muted-foreground">{value === 0 ? 'Sem película' : `${value}%`}</span>
    </div>
    <Slider aria-labelledby={labelId} min={0} max={100} step={5} value={[value]} onValueChange={([next]) => onChange(next ?? 100)} />
  </div>;
}