import { useCallback, useRef } from "react";
import { Annotation, CLASS_PALETTE, COCO_CLASSES } from "@/lib/annotation-types";

interface AnnotatedCanvasOptions {
  /** Source image URL */
  imageUrl: string;
  /** Annotations to render */
  annotations: Annotation[];
  /** Optional mask overlay URL from backend */
  maskOverlayUrl?: string;
  /** Output quality (0.0 - 1.0) */
  quality?: number;
  /** Whether to include labels */
  showLabels?: boolean;
  /** Whether to include confidence scores */
  showConfidence?: boolean;
}

/**
 * Generates extremely high-quality visual output with:
 * - Professional bounding boxes with rounded corners
 * - Smooth segmentation masks with semi-transparent fill
 * - Vibrant, well-distinguished colors per class
 * - Clean, sharp, precise annotations
 * - Proper label spacing and readability
 * - No overlap between labelling boxes using smart positioning
 */
export const useAnnotatedCanvasRenderer = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderAnnotatedImage = useCallback(
    async ({
      imageUrl,
      annotations,
      maskOverlayUrl,
      quality = 1.0,
      showLabels = true,
      showConfidence = true,
    }: AnnotatedCanvasOptions): Promise<Blob | null> => {
      // Create or reuse canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { alpha: false })!;

      // Load the source image
      const sourceImg = new Image();
      sourceImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        sourceImg.onload = () => resolve();
        sourceImg.onerror = reject;
        sourceImg.src = imageUrl;
      });

      // Set canvas to image dimensions for high-res output
      canvas.width = sourceImg.naturalWidth;
      canvas.height = sourceImg.naturalHeight;
      const w = canvas.width;
      const h = canvas.height;

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw source image (or mask overlay if available)
      if (maskOverlayUrl) {
        const maskImg = new Image();
        maskImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          maskImg.onload = () => resolve();
          maskImg.onerror = () => resolve(); // Fall back to source if mask fails
          maskImg.src = maskOverlayUrl;
        });
        if (maskImg.complete && maskImg.naturalWidth > 0) {
          ctx.drawImage(maskImg, 0, 0, w, h);
        } else {
          ctx.drawImage(sourceImg, 0, 0, w, h);
        }
      } else {
        ctx.drawImage(sourceImg, 0, 0, w, h);
      }

      // Calculate adaptive sizes based on image resolution
      const scaleFactor = Math.min(w, h) / 1000;
      const strokeWidth = Math.max(2, Math.min(6, scaleFactor * 3));
      const fontSize = Math.max(12, Math.min(28, scaleFactor * 18));
      const labelPadding = { x: Math.max(6, fontSize * 0.5), y: Math.max(4, fontSize * 0.3) };
      const borderRadius = Math.max(2, Math.min(8, scaleFactor * 4));
      const labelHeight = fontSize + labelPadding.y * 2;

      // Track label positions to avoid collisions
      const placedLabels: Array<{ x: number; y: number; width: number; height: number }> = [];

      // Helper: check if a label position collides with existing labels
      const checkLabelCollision = (x: number, y: number, width: number, height: number): boolean => {
        const margin = 4;
        return placedLabels.some(
          (label) =>
            x < label.x + label.width + margin &&
            x + width + margin > label.x &&
            y < label.y + label.height + margin &&
            y + height + margin > label.y
        );
      };

      // Helper: find best label position avoiding collisions
      const findBestLabelPosition = (
        box: { x1: number; y1: number; x2: number; y2: number },
        labelWidth: number
      ): { x: number; y: number; position: "top" | "bottom" | "inside" } => {
        const positions = [
          // Above the box (preferred)
          { x: box.x1, y: box.y1 - labelHeight - 4, position: "top" as const },
          // Below the box
          { x: box.x1, y: box.y2 + 4, position: "bottom" as const },
          // Inside top-left
          { x: box.x1 + 4, y: box.y1 + 4, position: "inside" as const },
          // Above but offset right
          { x: Math.min(box.x1 + 20, w - labelWidth - 4), y: box.y1 - labelHeight - 4, position: "top" as const },
          // Below but offset right
          { x: Math.min(box.x1 + 20, w - labelWidth - 4), y: box.y2 + 4, position: "bottom" as const },
        ];

        // Filter out positions outside image bounds
        const validPositions = positions.filter(
          (pos) =>
            pos.x >= 0 &&
            pos.x + labelWidth <= w &&
            pos.y >= 0 &&
            pos.y + labelHeight <= h
        );

        // Find first position without collision
        for (const pos of validPositions) {
          if (!checkLabelCollision(pos.x, pos.y, labelWidth, labelHeight)) {
            return pos;
          }
        }

        // Fall back to first valid position (collision allowed if no alternative)
        return validPositions[0] || positions[0];
      };

      // Sort annotations by area (largest first) for better z-ordering
      const sortedAnnotations = [...annotations].sort((a, b) => {
        if (a.geometry.type !== "bbox" || b.geometry.type !== "bbox") return 0;
        const areaA = (a.geometry.data.x2 - a.geometry.data.x1) * (a.geometry.data.y2 - a.geometry.data.y1);
        const areaB = (b.geometry.data.x2 - b.geometry.data.x1) * (b.geometry.data.y2 - b.geometry.data.y1);
        return areaB - areaA;
      });

      // Render each annotation
      sortedAnnotations.forEach((ann, index) => {
        const color = ann.color || CLASS_PALETTE[index % CLASS_PALETTE.length];

        if (ann.geometry.type === "bbox") {
          const { x1, y1, x2, y2 } = ann.geometry.data;
          const boxWidth = x2 - x1;
          const boxHeight = y2 - y1;

          // Draw semi-transparent fill
          ctx.fillStyle = color + "1A"; // ~10% opacity
          roundRect(ctx, x1, y1, boxWidth, boxHeight, borderRadius);
          ctx.fill();

          // Draw main border with rounded corners
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          roundRect(ctx, x1 + strokeWidth / 2, y1 + strokeWidth / 2, boxWidth - strokeWidth, boxHeight - strokeWidth, borderRadius);
          ctx.stroke();

          // Draw inner highlight for depth
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 1;
          roundRect(ctx, x1 + strokeWidth + 1, y1 + strokeWidth + 1, boxWidth - (strokeWidth + 1) * 2, boxHeight - (strokeWidth + 1) * 2, Math.max(0, borderRadius - 1));
          ctx.stroke();

          // Render label if enabled and not hidden
          if (showLabels && !ann.hideLabel) {
            const labelText =
              ann.source.type === "yolo" && showConfidence
                ? `${ann.label} ${Math.round(ann.source.confidence * 100)}%`
                : ann.label || "Unlabeled";

            ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
            const textMetrics = ctx.measureText(labelText);
            const labelWidth = textMetrics.width + labelPadding.x * 2;

            // Find best position avoiding collisions
            const labelPos = findBestLabelPosition({ x1, y1, x2, y2 }, labelWidth);

            // Register this label position
            placedLabels.push({
              x: labelPos.x,
              y: labelPos.y,
              width: labelWidth,
              height: labelHeight,
            });

            // Draw label background with rounded corners
            ctx.fillStyle = color;
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            roundRect(ctx, labelPos.x, labelPos.y, labelWidth, labelHeight, borderRadius * 0.7);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw label inner highlight
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            roundRect(ctx, labelPos.x + 1, labelPos.y + 1, labelWidth - 2, labelHeight * 0.4, borderRadius * 0.7);
            ctx.fill();

            // Draw label text
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.fillText(labelText, labelPos.x + labelPadding.x, labelPos.y + labelHeight / 2 + 1);
          }
        } else if (ann.geometry.type === "polygon") {
          const points = ann.geometry.data;
          if (points.length < 3) return;

          // Draw filled polygon with gradient
          ctx.fillStyle = color + "33"; // ~20% opacity
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.fill();

          // Draw polygon stroke
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();

          // Label at first vertex
          if (showLabels && !ann.hideLabel) {
            const labelText =
              ann.source.type === "yolo" && showConfidence
                ? `${ann.label} ${Math.round(ann.source.confidence * 100)}%`
                : ann.label || "Unlabeled";

            ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
            const textMetrics = ctx.measureText(labelText);
            const labelWidth = textMetrics.width + labelPadding.x * 2;

            const labelX = points[0].x;
            const labelY = points[0].y > labelHeight + 4 ? points[0].y - labelHeight - 4 : points[0].y + 4;

            // Draw label background
            ctx.fillStyle = color;
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            roundRect(ctx, labelX, labelY, labelWidth, labelHeight, borderRadius * 0.7);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw text
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.fillText(labelText, labelX + labelPadding.x, labelY + labelHeight / 2 + 1);
          }
        }
      });

      // Export as high-quality PNG
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          "image/png",
          quality
        );
      });
    },
    []
  );

  return { renderAnnotatedImage };
};

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * High-resolution export utility for batch processing
 */
export const exportHighQualityAnnotatedImage = async (
  sourceUrl: string,
  annotations: Annotation[],
  maskOverlayUrl?: string
): Promise<string> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Load source image
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = maskOverlayUrl || sourceUrl;
  });

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  // Use the renderer (simplified inline version)
  const w = canvas.width;
  const h = canvas.height;
  const scaleFactor = Math.min(w, h) / 1000;
  const strokeWidth = Math.max(2, Math.min(6, scaleFactor * 3));
  const fontSize = Math.max(12, Math.min(28, scaleFactor * 18));
  const borderRadius = Math.max(2, Math.min(8, scaleFactor * 4));

  annotations.forEach((ann, index) => {
    const color = ann.color || CLASS_PALETTE[index % CLASS_PALETTE.length];

    if (ann.geometry.type === "bbox") {
      const { x1, y1, x2, y2 } = ann.geometry.data;

      // Fill
      ctx.fillStyle = color + "1A";
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

      // Stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Label
      if (!ann.hideLabel) {
        const labelText =
          ann.source.type === "yolo"
            ? `${ann.label} ${Math.round(ann.source.confidence * 100)}%`
            : ann.label || "Unlabeled";
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        const tw = ctx.measureText(labelText).width;
        const lh = fontSize + 10;
        const lx = x1;
        const ly = y1 > lh ? y1 - lh - 4 : y1 + 4;
        ctx.fillStyle = color;
        roundRect(ctx, lx, ly, tw + 12, lh, borderRadius);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, lx + 6, ly + lh / 2);
      }
    }
  });

  return canvas.toDataURL("image/png");
};
