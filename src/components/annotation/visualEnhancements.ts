/**
 * Visual enhancement utilities for high-quality annotation rendering
 */

/**
 * Color palette with vibrant, well-distinguished colors
 * Matches backend Server.py palette for consistency
 */
export const VIBRANT_PALETTE = {
  colors: [
    { name: "Red", hex: "#ff3838", rgb: [255, 56, 56] },
    { name: "Sky Blue", hex: "#4cc9f0", rgb: [76, 201, 240] },
    { name: "Green", hex: "#38ff65", rgb: [56, 255, 101] },
    { name: "Orange", hex: "#ff9d33", rgb: [255, 157, 51] },
    { name: "Purple", hex: "#8438ff", rgb: [132, 56, 255] },
    { name: "Yellow", hex: "#ffde33", rgb: [255, 222, 51] },
    { name: "Mint", hex: "#52ffa5", rgb: [82, 255, 165] },
    { name: "Hot Pink", hex: "#ff38c8", rgb: [255, 56, 200] },
    { name: "Light Blue", hex: "#38c2ff", rgb: [56, 194, 255] },
    { name: "Violet", hex: "#c938ff", rgb: [201, 56, 255] },
    { name: "Coral", hex: "#ff7838", rgb: [255, 120, 56] },
    { name: "Aquamarine", hex: "#38ffc8", rgb: [56, 255, 200] },
    { name: "Gold", hex: "#ffc338", rgb: [255, 195, 56] },
    { name: "Lime", hex: "#64ff38", rgb: [100, 255, 56] },
    { name: "Blue", hex: "#3838ff", rgb: [56, 56, 255] },
    { name: "Rose", hex: "#ff3878", rgb: [255, 56, 120] },
  ],

  getColorByIndex(index: number) {
    return this.colors[index % this.colors.length];
  },

  getColorByClass(className: string) {
    // Simple hash function to get consistent color for class name
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.colors[Math.abs(hash) % this.colors.length];
  },
};

/**
 * Label positioning utilities to avoid overlap
 */
export interface LabelPosition {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  baseline: "top" | "middle" | "bottom";
}

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate optimal label position avoiding overlaps with other labels
 */
export function calculateOptimalLabelPosition(
  boxRect: BoundingRect,
  labelSize: { width: number; height: number },
  existingLabels: BoundingRect[],
  imageSize: { width: number; height: number },
  margin: number = 4
): LabelPosition {
  const candidates: Array<LabelPosition & { priority: number }> = [
    // Above box (preferred)
    {
      x: boxRect.x,
      y: boxRect.y - labelSize.height - margin,
      anchor: "start",
      baseline: "bottom",
      priority: 1,
    },
    // Below box
    {
      x: boxRect.x,
      y: boxRect.y + boxRect.height + margin,
      anchor: "start",
      baseline: "top",
      priority: 2,
    },
    // Inside top-left
    {
      x: boxRect.x + margin,
      y: boxRect.y + margin,
      anchor: "start",
      baseline: "top",
      priority: 3,
    },
    // Above but shifted right
    {
      x: boxRect.x + boxRect.width / 4,
      y: boxRect.y - labelSize.height - margin,
      anchor: "start",
      baseline: "bottom",
      priority: 4,
    },
    // Below but shifted right
    {
      x: boxRect.x + boxRect.width / 4,
      y: boxRect.y + boxRect.height + margin,
      anchor: "start",
      baseline: "top",
      priority: 5,
    },
  ];

  // Check if position is valid (within bounds and no collision)
  const isValidPosition = (pos: LabelPosition): boolean => {
    const labelRect: BoundingRect = {
      x: pos.x,
      y: pos.y,
      width: labelSize.width,
      height: labelSize.height,
    };

    // Check image bounds
    if (labelRect.x < 0 || labelRect.y < 0) return false;
    if (labelRect.x + labelRect.width > imageSize.width) return false;
    if (labelRect.y + labelRect.height > imageSize.height) return false;

    // Check collision with existing labels
    for (const existing of existingLabels) {
      if (rectsOverlap(labelRect, existing, margin)) {
        return false;
      }
    }

    return true;
  };

  // Find first valid position
  for (const candidate of candidates.sort((a, b) => a.priority - b.priority)) {
    if (isValidPosition(candidate)) {
      return candidate;
    }
  }

  // Fallback to first candidate (accept overlap)
  return candidates[0];
}

/**
 * Check if two rectangles overlap with margin
 */
export function rectsOverlap(
  a: BoundingRect,
  b: BoundingRect,
  margin: number = 0
): boolean {
  return !(
    a.x + a.width + margin < b.x ||
    b.x + b.width + margin < a.x ||
    a.y + a.height + margin < b.y ||
    b.y + b.height + margin < a.y
  );
}

/**
 * IoU (Intersection over Union) calculation for filtering overlapping detections
 */
export function calculateIoU(
  boxA: { x1: number; y1: number; x2: number; y2: number },
  boxB: { x1: number; y1: number; x2: number; y2: number }
): number {
  const interX1 = Math.max(boxA.x1, boxB.x1);
  const interY1 = Math.max(boxA.y1, boxB.y1);
  const interX2 = Math.min(boxA.x2, boxB.x2);
  const interY2 = Math.min(boxA.y2, boxB.y2);

  const interWidth = Math.max(0, interX2 - interX1);
  const interHeight = Math.max(0, interY2 - interY1);
  const interArea = interWidth * interHeight;

  const areaA = Math.max(0, (boxA.x2 - boxA.x1) * (boxA.y2 - boxA.y1));
  const areaB = Math.max(0, (boxB.x2 - boxB.x1) * (boxB.y2 - boxB.y1));
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Non-Maximum Suppression to filter overlapping boxes
 */
export function applyNMS<T extends { box: { x1: number; y1: number; x2: number; y2: number }; confidence: number }>(
  detections: T[],
  iouThreshold: number = 0.5
): T[] {
  if (detections.length === 0) return [];

  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const selected: T[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift()!;
    selected.push(current);

    // Remove all boxes with high IoU with current
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (calculateIoU(current.box, sorted[i].box) > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return selected;
}

/**
 * Calculate color contrast ratio for text readability
 */
export function getContrastColor(hexColor: string): "white" | "black" {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "black" : "white";
}

/**
 * Generate SVG filter ID for consistent styling
 */
export function generateFilterId(prefix: string = "filter"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Smooth animation configurations for framer-motion
 */
export const ANIMATION_PRESETS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: "easeOut" },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15, ease: "easeOut" },
  },
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/**
 * Box shadow presets for professional styling
 */
export const SHADOWS = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.15)",
  md: "0 2px 4px rgba(0, 0, 0, 0.2)",
  lg: "0 4px 8px rgba(0, 0, 0, 0.25)",
  xl: "0 8px 16px rgba(0, 0, 0, 0.3)",
  label: "0 1px 3px rgba(0, 0, 0, 0.4)",
};

/**
 * Border radius presets
 */
export const BORDER_RADIUS = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  pill: 9999,
};
