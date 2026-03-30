import { memo, useMemo } from "react";
import { Annotation, ANNOTATION_COLORS } from "@/lib/annotation-types";
import { AnnotationLabel } from "./AnnotationLabel";

interface PolygonOverlayProps {
  annotation: Annotation;
  isSelected: boolean;
  naturalSize: { w: number; h: number };
  onSelect: () => void;
  onDoubleClick?: () => void;
}

/**
 * High-quality polygon segmentation overlay with:
 * - Smooth, anti-aliased edges
 * - Semi-transparent fill with vibrant colors
 * - Clean border strokes
 * - Vertex handles for editing
 * - Professional label positioning
 */
export const PolygonOverlay = memo(function PolygonOverlay({
  annotation,
  isSelected,
  naturalSize,
  onSelect,
  onDoubleClick,
}: PolygonOverlayProps) {
  const { geometry, color, label, source, hideLabel } = annotation;

  if (geometry.type !== "polygon") return null;
  const points = geometry.data;

  if (points.length < 3) return null;

  // Generate SVG path from points with smooth curves
  const pathData = useMemo(() => {
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return `${path} Z`;
  }, [points]);

  // Calculate centroid for label positioning
  const centroid = useMemo(() => {
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x: cx, y: cy };
  }, [points]);

  // Calculate bounding box for label positioning
  const bounds = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [points]);

  // Calculate stroke width based on image size
  const baseStroke = Math.max(2, Math.min(4, Math.min(naturalSize.w, naturalSize.h) / 400));
  const strokeWidth = isSelected ? baseStroke * 1.5 : baseStroke;

  // Fill opacity for semi-transparent overlay
  const fillOpacity = isSelected ? 0.25 : 0.18;

  // Vertex handle size
  const handleSize = Math.max(4, Math.min(8, Math.min(naturalSize.w, naturalSize.h) / 150));

  // Generate label text
  const labelText = useMemo(() => {
    if (source.type === "yolo") {
      return `${label} ${(source.confidence * 100).toFixed(0)}%`;
    }
    return label || "Unlabeled";
  }, [label, source]);

  // Label position - above the polygon's top edge
  const labelPosition = useMemo(() => {
    const labelHeight = Math.max(18, Math.min(28, naturalSize.h * 0.035));
    const padding = 6;
    
    // Position at top-left of bounding box
    return {
      x: bounds.minX,
      y: bounds.minY > labelHeight + padding ? bounds.minY - labelHeight - padding : bounds.minY + padding,
      height: labelHeight,
    };
  }, [bounds, naturalSize.h]);

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      {/* Drop shadow for depth */}
      <defs>
        <filter id={`poly-shadow-${annotation.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.25" />
        </filter>
        {/* Gradient for smooth edges */}
        <linearGradient id={`poly-grad-${annotation.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={fillOpacity * 0.7} />
        </linearGradient>
      </defs>

      {/* Semi-transparent fill with smooth gradient */}
      <path
        d={pathData}
        fill={`url(#poly-grad-${annotation.id})`}
        style={{
          transition: "fill-opacity 150ms ease-out",
        }}
      />

      {/* Main border stroke - smooth and clean */}
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? ANNOTATION_COLORS.selected : color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={isSelected ? `url(#poly-shadow-${annotation.id})` : undefined}
        style={{
          transition: "stroke 150ms ease-out, stroke-width 150ms ease-out",
        }}
      />

      {/* Inner highlight for depth */}
      <path
        d={pathData}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
        strokeOpacity={0.1}
        strokeLinejoin="round"
        transform="translate(0.5, 0.5)"
      />

      {/* Vertex handles when selected */}
      {isSelected && points.map((p, i) => (
        <g key={i}>
          {/* Outer ring */}
          <circle
            cx={p.x}
            cy={p.y}
            r={handleSize}
            fill={ANNOTATION_COLORS.handleFill}
            stroke={ANNOTATION_COLORS.handleStroke}
            strokeWidth={1.5}
            style={{ cursor: "grab" }}
          />
          {/* Inner dot */}
          <circle
            cx={p.x}
            cy={p.y}
            r={handleSize * 0.3}
            fill={ANNOTATION_COLORS.handleStroke}
          />
        </g>
      ))}

      {/* Centroid marker when selected */}
      {isSelected && (
        <circle
          cx={centroid.x}
          cy={centroid.y}
          r={handleSize * 0.7}
          fill="none"
          stroke={ANNOTATION_COLORS.handleStroke}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.5}
        />
      )}

      {/* Label */}
      {!hideLabel && (
        <AnnotationLabel
          text={labelText}
          x={labelPosition.x}
          y={labelPosition.y}
          color={isSelected ? ANNOTATION_COLORS.selected : color}
          height={labelPosition.height}
          naturalSize={naturalSize}
        />
      )}
    </g>
  );
});
