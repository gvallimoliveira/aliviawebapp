import { it } from "vitest";
import { readsWell } from "@/pages/studio/grammar";
it("dbg", () => {
  for (const t of [
    "Geração 60+ : medo de cair não precisa ser a sua rotina.",
    "Geração : medo de cair não precisa ser a sua rotina.",
    "Geração 60 : medo de cair não precisa ser a sua rotina.",
    "Geração 60+: medo de cair não precisa ser a sua rotina.",
    "Menos improviso. Mais plano .",
  ]) console.log(readsWell(t), t);
});
