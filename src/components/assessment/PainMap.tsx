import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { regionsByView, getAllRegions, viewColumns, type View } from "./painMapData";
import bodyMapImage from "@/assets/body-map.jpg";

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
  const [colStart] = viewColumns[view];

  const getLabel = (region: { label_pt: string; label_en: string }) =>
    language === "pt" ? region.label_pt : region.label_en;

  // Image has 4 figures side by side. We use background-position to show only one column.
  // colStart: 0=front, 0.25=back, 0.5=left, 0.75=right
  // background-position-x: percentage maps source to container
  // With background-size: 400% auto, each column fills the container width
  const bgPositionX = `${(colStart / 0.75) * 100}%`;

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

      {/* Body Map with clickable overlay */}
      <div className="flex justify-center">
        <div
          className="relative bg-card rounded-2xl border border-border/50 shadow-sm"
          style={{
            width: "280px",
            height: "560px",
            backgroundImage: `url(${bodyMapImage})`,
            backgroundSize: "400% 100%",
            backgroundPosition: `${bgPositionX} 0%`,
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Clickable regions overlay */}
          {regions.map((region) => {
            const [x, y, w, h] = region.area;
            const isSelected = selectedRegions.includes(region.id);
            const isHovered = hoveredRegion === region.id;

            return (
              <div
                key={region.id}
                className="absolute cursor-pointer transition-all duration-200 rounded-sm"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  backgroundColor: isSelected
                    ? "hsla(0, 80%, 55%, 0.35)"
                    : isHovered
                    ? "hsla(var(--primary), 0.15)"
                    : "transparent",
                  border: isSelected
                    ? "2px solid hsla(0, 80%, 55%, 0.7)"
                    : isHovered
                    ? "1.5px solid hsla(var(--primary), 0.4)"
                    : "1px solid transparent",
                }}
                onClick={() => toggleRegion(region.id)}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
                title={getLabel(region)}
              />
            );
          })}

          {/* Hover tooltip */}
          {hoveredRegion && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-lg shadow-md text-xs text-foreground whitespace-nowrap pointer-events-none z-10">
              {getLabel(regions.find((r) => r.id === hoveredRegion)!)}
            </div>
          )}
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
