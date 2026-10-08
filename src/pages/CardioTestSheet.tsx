import { useParams } from "react-router-dom";
import { STOP_CRITERIA, TEST_INFO, type FunctionalTestType } from "@/lib/cardioFunctionalTests";

const STEPS: Record<FunctionalTestType, string[]> = {
  tsl1: ["Sente-se no meio da cadeira, pés apoiados e braços cruzados no peito.", "Ao sinal, levante-se totalmente e sente-se de novo, o mais rápido que conseguir com segurança.", "Conte as repetições completas em 1 minuto. Pode parar para descansar, o tempo continua."],
  tc6m: ["Caminhe ida e volta no corredor de 30 m o mais longe possível em 6 minutos, sem correr.", "Pode diminuir o ritmo ou parar; volte a caminhar assim que conseguir.", "A cada minuto o avaliador informa o tempo restante com frases padronizadas."],
  td6m: ["Fique de frente para o degrau de 20 cm.", "Suba e desça o degrau o maior número de vezes possível em 6 minutos, no seu ritmo.", "Pode alternar a perna e usar apoio se necessário; o avaliador conta as subidas."],
};

const CardioTestSheet = () => {
  const { type } = useParams();
  const t = (type && type in TEST_INFO ? type : "tsl1") as FunctionalTestType;
  const info = TEST_INFO[t];
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 text-foreground">
      <h1 className="text-2xl font-bold">{info.label}</h1>
      <p className="text-sm text-muted-foreground">{info.setup}</p>
      <section className="space-y-2">
        <h2 className="font-semibold">Como fazer</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{STEPS[t].map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Antes, no final e 1 minuto depois, registre</h2>
        <p className="text-sm">FC e SpO₂ (oxímetro ou monitor cardíaco), falta de ar (0–10) e cansaço nas pernas (0–10).</p>
      </section>
      <section className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="font-semibold">Pare imediatamente se houver</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{STOP_CRITERIA.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Faça o teste apenas com orientação e supervisão do seu fisioterapeuta.</p>
      </section>
    </main>
  );
};

export default CardioTestSheet;
