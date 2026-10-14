import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** true = o valor só muda arrastando a bolinha; toque na trilha não pula para aquele ponto. */
  dragOnly?: boolean;
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, dragOnly, onPointerDown, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    style={{ touchAction: "none" }}
    className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
    onPointerDown={(event) => {
      onPointerDown?.(event);
      // Bloqueia o salto para o ponto tocado na régua: só o arraste da bolinha altera o valor.
      if (dragOnly && !event.defaultPrevented) {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('[role="slider"]')) event.preventDefault();
      }
    }}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
