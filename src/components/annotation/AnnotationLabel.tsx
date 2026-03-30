import { memo, useMemo } from "react";

interface AnnotationLabelProps {
  text: string;
  x: number;
  y: number;
  color: string;
  height: number;
  naturalSize: { w: number; h: number };
  maxWidth?: number;
}

/**
 * Professional annotation label with:
 * - Clean, readable typography
 * - Rounded pill background matching annotation color
 * - White text with high contrast
 * - Smart sizing based on image resolution
 * - Drop shadow for depth and readability
 * - Proper text truncation
 */
export const AnnotationLabel = memo(function AnnotationLabel({
  text,
  x,
  y,
  color,
  height,
  naturalSize,
  maxWidth,
}: AnnotationLabelProps) {
  // Calculate font size based on label height and image size
  const fontSize = useMemo(() => {
    const baseFontSize = height * 0.55;
    // Clamp to reasonable range
    return Math.max(10, Math.min(20, baseFontSize));
  }, [height]);

  // Padding values
  const paddingX = Math.max(6, height * 0.3);
  const paddingY = Math.max(3, height * 0.15);

  // Border radius for pill shape
  const borderRadius = height * 0.35;

  // Estimate text width (approximate)
  const estimatedTextWidth = useMemo(() => {
    // Rough estimate: average character width is ~0.6 of font size
    return text.length * fontSize * 0.55;
  }, [text, fontSize]);

  // Calculate actual label width
  const labelWidth = Math.min(
    maxWidth || naturalSize.w * 0.4,
    estimatedTextWidth + paddingX * 2
  );

  // Unique filter ID
  const filterId = useMemo(
    () => `label-shadow-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <g>
      <defs>
        {/* Drop shadow for readability */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background pill */}
      <rect
        x={x}
        y={y}
        width={labelWidth}
        height={height}
        rx={borderRadius}
        ry={borderRadius}
        fill={color}
        filter={`url(#${filterId})`}
        style={{
          transition: "fill 150ms ease-out",
        }}
      />

      {/* Inner highlight for depth */}
      <rect
        x={x + 1}
        y={y + 1}
        width={labelWidth - 2}
        height={height * 0.4}
        rx={borderRadius - 1}
        ry={borderRadius - 1}
        fill="white"
        fillOpacity={0.15}
      />

      {/* Text */}
      <text
        x={x + paddingX}
        y={y + height * 0.68}
        fill="white"
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight={600}
        letterSpacing="0.01em"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          userSelect: "none",
        }}
      >
        {/* Truncate text if too long */}
        {text.length > 20 ? `${text.slice(0, 18)}...` : text}
      </text>
    </g>
  );
});

/**
 * Confidence badge component for YOLO detections
 */
interface ConfidenceBadgeProps {
  confidence: number;
  x: number;
  y: number;
  naturalSize: { w: number; h: number };
}

export const ConfidenceBadge = memo(function ConfidenceBadge({
  confidence,
  x,
  y,
  naturalSize,
}: ConfidenceBadgeProps) {
  const size = Math.max(16, Math.min(28, Math.min(naturalSize.w, naturalSize.h) / 40));
  const fontSize = size * 0.45;
  const percentage = Math.round(confidence * 100);

  // Color based on confidence level
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return "#22c55e"; // Green
    if (confidence >= 0.6) return "#eab308"; // Yellow
    return "#f97316"; // Orange
  };

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={size / 2}
        fill={getConfidenceColor()}
        stroke="white"
        strokeWidth={1}
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
        }}
      />
      <text
        x={x}
        y={y + fontSize * 0.35}
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
      >
        {percentage}
      </text>
    </g>
  );
});
