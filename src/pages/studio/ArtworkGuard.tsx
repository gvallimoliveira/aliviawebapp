import { Children, type ReactNode } from "react";

/**
 * Última barreira contra arte vazia.
 *
 * REGRA DURA: o fallback textual só aparece quando NÃO existe composição
 * renderizável. Ele nunca pode ficar atrás da arte real — blocos com fundo
 * translúcido deixavam o texto "Conteúdo da marca" e o nome da marca vazarem
 * por baixo da peça.
 */
const isEmpty = (node: ReactNode): boolean => {
  if (node === null || node === undefined || node === false || node === true) return true;
  if (typeof node === "string") return node.trim().length === 0;
  if (typeof node === "number") return false;
  const list = Children.toArray(node);
  if (!list.length) return true;
  return list.every((child) => isEmpty(child as ReactNode));
};

const ArtworkGuard = ({ brand, children }: { brand: string; children: ReactNode }) => {
  if (isEmpty(children)) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 flex items-center justify-center px-[12%] text-center">
          <div>
            <p className="break-words text-3xl font-bold leading-[1.12] text-foreground md:text-5xl">{brand}</p>
            <span className="mx-auto mt-6 block h-1 w-14 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  return <div className="relative h-full w-full overflow-hidden bg-background">{children}</div>;
};

export default ArtworkGuard;
