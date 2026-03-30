// High-quality annotation components with professional visual styling
export { BoundingBoxOverlay } from "./BoundingBoxOverlay";
export { PolygonOverlay } from "./PolygonOverlay";
export { SegmentationMask, InlineSegmentationMask } from "./SegmentationMask";
export { ClassLabelPopover } from "./ClassLabelPopover";
export { AnnotationToolbar } from "./AnnotationToolbar";
export { DrawingPreview } from "./DrawingPreview";
export { AnnotationLabel, ConfidenceBadge } from "./AnnotationLabel";
export { ResizeHandles, VertexHandles } from "./ResizeHandles";
export { ReviewStage } from "./ReviewStage";
export { UseStage } from "./UseStage";
export {
  useAnnotatedCanvasRenderer,
  exportHighQualityAnnotatedImage,
} from "./AnnotatedCanvasRenderer";
export {
  VIBRANT_PALETTE,
  calculateOptimalLabelPosition,
  calculateIoU,
  applyNMS,
  getContrastColor,
  ANIMATION_PRESETS,
  SHADOWS,
  BORDER_RADIUS,
} from "./visualEnhancements";