/** TEMPORÁRIO — página de QA visual dos novos blocos. Remover após conferência. */
import { createRng } from "./rng";
import { WORLDS } from "./content";
import { buildCoverage } from "./coverage";
import { createPicker } from "./picker";
import { personaForSeed } from "./personas";
import { STUDIO_BLOCKS } from "@/studio-core/blocks";
import type { BlockKind } from "./composePage";

const KINDS: BlockKind[] = ["shrink", "elegantAsk", "pullQuote", "percent"];

const QaBlocks = () => {
  const content = WORLDS.pro;
  const coverage = buildCoverage("pro", content, {});
  const picker = createPicker(coverage, () => undefined);
  const persona = personaForSeed("qa");

  return (
    <div className="bg-neutral-900 p-6">
      {KINDS.map((kind) =>
        [0, 1, 2, 3].map((t) => {
          const Block = STUDIO_BLOCKS[kind];
          return (
            <div key={`${kind}-${t}`} className="mx-auto mb-6" style={{ width: 480, height: 600 }}>
              <p className="mb-1 text-xs text-white">{`${kind} · tratamento ${t}`}</p>
              <div style={{ width: 480, height: 600 }}>
                <Block
                  content={content}
                  rng={createRng(`qa:${kind}:${t}`)}
                  treatment={t}
                  format="4x5"
                  picker={picker}
                  persona={persona}
                  photos={[]}
                />
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
};

export default QaBlocks;
