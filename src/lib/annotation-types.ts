// Geometry types for different annotation shapes
export type BBox = { x1: number; y1: number; x2: number; y2: number };
export type PolygonPoints = { x: number; y: number }[];

export type AnnotationGeometry =
  | { type: "bbox"; data: BBox }
  | { type: "polygon"; data: PolygonPoints };

// Source tracking for provenance
export type AnnotationSource =
  | { type: "yolo"; confidence: number }
  | { type: "manual" };

// Main annotation interface
export interface Annotation {
  id: string;
  label: string;
  color: string;
  geometry: AnnotationGeometry;
  source: AnnotationSource;
  hideLabel?: boolean;
}

// Tool modes for canvas interaction
export type ToolMode = "select" | "draw-bbox" | "draw-polygon" | "pan";

// Resize handle positions
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// History state for undo/redo
export interface HistorySnapshot {
  annotations: Annotation[];
  timestamp: number;
}

// Drawing state for in-progress annotations
export interface DrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
  polygonPoints: { x: number; y: number }[];
}

// Constants
export const ANNOTATION_COLORS = {
  selected: "#7C3AED",
  drawPreview: "#7C3AED",
  handleFill: "#FFFFFF",
  handleStroke: "#7C3AED",
};

// COCO 80 classes (same as YOLOv8)
export const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush"
];

// Color palette matching backend Server.py
export const CLASS_PALETTE = [
  "#ff3838", "#4cc9f0", "#38ff65", "#ff9d33", "#8438ff", "#ffde33",
  "#52ffa5", "#ff38c8", "#38c2ff", "#c938ff", "#ff7838", "#38ffc8",
  "#ffc338", "#64ff38", "#3838ff", "#ff3878"
];

export const getClassColor = (className: string): string => {
  const index = COCO_CLASSES.indexOf(className);
  return CLASS_PALETTE[index >= 0 ? index % CLASS_PALETTE.length : 0];
};

// Utility to generate unique IDs
export const generateAnnotationId = (): string => {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// Normalize bbox so x1 < x2 and y1 < y2
export const normalizeBBox = (box: BBox): BBox => ({
  x1: Math.min(box.x1, box.x2),
  y1: Math.min(box.y1, box.y2),
  x2: Math.max(box.x1, box.x2),
  y2: Math.max(box.y1, box.y2),
});

// Clamp value within bounds
export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

// Check if a point is inside a bbox
export const isPointInBBox = (
  point: { x: number; y: number },
  box: BBox,
  padding = 0
): boolean => {
  return (
    point.x >= box.x1 - padding &&
    point.x <= box.x2 + padding &&
    point.y >= box.y1 - padding &&
    point.y <= box.y2 + padding
  );
};

// Check if a point is near a polygon vertex
export const isPointNearVertex = (
  point: { x: number; y: number },
  vertex: { x: number; y: number },
  threshold = 8
): boolean => {
  const dx = point.x - vertex.x;
  const dy = point.y - vertex.y;
  return Math.sqrt(dx * dx + dy * dy) <= threshold;
};

// Get resize handle at point for a bbox
export const getResizeHandleAtPoint = (
  point: { x: number; y: number },
  box: BBox,
  handleSize = 6
): ResizeHandle | null => {
  const { x1, y1, x2, y2 } = box;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const hs = handleSize;

  const handles: { pos: { x: number; y: number }; handle: ResizeHandle }[] = [
    { pos: { x: x1, y: y1 }, handle: "nw" },
    { pos: { x: mx, y: y1 }, handle: "n" },
    { pos: { x: x2, y: y1 }, handle: "ne" },
    { pos: { x: x2, y: my }, handle: "e" },
    { pos: { x: x2, y: y2 }, handle: "se" },
    { pos: { x: mx, y: y2 }, handle: "s" },
    { pos: { x: x1, y: y2 }, handle: "sw" },
    { pos: { x: x1, y: my }, handle: "w" },
  ];

  for (const { pos, handle } of handles) {
    if (
      Math.abs(point.x - pos.x) <= hs &&
      Math.abs(point.y - pos.y) <= hs
    ) {
      return handle;
    }
  }

  return null;
};

// Get cursor style for resize handle
export const getHandleCursor = (handle: ResizeHandle): string => {
  const cursors: Record<ResizeHandle, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
  };
  return cursors[handle];
};
