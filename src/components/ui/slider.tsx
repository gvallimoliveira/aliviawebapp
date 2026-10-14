import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** true = o valor só muda arrastando a bolinha; tocar ou arrastar na trilha não altera nada. */
  dragOnly?: boolean;
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, dragOnly, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onValueChange, ...props }, ref) => {
  // Só fica true quando o dedo/mouse começou exatamente na bolinha.
  const draggingThumb = React.useRef(false);
  const pointerActive = React.useRef(false);

  const endDrag = () => {
    draggingThumb.current = false;
    pointerActive.current = false;
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      style={{ touchAction: "none" }}
      className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!dragOnly || event.defaultPrevented) return;
        pointerActive.current = true;
        const target = event.target as HTMLElement | null;
        draggingThumb.current = !!target?.closest('[role="slider"]');
        // Toque fora da bolinha: o Radix não inicia o arraste nem pula para o ponto.
        if (!draggingThumb.current) event.preventDefault();
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        // No toque, o navegador "prende" o dedo à trilha; bloqueia o movimento se não começou na bolinha.
        if (dragOnly && !draggingThumb.current) event.preventDefault();
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        endDrag();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        endDrag();
      }}
      onValueChange={(value) => {
        // Rede de segurança: com ponteiro ativo, só aceita mudança vinda da bolinha (teclado continua livre).
        if (dragOnly && pointerActive.current && !draggingThumb.current) return;
        onValueChange?.(value);
      }}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors before:absolute before:-inset-2.5 before:rounded-full before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
