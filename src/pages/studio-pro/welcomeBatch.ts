/**
 * LOTE DE BOAS-VINDAS (primeiro lote por nossa conta)
 *
 * Regra de negócio: assim que a marca/kit está configurado, a aba de geração
 * já monta um lote completo SEM debitar cota — e isso é dito na tela, para o
 * cliente perceber o valor no primeiro minuto. A partir do primeiro clique em
 * "Nova versão", cada versão nova custa 1 geração (navegar públicos, objetivos,
 * modelos e formatos continua livre, sempre).
 *
 * Estado local por marca (localStorage): só controla a EXIBIÇÃO do aviso. O
 * débito real continua sendo do servidor (`consume_studio_generation`) — nada
 * aqui concede ou nega cota.
 */

const KEY = "studio.welcomeBatch.v1";

const readAll = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

/** A marca já passou do lote de boas-vindas (já clicou em "Nova versão")? */
export const welcomeBatchUsed = (brandId: string): boolean => readAll().includes(brandId);

/** Marca o lote de boas-vindas como consumido — chamado no 1º "Nova versão". */
export const markWelcomeBatchUsed = (brandId: string) => {
  if (!brandId || welcomeBatchUsed(brandId)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...readAll(), brandId].slice(-200)));
  } catch {
    /* localStorage indisponível: o aviso volta, o débito não muda. */
  }
};
