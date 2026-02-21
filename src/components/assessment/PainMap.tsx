import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { regionPaths, bodyOutlinePaths, type View } from "./painMapData";

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
  const outlines = bodyOutlinePaths[view];

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
            viewBox="0 0 184 420"
            className="w-full max-w-[280px] h-auto"
            style={{ minHeight: "420px" }}
          >
            {/* Anatomical outline — decorative strokes */}
            {outlines.map((d, i) => (
              <path
                key={`outline-${i}`}
                d={d}
                fill="none"
                stroke="hsl(var(--foreground) / 0.25)"
                strokeWidth="1"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {/* Clickable regions — transparent until hovered/selected */}
            {Object.entries(regions).map(([id, region]) => {
              const isSelected = selectedRegions.includes(id);
              const isHovered = hoveredRegion === id;
              return (
                <path
                  key={id}
                  d={region.d}
                  fill={
                    isSelected
                      ? "hsl(var(--destructive) / 0.35)"
                      : isHovered
                      ? "hsl(var(--primary) / 0.15)"
                      : "transparent"
                  }
                  stroke={
                    isSelected
                      ? "hsl(var(--destructive))"
                      : isHovered
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border) / 0.3)"
                  }
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
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
                <rect x="10" y="406" width="164" height="20" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.5" />
                <text x="92" y="419" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" fontFamily="system-ui">
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
