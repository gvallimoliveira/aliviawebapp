import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { regionsByView, getAllRegions, type View } from "./painMapData";
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
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
}

const PainMap = ({ selectedRegions, onRegionsChange }: PainMapProps) => {
  const { t, language } = useLanguage();
  const [view, setView] = useState<View>("front");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

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

  const regions = regionsByView[view];
  const allRegions = getAllRegions();

  const getLabel = (region: { label_pt: string; label_en: string }) =>
    language === "pt" ? region.label_pt : region.label_en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{t("painmap.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("painmap.subtitle")}</p>
      </div>

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
      </div>

      {/* Body Map with SVG overlay */}
      <div className="flex justify-center">
        <div className="relative bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
          style={{ width: "280px", height: "560px" }}
        >
          {/* Background anatomical image */}
          <img
            src={viewImages[view]}
            alt={`Body map - ${view}`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* SVG overlay with precise clickable regions */}
          <svg
            viewBox="0 0 200 440"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
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
                      ? "hsla(170, 60%, 45%, 0.2)"
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

            {/* Hover tooltip */}
            {hoveredRegion && (() => {
              const region = regions.find((r) => r.id === hoveredRegion);
              if (!region) return null;
              return (
                <g>
                  <rect x="20" y="420" width="160" height="18" rx="6"
                    fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.5" />
                  <text x="100" y="432" textAnchor="middle" fontSize="9"
                    fill="hsl(var(--foreground))" fontFamily="system-ui">
                    {getLabel(region)}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

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
