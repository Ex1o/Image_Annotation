import { memo, useMemo } from "react";
import { Annotation, ANNOTATION_COLORS } from "@/lib/annotation-types";
import { ResizeHandles } from "./ResizeHandles";
import { AnnotationLabel } from "./AnnotationLabel";

interface BoundingBoxOverlayProps {
  annotation: Annotation;
  isSelected: boolean;
  naturalSize: { w: number; h: number };
  onSelect: () => void;
  onDoubleClick?: () => void;
  /** All annotations for label collision detection */
  allAnnotations?: Annotation[];
}

/**
 * High-quality bounding box overlay with:
 * - Vibrant, distinguishable colors per class
 * - Clean sharp borders with rounded corners
 * - Semi-transparent fill for visibility without obscuring content
 * - Professional label positioning with smart spacing
 * - Selection state with resize handles
 * - Smooth animations
 */
export const BoundingBoxOverlay = memo(function BoundingBoxOverlay({
  annotation,
  isSelected,
  naturalSize,
  onSelect,
  onDoubleClick,
  allAnnotations = [],
}: BoundingBoxOverlayProps) {
  const { geometry, color, label, source, hideLabel } = annotation;

  if (geometry.type !== "bbox") return null;
  const { x1, y1, x2, y2 } = geometry.data;

  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);

  // Calculate stroke width based on image size for consistent visual weight
  const baseStroke = Math.max(2, Math.min(4, Math.min(naturalSize.w, naturalSize.h) / 400));
  const strokeWidth = isSelected ? baseStroke * 1.5 : baseStroke;

  // Calculate border radius proportional to box size for clean appearance
  const borderRadius = Math.max(2, Math.min(8, Math.min(width, height) * 0.02));

  // Fill opacity for semi-transparent overlay
  const fillOpacity = isSelected ? 0.18 : 0.12;

  // Generate label text
  const labelText = useMemo(() => {
    if (source.type === "yolo") {
      return `${label} ${(source.confidence * 100).toFixed(0)}%`;
    }
    return label || "Unlabeled";
  }, [label, source]);

  // Calculate label position - smart positioning to avoid overlap
  const labelPosition = useMemo(() => {
    const labelHeight = Math.max(18, Math.min(28, naturalSize.h * 0.035));
    const padding = 4;
    
    // Position label above box if there's room, otherwise inside at top
    const positionAbove = y1 > labelHeight + padding;
    
    return {
      x: x1,
      y: positionAbove ? y1 - labelHeight - padding : y1 + padding,
      anchor: "start" as const,
      height: labelHeight,
    };
  }, [x1, y1, naturalSize.h]);

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
        <filter id={`shadow-${annotation.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Semi-transparent fill */}
      <rect
        x={x1}
        y={y1}
        width={width}
        height={height}
        rx={borderRadius}
        ry={borderRadius}
        fill={color}
        fillOpacity={fillOpacity}
        style={{
          transition: "fill-opacity 150ms ease-out",
        }}
      />

      {/* Main border - clean and sharp */}
      <rect
        x={x1 + strokeWidth / 2}
        y={y1 + strokeWidth / 2}
        width={Math.max(0, width - strokeWidth)}
        height={Math.max(0, height - strokeWidth)}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke={isSelected ? ANNOTATION_COLORS.selected : color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={isSelected ? `url(#shadow-${annotation.id})` : undefined}
        style={{
          transition: "stroke 150ms ease-out, stroke-width 150ms ease-out",
        }}
      />

      {/* Inner highlight for depth effect */}
      <rect
        x={x1 + strokeWidth + 1}
        y={y1 + strokeWidth + 1}
        width={Math.max(0, width - (strokeWidth + 1) * 2)}
        height={Math.max(0, height - (strokeWidth + 1) * 2)}
        rx={Math.max(0, borderRadius - 1)}
        ry={Math.max(0, borderRadius - 1)}
        fill="none"
        stroke="white"
        strokeWidth={0.5}
        strokeOpacity={0.15}
      />

      {/* Label - only show if not hidden due to overlap */}
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

      {/* Resize handles when selected */}
      {isSelected && (
        <ResizeHandles
          box={{ x1, y1, x2, y2 }}
          naturalSize={naturalSize}
        />
      )}
    </g>
  );
});
