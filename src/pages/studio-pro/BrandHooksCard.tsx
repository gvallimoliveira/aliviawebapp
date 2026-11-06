import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  HOOK_HEADLINE_MAX,
  composeHooks,
  tightenHook,
  type StudioHook,
} from "@/pages/studio/hooks";
import { curatedHooksFor } from "@/pages/studio/hookLibrary";
import {
  addCustomHook,
  applyHookPrefs,
  clearHookPrefs,
  hookKey,
  readCustomHooks,
  readHookPrefs,
  removeCustomHook,
  saveHookPrefs,
} from "@/pages/studio/hookStore";
import type { BrandAudience } from "./audiences";
import { buildBrandDna } from "./brandDnaKit";
import { commercialAudienceHooks } from "./commercialPriority";


/**
 * EDITOR DA BIBLIOTECA DE GANCHOS (por marca)
 *
 * Revisar, ordenar e ativar/desativar ganchos sem tocar no código. O acervo em
 * si continua vindo de `hookLibrary.ts` (curado) + `hooks.ts` (mecanismo sobre
 * o kit da marca); aqui só se edita a CURADORIA, guardada por marca e por voz.
 *
 * Marcas com voz de paciente (Aliv.iA) ganham duas listas independentes.
 */

export type BrandHooksIngredients = {
  niche?: string;
  audience?: string;
  pain?: string;
  desire?: string;
  offer?: string;
  belief?: string;
  cta?: string;
  audiences?: BrandAudience[];
  briefAnswers?: unknown;
  description?: string;
  positioning?: string;
};

const buildLibrary = (
  brandName: string,
  ing: BrandHooksIngredients,
  patientVoice: boolean,
  custom: StudioHook[],
): StudioHook[] =>
  [
    ...custom,
    ...curatedHooksFor(brandName, { patientVoice }),
    ...(ing.audiences?.length ? commercialAudienceHooks(ing.audiences, buildBrandDna({ ...ing, briefAnswers: ing.briefAnswers })) : composeHooks({ brand: brandName, ...ing })),
  ]
    .map(tightenHook)
    .filter((hook, i, all) => all.findIndex((h) => h.strong === hook.strong) === i);

const HookList = ({
  brandName,
  ingredients,
  patientVoice,
}: {
  brandName: string;
  ingredients: BrandHooksIngredients;
  patientVoice: boolean;
}) => {
  const { toast } = useToast();
  const [custom, setCustom] = useState<StudioHook[]>(() =>
    readCustomHooks(brandName, { patientVoice }),
  );
  const customKeys = useMemo(() => new Set(custom.map(hookKey)), [custom]);
  const library = useMemo(
    () => buildLibrary(brandName, ingredients, patientVoice, custom),
    [brandName, ingredients, patientVoice, custom],
  );

  // Estado inicial: curadoria salva aplicada ao acervo atual.
  const [order, setOrder] = useState<StudioHook[]>(() => {
    const active = applyHookPrefs(brandName, library, { patientVoice });
    const rest = library.filter((h) => !active.some((a) => hookKey(a) === hookKey(h)));
    return [...active, ...rest];
  });
  const [off, setOff] = useState<Set<string>>(
    () => new Set(readHookPrefs(brandName, { patientVoice }).off),
  );

  const [draft, setDraft] = useState({ strong: "", sub: "", cta: "" });

  useEffect(() => {
    const active = applyHookPrefs(brandName, library, { patientVoice });
    const rest = library.filter((hook) => !active.some((item) => hookKey(item) === hookKey(hook)));
    setOrder([...active, ...rest]);
  }, [brandName, library, patientVoice]);

  const persist = (nextOrder: StudioHook[], nextOff: Set<string>) => {
    saveHookPrefs(
      brandName,
      { off: [...nextOff], order: nextOrder.map(hookKey) },
      { patientVoice },
    );
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    persist(next, off);
  };

  const toggle = (hook: StudioHook, active: boolean) => {
    const next = new Set(off);
    if (active) next.delete(hookKey(hook));
    else next.add(hookKey(hook));
    setOff(next);
    persist(order, next);
  };

  const addHook = () => {
    const strong = draft.strong.trim();
    if (strong.length < 12) {
      toast({
        title: "Gancho muito curto",
        description: "Escreva a frase de impacto com pelo menos 12 caracteres.",
        variant: "destructive",
      });
      return;
    }
    const created = tightenHook({
      hook: "Gancho da marca",
      strong,
      rest: /[.!?…]$/.test(strong) ? "" : ".",
      sub: draft.sub.trim() || undefined,
      cta: draft.cta.trim() || undefined,
    });
    const nextCustom = addCustomHook(brandName, created, { patientVoice });
    setCustom(nextCustom);
    setOrder((prev) => [created, ...prev.filter((h) => hookKey(h) !== hookKey(created))]);
    setDraft({ strong: "", sub: "", cta: "" });
    toast({ title: "Gancho adicionado", description: "Já entra nas próximas gerações desta marca." });
  };

  const deleteHook = (hook: StudioHook) => {
    const key = hookKey(hook);
    setCustom(removeCustomHook(brandName, key, { patientVoice }));
    setOrder((prev) => prev.filter((h) => hookKey(h) !== key));
    toast({ title: "Gancho manual removido" });
  };

  const reset = () => {
    clearHookPrefs(brandName, { patientVoice });
    setOrder(library);
    setOff(new Set());
    toast({ title: "Biblioteca restaurada", description: "Voltou à ordem original, todos ativos." });
  };

  const activeCount = order.filter((h) => !off.has(hookKey(h))).length;


  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {activeCount} de {order.length} ganchos ativos. A ordem define a prioridade nas artes.
        </p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restaurar original
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-3">
        <p className="text-xs font-semibold text-foreground">Adicionar gancho manualmente</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Frase de impacto curta (até {HOOK_HEADLINE_MAX} caracteres). O que passar disso desce
          automaticamente para o apoio.
        </p>
        <div className="mt-2 space-y-2">
          <Input
            value={draft.strong}
            maxLength={160}
            placeholder="Frase de impacto (ex.: Dor não é sinal para parar)"
            onChange={(e) => setDraft((d) => ({ ...d, strong: e.target.value }))}
          />
          <Input
            value={draft.sub}
            maxLength={160}
            placeholder="Apoio (opcional)"
            onChange={(e) => setDraft((d) => ({ ...d, sub: e.target.value }))}
          />
          <Input
            value={draft.cta}
            maxLength={80}
            placeholder="Convite / CTA (opcional)"
            onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))}
          />
          <Button type="button" size="sm" className="rounded-full" onClick={addHook}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar à biblioteca
          </Button>
        </div>
      </div>



      <ol className="space-y-2">
        {order.map((hook, i) => {
          const key = hookKey(hook);
          const active = !off.has(key);
          return (
            <li
              key={`${key}-${i}`}
              className={`rounded-2xl border p-3 transition ${
                active ? "border-border bg-card" : "border-dashed border-border bg-muted/40 opacity-70"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1 min-w-6 text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {hook.hook}
                    {customKeys.has(key) ? " • manual" : ""}
                  </p>
                  <p className="break-words text-sm font-semibold text-foreground">
                    {hook.strong}
                    {hook.rest ? <span className="font-normal">{hook.rest}</span> : null}
                  </p>

                  {hook.sub ? (
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">{hook.sub}</p>
                  ) : null}
                  {hook.cta ? (
                    <p className="mt-1 break-words text-xs font-medium text-primary">{hook.cta}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Subir gancho ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Descer gancho ${i + 1}`}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Switch
                    checked={active}
                    aria-label={`Ativar gancho ${i + 1}`}
                    onCheckedChange={(value) => toggle(hook, value)}
                  />
                  {customKeys.has(key) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label={`Apagar gancho manual ${i + 1}`}
                      onClick={() => deleteHook(hook)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}

                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const BrandHooksCard = ({
  brandName,
  ingredients = {},
}: {
  brandName: string;
  ingredients?: BrandHooksIngredients;
}) => {
  // Marca com voz de paciente (Aliv.iA): duas listas independentes.
  const hasPatientVoice = useMemo(() => {
    const pro = curatedHooksFor(brandName);
    const patient = curatedHooksFor(brandName, { patientVoice: true });
    return patient.length > 0 && patient !== pro;
  }, [brandName]);
  const [voice, setVoice] = useState<"pro" | "paciente">("pro");

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-3">
      <p className="text-sm font-semibold text-foreground">Biblioteca de ganchos</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Frases de parada de scroll usadas pelo modelo <strong>Ganchos</strong>. Revise, reordene e
        desligue o que não combina com a marca — vale para as próximas gerações.
      </p>

      {hasPatientVoice && (
        <div className="mt-3 flex gap-2">
          {(["pro", "paciente"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={voice === v ? "default" : "secondary"}
              className="rounded-full"
              onClick={() => setVoice(v)}
            >
              {v === "pro" ? "Profissional / clínica" : "Paciente"}
            </Button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <HookList
          key={`${brandName}:${voice}`}
          brandName={brandName}
          ingredients={ingredients}
          patientVoice={hasPatientVoice && voice === "paciente"}
        />
      </div>
    </div>
  );
};

export default BrandHooksCard;
