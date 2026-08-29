import { it } from "vitest";
import { ALIVIA_AUDIENCES } from "@/pages/studio-pro/audiences";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { readsWell } from "@/pages/studio/grammar";
const kit = { name: "Aliv.iA", niche: "fisioterapia", tone: "próximo e técnico", description: "", keywords: [] };
it("dbg", () => {
  const c = buildSegmentContent({ kit, audiences: ALIVIA_AUDIENCES, segment: "paciente-60-mais", angle: "dor" });
  console.log(c.headlines.slice(0,6).map(h=>`${h.strong} ${h.rest}`));
  for (const t of ["Geração 60+: a dor que volta sempre não precisa ser a sua rotina.","Geração 60+: dor que volta sempre não precisa ser a sua rotina."]) console.log(t, readsWell(t));
});
