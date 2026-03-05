import { regionsByView, type View } from "./painMapData";
import bodyFront from "@/assets/body-front.jpg";
import bodyBack from "@/assets/body-back.jpg";
import bodyLeft from "@/assets/body-left.jpg";
import bodyRight from "@/assets/body-right.jpg";

interface PainMapViewProps {
  painRegions: string[];
  compact?: boolean;
}

const viewImages: Record<View, string> = {
  front: bodyFront,
  back: bodyBack,
  left: bodyLeft,
  right: bodyRight,
};

const viewLabels: Record<View, string> = {
  front: "Frontal",
  back: "Posterior",
  left: "Lat. Esq.",
  right: "Lat. Dir.",
};

const PainMapView = ({ painRegions, compact = false }: PainMapViewProps) => {
  const activeViews = (["front", "back", "left", "right"] as View[]).filter(view => {
    const regions = regionsByView[view];
    return regions.some(r => painRegions.includes(r.id));
  });

  if (activeViews.length === 0) return null;

  const size = compact ? "w-20" : "w-28";

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {activeViews.map(view => {
        const regions = regionsByView[view];
        const selected = regions.filter(r => painRegions.includes(r.id));

        return (
          <div key={view} className="flex flex-col items-center gap-1">
            <div className={`${size} relative`}>
              <svg viewBox="0 0 200 440" className="w-full h-auto">
                <image href={viewImages[view]} x="0" y="0" width="200" height="440" preserveAspectRatio="xMidYMid slice" />
                {selected.map(r => (
                  <path
                    key={r.id}
                    d={r.d}
                    fill="rgba(220, 50, 50, 0.45)"
                    stroke="rgba(200, 40, 40, 0.8)"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
            <span className="text-[10px] text-muted-foreground">{viewLabels[view]}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PainMapView;
