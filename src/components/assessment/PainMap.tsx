import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

type View = "front" | "back" | "side";

interface PainMapProps {
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
}

const regionPaths: Record<View, Record<string, { d: string; label_pt: string; label_en: string }>> = {
  front: {
    head: {
      d: "M145,30 C145,15 155,8 165,8 C175,8 185,15 185,30 C185,45 175,55 165,55 C155,55 145,45 145,30Z",
      label_pt: "Cabeça", label_en: "Head",
    },
    neck_front: {
      d: "M155,55 L175,55 L178,75 L152,75Z",
      label_pt: "Cervical", label_en: "Neck",
    },
    right_shoulder: {
      d: "M120,80 L152,75 L152,100 L125,105 C118,95 118,88 120,80Z",
      label_pt: "Ombro Direito", label_en: "Right Shoulder",
    },
    left_shoulder: {
      d: "M178,75 L210,80 C212,88 212,95 205,105 L178,100Z",
      label_pt: "Ombro Esquerdo", label_en: "Left Shoulder",
    },
    chest: {
      d: "M152,75 L178,75 L178,100 L185,130 L145,130 L152,100Z",
      label_pt: "Tórax", label_en: "Chest",
    },
    right_elbow: {
      d: "M110,120 L125,105 L130,140 L115,145Z",
      label_pt: "Cotovelo Direito", label_en: "Right Elbow",
    },
    left_elbow: {
      d: "M205,105 L220,120 L215,145 L200,140Z",
      label_pt: "Cotovelo Esquerdo", label_en: "Left Elbow",
    },
    abdomen: {
      d: "M145,130 L185,130 L183,180 L147,180Z",
      label_pt: "Abdômen", label_en: "Abdomen",
    },
    right_wrist: {
      d: "M100,160 L115,145 L118,175 L103,178Z",
      label_pt: "Punho Direito", label_en: "Right Wrist",
    },
    left_wrist: {
      d: "M215,145 L230,160 L227,178 L212,175Z",
      label_pt: "Punho Esquerdo", label_en: "Left Wrist",
    },
    right_hand: {
      d: "M93,178 L103,178 L105,210 L90,210Z",
      label_pt: "Mão Direita", label_en: "Right Hand",
    },
    left_hand: {
      d: "M227,178 L237,178 L240,210 L225,210Z",
      label_pt: "Mão Esquerda", label_en: "Left Hand",
    },
    right_hip: {
      d: "M147,180 L165,180 L160,210 L140,210Z",
      label_pt: "Quadril Direito", label_en: "Right Hip",
    },
    left_hip: {
      d: "M165,180 L183,180 L190,210 L170,210Z",
      label_pt: "Quadril Esquerdo", label_en: "Left Hip",
    },
    right_knee: {
      d: "M138,260 L162,260 L160,295 L140,295Z",
      label_pt: "Joelho Direito", label_en: "Right Knee",
    },
    left_knee: {
      d: "M168,260 L192,260 L190,295 L170,295Z",
      label_pt: "Joelho Esquerdo", label_en: "Left Knee",
    },
    right_thigh: {
      d: "M140,210 L160,210 L162,260 L138,260Z",
      label_pt: "Coxa Direita", label_en: "Right Thigh",
    },
    left_thigh: {
      d: "M170,210 L190,210 L192,260 L168,260Z",
      label_pt: "Coxa Esquerda", label_en: "Left Thigh",
    },
    right_shin: {
      d: "M140,295 L160,295 L158,350 L142,350Z",
      label_pt: "Canela Direita", label_en: "Right Shin",
    },
    left_shin: {
      d: "M170,295 L190,295 L188,350 L172,350Z",
      label_pt: "Canela Esquerda", label_en: "Left Shin",
    },
    right_ankle: {
      d: "M140,350 L160,350 L158,370 L142,370Z",
      label_pt: "Tornozelo Direito", label_en: "Right Ankle",
    },
    left_ankle: {
      d: "M170,350 L190,350 L188,370 L172,370Z",
      label_pt: "Tornozelo Esquerdo", label_en: "Left Ankle",
    },
    right_foot: {
      d: "M135,370 L160,370 L158,395 L133,392Z",
      label_pt: "Pé Direito", label_en: "Right Foot",
    },
    left_foot: {
      d: "M170,370 L195,370 L197,392 L172,395Z",
      label_pt: "Pé Esquerdo", label_en: "Left Foot",
    },
  },
  back: {
    head_back: {
      d: "M145,30 C145,15 155,8 165,8 C175,8 185,15 185,30 C185,45 175,55 165,55 C155,55 145,45 145,30Z",
      label_pt: "Cabeça (post.)", label_en: "Head (post.)",
    },
    cervical: {
      d: "M155,55 L175,55 L178,75 L152,75Z",
      label_pt: "Cervical", label_en: "Cervical",
    },
    upper_back: {
      d: "M140,75 L190,75 L192,130 L138,130Z",
      label_pt: "Torácica", label_en: "Upper Back",
    },
    lower_back: {
      d: "M142,130 L188,130 L186,180 L144,180Z",
      label_pt: "Lombar", label_en: "Lower Back",
    },
    sacral: {
      d: "M150,180 L180,180 L178,205 L152,205Z",
      label_pt: "Sacral", label_en: "Sacral",
    },
    right_shoulder_back: {
      d: "M115,78 L140,75 L138,110 L120,108Z",
      label_pt: "Ombro Dir. (post.)", label_en: "R. Shoulder (post.)",
    },
    left_shoulder_back: {
      d: "M190,75 L215,78 L210,108 L192,110Z",
      label_pt: "Ombro Esq. (post.)", label_en: "L. Shoulder (post.)",
    },
    right_gluteal: {
      d: "M144,180 L165,180 L162,220 L140,218Z",
      label_pt: "Glúteo Direito", label_en: "Right Gluteal",
    },
    left_gluteal: {
      d: "M165,180 L186,180 L190,218 L168,220Z",
      label_pt: "Glúteo Esquerdo", label_en: "Left Gluteal",
    },
    right_hamstring: {
      d: "M140,218 L162,220 L160,290 L138,288Z",
      label_pt: "Post. Coxa Dir.", label_en: "R. Hamstring",
    },
    left_hamstring: {
      d: "M168,220 L190,218 L192,288 L170,290Z",
      label_pt: "Post. Coxa Esq.", label_en: "L. Hamstring",
    },
    right_calf: {
      d: "M138,290 L160,292 L158,360 L140,358Z",
      label_pt: "Panturrilha Dir.", label_en: "Right Calf",
    },
    left_calf: {
      d: "M170,292 L192,290 L190,358 L172,360Z",
      label_pt: "Panturrilha Esq.", label_en: "Left Calf",
    },
  },
  side: {
    head_side: {
      d: "M155,20 C155,10 165,5 175,10 C185,15 188,30 185,40 C182,50 170,55 162,50 C155,45 152,32 155,20Z",
      label_pt: "Cabeça (lat.)", label_en: "Head (lat.)",
    },
    neck_side: {
      d: "M162,50 L180,48 L182,72 L158,72Z",
      label_pt: "Cervical (lat.)", label_en: "Neck (lat.)",
    },
    shoulder_side: {
      d: "M145,72 L185,72 L190,95 L140,95Z",
      label_pt: "Ombro (lat.)", label_en: "Shoulder (lat.)",
    },
    trunk_side: {
      d: "M148,95 L188,95 L185,185 L150,185Z",
      label_pt: "Tronco (lat.)", label_en: "Trunk (lat.)",
    },
    arm_side: {
      d: "M125,95 L148,95 L142,170 L120,168Z",
      label_pt: "Braço (lat.)", label_en: "Arm (lat.)",
    },
    forearm_side: {
      d: "M118,170 L142,172 L138,230 L115,228Z",
      label_pt: "Antebraço (lat.)", label_en: "Forearm (lat.)",
    },
    hip_side: {
      d: "M150,185 L185,185 L188,220 L148,220Z",
      label_pt: "Quadril (lat.)", label_en: "Hip (lat.)",
    },
    thigh_side: {
      d: "M150,220 L185,220 L182,290 L152,290Z",
      label_pt: "Coxa (lat.)", label_en: "Thigh (lat.)",
    },
    knee_side: {
      d: "M150,290 L184,290 L182,315 L152,315Z",
      label_pt: "Joelho (lat.)", label_en: "Knee (lat.)",
    },
    leg_side: {
      d: "M152,315 L182,315 L180,370 L154,370Z",
      label_pt: "Perna (lat.)", label_en: "Leg (lat.)",
    },
    foot_side: {
      d: "M148,370 L195,370 L198,392 L148,395Z",
      label_pt: "Pé (lat.)", label_en: "Foot (lat.)",
    },
  },
};

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
            viewBox="0 0 330 410"
            className="w-full max-w-[300px] h-auto"
            style={{ minHeight: "380px" }}
          >
            {/* Body outline silhouette */}
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted))" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
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
                      : "hsl(var(--muted) / 0.6)"
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
                />
              );
            })}

            {/* Hover tooltip */}
            {hoveredRegion && regions[hoveredRegion] && (
              <g>
                <rect x="5" y="395" width="320" height="20" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
                <text x="165" y="409" textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))" fontFamily="system-ui">
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
