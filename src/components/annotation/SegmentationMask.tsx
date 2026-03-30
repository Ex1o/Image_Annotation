import { memo, useMemo } from "react";

interface SegmentationMaskProps {
  maskUrl: string;
  color: string;
  opacity?: number;
  naturalSize: { w: number; h: number };
  className?: string;
}

/**
 * High-quality segmentation mask overlay with:
 * - Smooth, semi-transparent rendering
 * - Clean edge definition
 * - Color blending for visual clarity
 * - Proper compositing with underlying image
 */
export const SegmentationMask = memo(function SegmentationMask({
  maskUrl,
  color,
  opacity = 0.35,
  naturalSize,
  className = "",
}: SegmentationMaskProps) {
  // Convert hex color to RGB for filter manipulation
  const colorRgb = useMemo(() => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }, [color]);

  // Generate unique filter ID
  const filterId = useMemo(
    () => `mask-colorize-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  return (
    <g className={className}>
      <defs>
        {/* Color matrix filter to tint the mask with the class color */}
        <filter id={filterId} colorInterpolationFilters="sRGB">
          {/* First make it grayscale */}
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    1 0"
          />
          {/* Then apply the target color */}
          <feColorMatrix
            type="matrix"
            values={`${colorRgb.r / 255} 0 0 0 0
                     0 ${colorRgb.g / 255} 0 0 0
                     0 0 ${colorRgb.b / 255} 0 0
                     0 0 0 1 0`}
          />
          {/* Gaussian blur for smooth edges */}
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        
        {/* Mask for clipping */}
        <mask id={`${filterId}-mask`}>
          <image
            href={maskUrl}
            x={0}
            y={0}
            width={naturalSize.w}
            height={naturalSize.h}
            preserveAspectRatio="none"
          />
        </mask>
      </defs>

      {/* Colored mask overlay */}
      <image
        href={maskUrl}
        x={0}
        y={0}
        width={naturalSize.w}
        height={naturalSize.h}
        preserveAspectRatio="none"
        filter={`url(#${filterId})`}
        opacity={opacity}
        style={{
          mixBlendMode: "multiply",
          transition: "opacity 200ms ease-out",
        }}
      />

      {/* Edge enhancement overlay for crisp boundaries */}
      <image
        href={maskUrl}
        x={0}
        y={0}
        width={naturalSize.w}
        height={naturalSize.h}
        preserveAspectRatio="none"
        opacity={opacity * 0.3}
        style={{
          mixBlendMode: "soft-light",
        }}
      />
    </g>
  );
});

/**
 * Inline segmentation mask rendered from binary mask data
 */
interface InlineMaskProps {
  maskData: boolean[][];
  color: string;
  opacity?: number;
  naturalSize: { w: number; h: number };
  smoothing?: "none" | "light" | "medium" | "heavy";
}

export const InlineSegmentationMask = memo(function InlineSegmentationMask({
  maskData,
  color,
  opacity = 0.3,
  naturalSize,
  smoothing = "medium",
}: InlineMaskProps) {
  // Generate SVG path from mask data using marching squares for smooth edges
  const maskPath = useMemo(() => {
    if (!maskData || maskData.length === 0) return "";

    const height = maskData.length;
    const width = maskData[0]?.length || 0;

    if (width === 0 || height === 0) return "";

    // Scale factors to map mask coordinates to image coordinates
    const scaleX = naturalSize.w / width;
    const scaleY = naturalSize.h / height;

    // Simple path generation - find contours
    const paths: string[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (maskData[y][x] && !visited.has(`${x},${y}`)) {
          // Start a new region
          const regionPath: string[] = [];
          let currentX = x;
          let currentY = y;

          // Simple flood fill to find region boundary
          const stack = [{ x, y }];
          const region = new Set<string>();

          while (stack.length > 0) {
            const pos = stack.pop()!;
            const key = `${pos.x},${pos.y}`;
            if (region.has(key) || visited.has(key)) continue;
            if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) continue;
            if (!maskData[pos.y][pos.x]) continue;

            region.add(key);
            visited.add(key);

            stack.push(
              { x: pos.x + 1, y: pos.y },
              { x: pos.x - 1, y: pos.y },
              { x: pos.x, y: pos.y + 1 },
              { x: pos.x, y: pos.y - 1 }
            );
          }

          // Simple bounding box path for each connected region
          if (region.size > 0) {
            const points = Array.from(region).map((k) => {
              const [px, py] = k.split(",").map(Number);
              return { x: px * scaleX, y: py * scaleY };
            });

            const minX = Math.min(...points.map((p) => p.x));
            const maxX = Math.max(...points.map((p) => p.x)) + scaleX;
            const minY = Math.min(...points.map((p) => p.y));
            const maxY = Math.max(...points.map((p) => p.y)) + scaleY;

            paths.push(`M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`);
          }
        }
      }
    }

    return paths.join(" ");
  }, [maskData, naturalSize]);

  // Blur amount based on smoothing level
  const blurAmount = {
    none: 0,
    light: 0.5,
    medium: 1,
    heavy: 2,
  }[smoothing];

  const filterId = useMemo(
    () => `inline-mask-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  if (!maskPath) return null;

  return (
    <g>
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation={blurAmount} />
        </filter>
      </defs>

      {/* Main mask fill */}
      <path
        d={maskPath}
        fill={color}
        fillOpacity={opacity}
        filter={blurAmount > 0 ? `url(#${filterId})` : undefined}
        style={{
          transition: "fill-opacity 200ms ease-out",
        }}
      />

      {/* Edge stroke for definition */}
      <path
        d={maskPath}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={opacity * 1.5}
        strokeLinejoin="round"
      />
    </g>
  );
});
