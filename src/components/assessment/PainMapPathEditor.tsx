import { useState, useCallback, useRef } from "react";
import { type ClickableRegion } from "./painMapData";

/**
 * Parses a simplified SVG path `d` string into an array of command objects.
 * Supports M, L, C, Z (absolute only).
 */
interface PathCommand {
  type: "M" | "L" | "C" | "Z";
  /** For M/L: [x, y]; For C: [cx1, cy1, cx2, cy2, x, y] */
  coords: number[];
}

function parsePath(d: string): PathCommand[] {
  const cmds: PathCommand[] = [];
  // Match each command letter followed by its numbers
  const regex = /([MLCZ])\s*([-\d.,\s]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(d)) !== null) {
    const type = match[1].toUpperCase() as PathCommand["type"];
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    cmds.push({ type, coords: nums });
  }
  return cmds;
}

function buildPath(cmds: PathCommand[]): string {
  return cmds
    .map((c) => {
      if (c.type === "Z") return "Z";
      const pairs: string[] = [];
      for (let i = 0; i < c.coords.length; i += 2) {
        pairs.push(`${Math.round(c.coords[i])},${Math.round(c.coords[i + 1])}`);
      }
      return `${c.type}${pairs.join(" ")}`;
    })
    .join(" ");
}

interface DragPoint {
  regionIdx: number;
  cmdIdx: number;
  coordIdx: number; // index into coords array (the x of the pair)
  x: number;
  y: number;
}

function extractPoints(regions: ClickableRegion[]): DragPoint[] {
  const points: DragPoint[] = [];
  regions.forEach((region, regionIdx) => {
    const cmds = parsePath(region.d);
    cmds.forEach((cmd, cmdIdx) => {
      if (cmd.type === "Z") return;
      // Each pair of coords is a point
      for (let i = 0; i < cmd.coords.length; i += 2) {
        points.push({
          regionIdx,
          cmdIdx,
          coordIdx: i,
          x: cmd.coords[i],
          y: cmd.coords[i + 1],
        });
      }
    });
  });
  return points;
}

interface PainMapPathEditorProps {
  regions: ClickableRegion[];
  onRegionsUpdate: (updated: ClickableRegion[]) => void;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
}

const PainMapPathEditor = ({
  regions,
  onRegionsUpdate,
  selectedRegionId,
  onSelectRegion,
}: PainMapPathEditorProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragPoint | null>(null);

  const getSVGCoords = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (point: DragPoint, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDragging(point);
      onSelectRegion(regions[point.regionIdx].id);
    },
    [regions, onSelectRegion]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const { x, y } = getSVGCoords(e);
      const updated = [...regions];
      const region = { ...updated[dragging.regionIdx] };
      const cmds = parsePath(region.d);
      cmds[dragging.cmdIdx].coords[dragging.coordIdx] = x;
      cmds[dragging.cmdIdx].coords[dragging.coordIdx + 1] = y;
      region.d = buildPath(cmds);
      updated[dragging.regionIdx] = region;
      onRegionsUpdate(updated);
    },
    [dragging, getSVGCoords, regions, onRegionsUpdate]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const points = extractPoints(regions);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 440"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      style={{ cursor: dragging ? "grabbing" : "default" }}
    >
      {/* Region outlines */}
      {regions.map((region) => {
        const isActive = selectedRegionId === region.id;
        return (
          <path
            key={region.id}
            d={region.d}
            fill={isActive ? "hsla(170, 60%, 45%, 0.12)" : "transparent"}
            stroke={isActive ? "hsla(170, 80%, 50%, 0.9)" : "hsla(0, 0%, 100%, 0.4)"}
            strokeWidth={isActive ? 1.5 : 0.5}
            strokeLinejoin="round"
            className="cursor-pointer"
            onClick={() => onSelectRegion(region.id === selectedRegionId ? null : region.id)}
          />
        );
      })}

      {/* Draggable control points – only for selected region */}
      {points
        .filter((p) => regions[p.regionIdx].id === selectedRegionId)
        .map((point, i) => (
          <circle
            key={`${point.regionIdx}-${point.cmdIdx}-${point.coordIdx}-${i}`}
            cx={point.x}
            cy={point.y}
            r={3}
            fill="hsla(45, 100%, 60%, 0.9)"
            stroke="hsla(0, 0%, 0%, 0.6)"
            strokeWidth={0.5}
            className="cursor-grab"
            style={{ cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={(e) => handlePointerDown(point, e)}
          />
        ))}
    </svg>
  );
};

export default PainMapPathEditor;
export { buildPath, parsePath };
