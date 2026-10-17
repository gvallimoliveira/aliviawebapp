import { useState, useCallback } from "react";
import { purposeCopy } from "./AssessmentPurposeFields";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regionsByView, getAllRegions, type View, type ClickableRegion } from "./painMapData";
import PainMapPathEditor from "./PainMapPathEditor";
import { ENABLE_PAINMAP_V2 } from "@/lib/featureFlags";
import { computePainExtent } from "@/lib/painExtent";
import bodyFront from "@/assets/body-front.jpg";
import bodyBack from "@/assets/body-back.jpg";
import bodyLeft from "@/assets/body-left.jpg";
import bodyRight from "@/assets/body-right.jpg";

const viewImages: Record<View, string> = {
  front: bodyFront,
  back: bodyBack,
  left: bodyLeft,
  right: bodyRight,
};

interface PainMapProps {
  purpose?: "pain" | "history";
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
}

const PainMap = ({ selectedRegions, onRegionsChange, purpose = "pain" }: PainMapProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.email === "gvallimoliveira@gmail.com";
  const [view, setView] = useState<View>("front");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [editedRegions, setEditedRegions] = useState<Record<View, ClickableRegion[]>>({ ...regionsByView });
  const [selectedEditRegion, setSelectedEditRegion] = useState<string | null>(null);

  const toggleRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      onRegionsChange(selectedRegions.filter((r) => r !== regionId));
    } else {
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  const views: { key: View; label_pt: string; label_en: string }[] = [
    { key: "front", label_pt: "Frontal", label_en: "Front" },
    { key: "back", label_pt: "Posterior", label_en: "Back" },
    { key: "left", label_pt: "Lat. Esquerda", label_en: "Left Side" },
    { key: "right", label_pt: "Lat. Direita", label_en: "Right Side" },
  ];

  const regions = debugMode ? editedRegions[view] : regionsByView[view];
  const allRegions = getAllRegions();

  const handleEditRegionsUpdate = useCallback(
    (updated: ClickableRegion[]) => {
      setEditedRegions((prev) => ({ ...prev, [view]: updated }));
    },
    [view]
  );

  const exportPaths = useCallback(async () => {
    const regs = editedRegions[view];
    try {
      const { error } = await supabase
        .from("pain_map_paths" as any)
        .upsert(
          { view_name: view, regions: JSON.parse(JSON.stringify(regs)), updated_at: new Date().toISOString(), updated_by: user?.id } as any,
          { onConflict: "view_name" }
        );
      if (error) throw error;
      toast.success(`Vista "${view}" salva com sucesso! Peça ao Lovable para atualizar o painMapData.ts.`);
    } catch (err: any) {
      console.error("Erro ao salvar paths:", err);
      toast.error("Erro ao salvar: " + err.message);
    }
  }, [editedRegions, view, user?.id]);

  const getLabel = (region: { label_pt: string; label_en: string }) =>
    language === "pt" ? region.label_pt : region.label_en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{purpose === "history" ? purposeCopy[language].map : t("painmap.title")}</h3>
        <p className="text-sm text-muted-foreground">{purpose === "history" ? purposeCopy[language].mapHint : t("painmap.subtitle")}</p>
      </div>

      {/* Focus reminder */}
      {purpose === "pain" && <div className="mx-auto max-w-md text-[11px] leading-snug rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/15 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 px-3 py-2 text-center">
        {language === "pt"
          ? "Selecione apenas as regiões da(s) queixa(s) atual(is). Evite marcar dores antigas sem relação."
          : language === "es"
          ? "Selecciona solo las regiones de tu(s) queja(s) actual(es). Evita marcar dolores antiguos sin relación."
          : "Select only the regions of your current complaint(s). Avoid marking old, unrelated pains."}
      </div>}

      {/* View toggle */}
      <div className="flex justify-center gap-2 flex-wrap">
        {views.map((v) => (
          <Button
            key={v.key}
            size="sm"
            variant={view === v.key ? "default" : "outline"}
            onClick={() => setView(v.key)}
            className="rounded-xl text-xs"
          >
            {language === "pt" ? v.label_pt : v.label_en}
          </Button>
        ))}
        {isAdmin && (
          <Button
            size="sm"
            variant={debugMode ? "destructive" : "ghost"}
            onClick={() => setDebugMode(!debugMode)}
            className="rounded-xl text-xs"
          >
            {debugMode ? "✏️ Editor ON" : "🔧 Debug"}
          </Button>
        )}
      </div>

      {/* Debug export button */}
      {debugMode && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={exportPaths} className="rounded-xl text-xs">
            💾 Salvar Vista ({view})
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            Clique numa região → arraste os pontos → salve
          </p>
        </div>
      )}

      {/* Body Map with SVG overlay */}
      <div className="flex justify-center">
        {/*
          Container uses the same aspect ratio as the SVG viewBox (200:440)
          so the image (object-fill) and SVG overlay are perfectly aligned.
        */}
        <div
          className="relative bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
          style={{ width: "260px", aspectRatio: "200 / 440" }}
        >
          {/* Background anatomical image – stretched to fill container */}
          <img
            src={viewImages[view]}
            alt={`Body map - ${view}`}
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            style={{ objectFit: "fill" }}
            draggable={false}
          />

          {debugMode ? (
            <PainMapPathEditor
              regions={editedRegions[view]}
              onRegionsUpdate={handleEditRegionsUpdate}
              selectedRegionId={selectedEditRegion}
              onSelectRegion={setSelectedEditRegion}
            />
          ) : (
            <svg
              viewBox="0 0 200 440"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              {regions.map((region) => {
                const isSelected = selectedRegions.includes(region.id);
                const isHovered = hoveredRegion === region.id;

                return (
                  <path
                    key={region.id}
                    d={region.d}
                    fill={
                      isSelected
                        ? "hsla(0, 80%, 55%, 0.35)"
                        : isHovered
                        ? "hsla(170, 60%, 45%, 0.25)"
                        : "transparent"
                    }
                    stroke={
                      isSelected
                        ? "hsla(0, 80%, 55%, 0.7)"
                        : isHovered
                        ? "hsla(170, 60%, 45%, 0.5)"
                        : "transparent"
                    }
                    strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => toggleRegion(region.id)}
                    onMouseEnter={() => setHoveredRegion(region.id)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}

              {hoveredRegion && (() => {
                const region = regions.find((r) => r.id === hoveredRegion);
                if (!region) return null;
                return (
                  <g>
                    <rect x="20" y="422" width="160" height="16" rx="6"
                      fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.5" />
                    <text x="100" y="433" textAnchor="middle" fontSize="8"
                      fill="hsl(var(--foreground))" fontFamily="system-ui">
                      {getLabel(region)}
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>
      </div>

      {/* Passo C2 — contador + extensão estimada de dor (sem lista de regiões) */}
      {purpose === "pain" && ENABLE_PAINMAP_V2 && !debugMode && (
        <div className="mx-auto max-w-md">
          {(() => {

            const extent = computePainExtent(selectedRegions);
            if (extent.regionCount === 0) return null;
            const bandLabel = {
              none: { pt: "—", en: "—", es: "—" },
              localized: { pt: "localizada", en: "localized", es: "localizada" },
              regional: { pt: "regional", en: "regional", es: "regional" },
              widespread: { pt: "difusa / múltiplos sítios", en: "widespread / multisite", es: "difusa / múltiples sitios" },
            }[extent.band];
            const lang = language === "pt" ? "pt" : language === "es" ? "es" : "en";
            return (
              <p className="text-center text-[11px] text-muted-foreground">
                {lang === "pt"
                  ? `${extent.regionCount} região(ões) · ${extent.segmentCount} segmento(s) · ~${extent.surfacePercent}% da superfície corporal · `
                  : lang === "es"
                  ? `${extent.regionCount} región(es) · ${extent.segmentCount} segmento(s) · ~${extent.surfacePercent}% de la superficie corporal · `
                  : `${extent.regionCount} region(s) · ${extent.segmentCount} segment(s) · ~${extent.surfacePercent}% of body surface · `}
                <span className="font-medium text-foreground">{bandLabel[lang]}</span>
              </p>
            );
          })()}
        </div>
      )}

      {/* Selected regions chips */}
      {selectedRegions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedRegions.map((id) => {
            const region = allRegions[id];
            return region ? (
              <span
                key={id}
                onClick={() => toggleRegion(id)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium cursor-pointer hover:bg-destructive/20 transition-colors"
              >
                {getLabel(region)} ×
              </span>
            ) : null;
          })}
        </div>
      )}
    </motion.div>
  );
};

export default PainMap;
