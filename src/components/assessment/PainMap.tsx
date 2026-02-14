import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { regionPaths, type View } from "./painMapData";

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

  const views: { key: View; labelKey: string }[] = [
    { key: "front", labelKey: "painmap.front" },
    { key: "back", labelKey: "painmap.back" },
    { key: "side", labelKey: "painmap.side" },
  ];

  const regions = regionPaths[view];

  const getRegionLabel = (region: { label_pt: string; label_en: string }) =>
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
      <div className="flex justify-center gap-2">
        {views.map((v) => (
          <Button
            key={v.key}
            size="sm"
            variant={view === v.key ? "default" : "outline"}
            onClick={() => setView(v.key)}
            className="rounded-xl"
          >
            {t(v.labelKey)}
          </Button>
        ))}
      </div>

      {/* SVG Body Map */}
      <div className="flex justify-center">
        <div className="relative bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
          <svg
            viewBox="0 0 200 440"
            className="w-full max-w-[280px] h-auto"
            style={{ minHeight: "400px" }}
          >
            {/* Body outline for context */}
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Clickable regions */}
            {Object.entries(regions).map(([id, region]) => {
              const isSelected = selectedRegions.includes(id);
              const isHovered = hoveredRegion === id;
              return (
                <path
                  key={id}
                  d={region.d}
                  fill={
                    isSelected
                      ? "hsl(var(--destructive) / 0.4)"
                      : isHovered
                      ? "hsl(var(--primary) / 0.2)"
                      : "hsl(var(--muted) / 0.5)"
                  }
                  stroke={
                    isSelected
                      ? "hsl(var(--destructive))"
                      : isHovered
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))"
                  }
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => toggleRegion(id)}
                  onMouseEnter={() => setHoveredRegion(id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Hover tooltip */}
            {hoveredRegion && regions[hoveredRegion] && (
              <g>
                <rect x="10" y="415" width="180" height="22" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                <text x="100" y="430" textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))" fontFamily="system-ui">
                  {getRegionLabel(regions[hoveredRegion])}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Selected regions chips */}
      {selectedRegions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedRegions.map((id) => {
            const allRegions = { ...regionPaths.front, ...regionPaths.back, ...regionPaths.side };
            const region = allRegions[id];
            return region ? (
              <span
                key={id}
                onClick={() => toggleRegion(id)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium cursor-pointer hover:bg-destructive/20 transition-colors"
              >
                {getRegionLabel(region)} ×
              </span>
            ) : null;
          })}
        </div>
      )}
    </motion.div>
  );
};

export default PainMap;
