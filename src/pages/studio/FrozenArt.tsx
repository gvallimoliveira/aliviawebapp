import { memo, type ReactNode } from "react";

/**
 * ARTE CONGELADA (à prova de edição manual de texto)
 *
 * A edição de texto acontece no próprio desenho: o `contentEditable` troca,
 * apaga e recompõe nós que o React acredita ainda estar no lugar. Quando a tela
 * ao redor mudava de estado (salvar, aprovar, inverter cores, abrir a leitura),
 * o React tentava atualizar aqueles nós e quebrava a leva inteira
 * ("o objeto não pode ser encontrado aqui").
 *
 * Aqui o desenho passa a ser montado UMA vez por chave: nada do lado de fora
 * força uma atualização dentro da arte. Toda mudança real da arte (nova versão,
 * outro formato, desfazer, reaplicar ajuste) troca a `key` e monta de novo,
 * o que é sempre seguro.
 */
const FrozenArt = memo(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  () => true,
);

FrozenArt.displayName = "FrozenArt";

export default FrozenArt;
