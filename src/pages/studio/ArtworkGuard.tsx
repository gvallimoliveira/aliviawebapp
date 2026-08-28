import type { ReactNode } from "react";

/**
 * Última barreira contra arte vazia. O fallback fica atrás da composição real;
 * se um bloco opcional devolver `null` ou uma imagem falhar, a marca continua
 * recebendo uma peça textual válida em vez de um quadro branco.
 */
const ArtworkGuard = ({ brand, children }: { brand: string; children: ReactNode }) => (
  <div className="relative h-full w-full overflow-hidden bg-background">
    <div className="absolute inset-0 flex items-center justify-center bg-muted px-[12%] text-center">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Conteúdo da marca</p>
        <p className="mt-4 break-words text-3xl font-bold leading-[1.12] text-foreground md:text-5xl">{brand}</p>
        <span className="mx-auto mt-6 block h-1 w-14 rounded-full bg-primary" />
      </div>
    </div>
    <div className="relative h-full w-full">{children}</div>
  </div>
);

export default ArtworkGuard;