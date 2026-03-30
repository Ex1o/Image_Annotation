import { memo } from "react";
import { DrawingState, ToolMode, ANNOTATION_COLORS, normalizeBBox } from "@/lib/annotation-types";

interface DrawingPreviewProps {
  drawingState: DrawingState;
  toolMode: ToolMode;
  naturalSize: { w: number; h: number };
  zoom: number;
}

/**
 * Real-time drawing preview for annotation creation with:
 * - Live bbox preview during drag
 * - Polygon vertex preview with closing indicator
 * - Clean visual feedback with dashed strokes
 * - Smooth animations
 */
export const DrawingPreview = memo(function DrawingPreview({
  drawingState,
  toolMode,
  naturalSize,
  zoom,
}: DrawingPreviewProps) {
  const { isDrawing, startPoint, currentPoint, polygonPoints } = drawingState;

  // Calculate stroke width that remains consistent regardless of zoom
  const strokeWidth = Math.max(1.5, 2 / Math.sqrt(zoom));

  // BBox drawing preview
  if (toolMode === "draw-bbox" && isDrawing && startPoint && currentPoint) {
    const box = normalizeBBox({
      x1: startPoint.x,
      y1: startPoint.y,
      x2: currentPoint.x,
      y2: currentPoint.y,
    });

    const width = box.x2 - box.x1;
    const height = box.y2 - box.y1;

    // Don't render if too small
    if (width < 3 || height < 3) return null;

    return (
      <g className="drawing-preview">
        {/* Fill with low opacity */}
        <rect
          x={box.x1}
          y={box.y1}
          width={width}
          height={height}
          fill={ANNOTATION_COLORS.drawPreview}
          fillOpacity={0.1}
          rx={2}
          ry={2}
        />

        {/* Dashed stroke for preview indication */}
        <rect
          x={box.x1}
          y={box.y1}
          width={width}
          height={height}
          fill="none"
          stroke={ANNOTATION_COLORS.drawPreview}
          strokeWidth={strokeWidth}
          strokeDasharray="8 4"
          rx={2}
          ry={2}
          style={{
            strokeDashoffset: 0,
            animation: "dash-march 0.5s linear infinite",
          }}
        />

        {/* Corner indicators */}
        {[
          { x: box.x1, y: box.y1 },
          { x: box.x2, y: box.y1 },
          { x: box.x2, y: box.y2 },
          { x: box.x1, y: box.y2 },
        ].map((corner, i) => (
          <circle
            key={i}
            cx={corner.x}
            cy={corner.y}
            r={3 / Math.sqrt(zoom)}
            fill={ANNOTATION_COLORS.handleFill}
            stroke={ANNOTATION_COLORS.drawPreview}
            strokeWidth={1.5}
          />
        ))}

        {/* Size indicator */}
        <text
          x={box.x1 + width / 2}
          y={box.y2 + 18 / Math.sqrt(zoom)}
          textAnchor="middle"
          fontSize={12 / Math.sqrt(zoom)}
          fill={ANNOTATION_COLORS.drawPreview}
          fontWeight={500}
          fontFamily="system-ui, sans-serif"
        >
          {Math.round(width)} × {Math.round(height)}
        </text>
      </g>
    );
  }

  // Polygon drawing preview
  if (toolMode === "draw-polygon" && polygonPoints.length > 0) {
    const handleRadius = 5 / Math.sqrt(zoom);
    const firstPoint = polygonPoints[0];

    // Check if we're near the closing point
    const isNearClose =
      currentPoint &&
      polygonPoints.length >= 3 &&
      Math.hypot(currentPoint.x - firstPoint.x, currentPoint.y - firstPoint.y) < 15 / zoom;

    return (
      <g className="drawing-preview">
        {/* Filled area preview (if 3+ points) */}
        {polygonPoints.length >= 3 && (
          <polygon
            points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={ANNOTATION_COLORS.drawPreview}
            fillOpacity={0.1}
          />
        )}

        {/* Connecting lines between vertices */}
        {polygonPoints.length >= 2 && (
          <polyline
            points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={ANNOTATION_COLORS.drawPreview}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Line to current cursor position */}
        {currentPoint && polygonPoints.length > 0 && (
          <line
            x1={polygonPoints[polygonPoints.length - 1].x}
            y1={polygonPoints[polygonPoints.length - 1].y}
            x2={currentPoint.x}
            y2={currentPoint.y}
            stroke={ANNOTATION_COLORS.drawPreview}
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
        )}

        {/* Closing line preview (when near first point) */}
        {isNearClose && currentPoint && (
          <line
            x1={currentPoint.x}
            y1={currentPoint.y}
            x2={firstPoint.x}
            y2={firstPoint.y}
            stroke={ANNOTATION_COLORS.drawPreview}
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        )}

        {/* Vertex handles */}
        {polygonPoints.map((point, index) => (
          <g key={index}>
            {/* First point special treatment (closing point) */}
            {index === 0 ? (
              <>
                {/* Outer pulse ring when near close */}
                {isNearClose && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={handleRadius * 2.5}
                    fill="none"
                    stroke={ANNOTATION_COLORS.drawPreview}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    style={{
                      animation: "pulse-ring 1s ease-out infinite",
                    }}
                  />
                )}
                
                {/* Main handle with highlight */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isNearClose ? handleRadius * 1.5 : handleRadius}
                  fill={isNearClose ? ANNOTATION_COLORS.drawPreview : ANNOTATION_COLORS.handleFill}
                  stroke={ANNOTATION_COLORS.drawPreview}
                  strokeWidth={2}
                  style={{
                    transition: "r 150ms ease-out, fill 150ms ease-out",
                  }}
                />
              </>
            ) : (
              <circle
                cx={point.x}
                cy={point.y}
                r={handleRadius}
                fill={ANNOTATION_COLORS.handleFill}
                stroke={ANNOTATION_COLORS.drawPreview}
                strokeWidth={1.5}
              />
            )}
          </g>
        ))}

        {/* Current cursor position indicator */}
        {currentPoint && !isNearClose && (
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r={handleRadius * 0.7}
            fill={ANNOTATION_COLORS.drawPreview}
            fillOpacity={0.5}
          />
        )}

        {/* Point count indicator */}
        <text
          x={polygonPoints[0].x}
          y={polygonPoints[0].y - handleRadius * 3}
          textAnchor="middle"
          fontSize={11 / Math.sqrt(zoom)}
          fill={ANNOTATION_COLORS.drawPreview}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {polygonPoints.length} pts
          {polygonPoints.length >= 3 && !isNearClose && " (click 1st to close)"}
        </text>
      </g>
    );
  }

  return null;
});

// CSS keyframes (add to global styles or inject)
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes dash-march {
    to {
      stroke-dashoffset: -12;
    }
  }
  
  @keyframes pulse-ring {
    0% {
      r: 8;
      opacity: 1;
    }
    100% {
      r: 20;
      opacity: 0;
    }
  }
`;
if (typeof document !== "undefined" && !document.querySelector("[data-annotation-keyframes]")) {
  styleSheet.setAttribute("data-annotation-keyframes", "true");
  document.head.appendChild(styleSheet);
}
