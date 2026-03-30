import { memo, useMemo } from "react";
import { BBox, ANNOTATION_COLORS, ResizeHandle } from "@/lib/annotation-types";

interface ResizeHandlesProps {
  box: BBox;
  naturalSize: { w: number; h: number };
}

/**
 * Professional resize handles for bounding box editing with:
 * - Clean circular handles at corners and edges
 * - Proper cursor styles for resize directions
 * - Visual feedback on hover/active states
 * - Consistent sizing based on image resolution
 */
export const ResizeHandles = memo(function ResizeHandles({
  box,
  naturalSize,
}: ResizeHandlesProps) {
  const { x1, y1, x2, y2 } = box;

  // Calculate handle size based on image dimensions for consistent appearance
  const handleSize = useMemo(() => {
    const baseSize = Math.min(naturalSize.w, naturalSize.h) / 100;
    return Math.max(5, Math.min(10, baseSize));
  }, [naturalSize]);

  // Calculate all handle positions
  const handles: Array<{
    x: number;
    y: number;
    type: ResizeHandle;
    cursor: string;
  }> = useMemo(() => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    return [
      { x: x1, y: y1, type: "nw" as ResizeHandle, cursor: "nwse-resize" },
      { x: mx, y: y1, type: "n" as ResizeHandle, cursor: "ns-resize" },
      { x: x2, y: y1, type: "ne" as ResizeHandle, cursor: "nesw-resize" },
      { x: x2, y: my, type: "e" as ResizeHandle, cursor: "ew-resize" },
      { x: x2, y: y2, type: "se" as ResizeHandle, cursor: "nwse-resize" },
      { x: mx, y: y2, type: "s" as ResizeHandle, cursor: "ns-resize" },
      { x: x1, y: y2, type: "sw" as ResizeHandle, cursor: "nesw-resize" },
      { x: x1, y: my, type: "w" as ResizeHandle, cursor: "ew-resize" },
    ];
  }, [x1, y1, x2, y2]);

  return (
    <g className="resize-handles">
      {handles.map((handle) => (
        <g key={handle.type} style={{ cursor: handle.cursor }}>
          {/* Outer shadow ring */}
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleSize + 1}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={2}
          />
          
          {/* Main handle circle */}
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleSize}
            fill={ANNOTATION_COLORS.handleFill}
            stroke={ANNOTATION_COLORS.handleStroke}
            strokeWidth={2}
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
              transition: "r 100ms ease-out",
            }}
          />
          
          {/* Inner accent dot */}
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleSize * 0.35}
            fill={ANNOTATION_COLORS.handleStroke}
          />
        </g>
      ))}

      {/* Edge connection lines */}
      <rect
        x={x1}
        y={y1}
        width={x2 - x1}
        height={y2 - y1}
        fill="none"
        stroke={ANNOTATION_COLORS.selected}
        strokeWidth={0.5}
        strokeDasharray="4 4"
        strokeOpacity={0.5}
      />
    </g>
  );
});

/**
 * Vertex handles for polygon editing
 */
interface VertexHandlesProps {
  points: Array<{ x: number; y: number }>;
  naturalSize: { w: number; h: number };
  selectedIndex?: number;
  onVertexClick?: (index: number) => void;
}

export const VertexHandles = memo(function VertexHandles({
  points,
  naturalSize,
  selectedIndex,
  onVertexClick,
}: VertexHandlesProps) {
  // Calculate handle size based on image dimensions
  const handleSize = useMemo(() => {
    const baseSize = Math.min(naturalSize.w, naturalSize.h) / 120;
    return Math.max(4, Math.min(8, baseSize));
  }, [naturalSize]);

  return (
    <g className="vertex-handles">
      {points.map((point, index) => (
        <g
          key={index}
          style={{ cursor: "grab" }}
          onClick={(e) => {
            e.stopPropagation();
            onVertexClick?.(index);
          }}
        >
          {/* Shadow ring */}
          <circle
            cx={point.x}
            cy={point.y}
            r={handleSize + 1}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={2}
          />

          {/* Main handle */}
          <circle
            cx={point.x}
            cy={point.y}
            r={handleSize}
            fill={index === selectedIndex ? ANNOTATION_COLORS.selected : ANNOTATION_COLORS.handleFill}
            stroke={ANNOTATION_COLORS.handleStroke}
            strokeWidth={1.5}
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
            }}
          />

          {/* Index label for first point */}
          {index === 0 && (
            <text
              x={point.x}
              y={point.y - handleSize - 4}
              textAnchor="middle"
              fontSize={handleSize * 1.5}
              fill={ANNOTATION_COLORS.handleStroke}
              fontWeight={600}
            >
              1
            </text>
          )}
        </g>
      ))}
    </g>
  );
});
