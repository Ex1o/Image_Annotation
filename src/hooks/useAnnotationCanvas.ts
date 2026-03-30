import { useCallback, useState, useEffect, RefObject } from "react";
import {
  Annotation,
  BBox,
  ResizeHandle,
  ToolMode,
  clamp,
  getResizeHandleAtPoint,
  isPointInBBox,
  normalizeBBox,
  generateAnnotationId,
  getClassColor,
  isPointNearVertex,
} from "@/lib/annotation-types";
import { useAnnotation } from "@/contexts/AnnotationContext";

interface UseAnnotationCanvasOptions {
  fileId: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  naturalSize: { w: number; h: number };
}

interface DragState {
  isDragging: boolean;
  annotationId: string | null;
  offset: { x: number; y: number };
}

interface ResizeState {
  isResizing: boolean;
  annotationId: string | null;
  handle: ResizeHandle | null;
  originalBox: BBox | null;
  startPoint: { x: number; y: number } | null;
}

export const useAnnotationCanvas = ({
  fileId,
  viewportRef,
  zoom,
  pan,
  naturalSize,
}: UseAnnotationCanvasOptions) => {
  const {
    getAnnotations,
    getSelectedId,
    toolMode,
    drawingState,
    setDrawingState,
    resetDrawingState,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setSelectedAnnotation,
  } = useAnnotation();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    annotationId: null,
    offset: { x: 0, y: 0 },
  });

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    annotationId: null,
    handle: null,
    originalBox: null,
    startPoint: null,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [pendingLabelAnnotation, setPendingLabelAnnotation] = useState<{
    annotation: Annotation;
    position: { x: number; y: number };
  } | null>(null);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Reverse the CSS transform: translate(-50% + pan) scale(zoom)
      const x = (screenX - rect.left - centerX - pan.x) / zoom + naturalSize.w / 2;
      const y = (screenY - rect.top - centerY - pan.y) / zoom + naturalSize.h / 2;

      return { x, y };
    },
    [viewportRef, zoom, pan, naturalSize]
  );

  // Convert image coordinates to screen coordinates
  const imageToScreen = useCallback(
    (imgX: number, imgY: number): { x: number; y: number } => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const x = (imgX - naturalSize.w / 2) * zoom + centerX + pan.x + rect.left;
      const y = (imgY - naturalSize.h / 2) * zoom + centerY + pan.y + rect.top;

      return { x, y };
    },
    [viewportRef, zoom, pan, naturalSize]
  );

  // Find annotation at a point
  const findAnnotationAtPoint = useCallback(
    (point: { x: number; y: number }): Annotation | null => {
      if (!fileId) return null;
      const annotations = getAnnotations(fileId);

      // Check in reverse order (top-most first)
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        if (ann.geometry.type === "bbox") {
          if (isPointInBBox(point, ann.geometry.data, 4)) {
            return ann;
          }
        } else if (ann.geometry.type === "polygon") {
          if (isPointInPolygon(point, ann.geometry.data)) {
            return ann;
          }
        }
      }
      return null;
    },
    [fileId, getAnnotations]
  );

  // Check if point is inside polygon using ray casting
  const isPointInPolygon = (
    point: { x: number; y: number },
    polygon: { x: number; y: number }[]
  ): boolean => {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      if (
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!fileId) return;

      const imgCoords = screenToImage(e.clientX, e.clientY);
      const annotations = getAnnotations(fileId);
      const selectedId = getSelectedId(fileId);

      // Clamp to image bounds
      const clampedX = clamp(imgCoords.x, 0, naturalSize.w);
      const clampedY = clamp(imgCoords.y, 0, naturalSize.h);
      const clampedPoint = { x: clampedX, y: clampedY };

      switch (toolMode) {
        case "pan":
          setIsPanning(true);
          break;

        case "select": {
          // First check if clicking on a resize handle of selected annotation
          if (selectedId) {
            const selected = annotations.find((a) => a.id === selectedId);
            if (selected && selected.geometry.type === "bbox") {
              const handle = getResizeHandleAtPoint(clampedPoint, selected.geometry.data, 8 / zoom);
              if (handle) {
                setResizeState({
                  isResizing: true,
                  annotationId: selectedId,
                  handle,
                  originalBox: { ...selected.geometry.data },
                  startPoint: clampedPoint,
                });
                e.currentTarget.setPointerCapture(e.pointerId);
                return;
              }
            }
          }

          // Then check if clicking on any annotation
          const hit = findAnnotationAtPoint(clampedPoint);
          if (hit) {
            setSelectedAnnotation(fileId, hit.id);

            // Check if clicking inside the box for dragging
            if (hit.geometry.type === "bbox") {
              const box = hit.geometry.data;
              if (isPointInBBox(clampedPoint, box, -4)) {
                setDragState({
                  isDragging: true,
                  annotationId: hit.id,
                  offset: {
                    x: clampedPoint.x - box.x1,
                    y: clampedPoint.y - box.y1,
                  },
                });
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            } else if (hit.geometry.type === "polygon") {
              // For polygons, calculate center offset
              const points = hit.geometry.data;
              const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
              const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
              setDragState({
                isDragging: true,
                annotationId: hit.id,
                offset: { x: clampedPoint.x - cx, y: clampedPoint.y - cy },
              });
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          } else {
            setSelectedAnnotation(fileId, null);
          }
          break;
        }

        case "draw-bbox": {
          // Start drawing a new bbox
          setDrawingState({
            isDrawing: true,
            startPoint: clampedPoint,
            currentPoint: clampedPoint,
            polygonPoints: [],
          });
          e.currentTarget.setPointerCapture(e.pointerId);
          break;
        }

        case "draw-polygon": {
          // Add vertex to polygon
          if (drawingState.polygonPoints.length > 0) {
            const firstPoint = drawingState.polygonPoints[0];
            // Check if clicking near the first point to close
            if (isPointNearVertex(clampedPoint, firstPoint, 12 / zoom)) {
              if (drawingState.polygonPoints.length >= 3) {
                // Close the polygon - create pending annotation
                const newAnnotation: Annotation = {
                  id: generateAnnotationId(),
                  label: "",
                  color: getClassColor(""),
                  geometry: {
                    type: "polygon",
                    data: [...drawingState.polygonPoints],
                  },
                  source: { type: "manual" },
                };

                // Calculate label position (centroid of polygon)
                const cx = drawingState.polygonPoints.reduce((sum, p) => sum + p.x, 0) / drawingState.polygonPoints.length;
                const cy = drawingState.polygonPoints.reduce((sum, p) => sum + p.y, 0) / drawingState.polygonPoints.length;
                const screenPos = imageToScreen(cx, cy);

                setPendingLabelAnnotation({
                  annotation: newAnnotation,
                  position: screenPos,
                });
                resetDrawingState();
              }
              return;
            }
          }

          // Add new vertex
          setDrawingState({
            ...drawingState,
            isDrawing: true,
            polygonPoints: [...drawingState.polygonPoints, clampedPoint],
            currentPoint: clampedPoint,
          });
          break;
        }
      }
    },
    [
      fileId,
      toolMode,
      drawingState,
      screenToImage,
      imageToScreen,
      getAnnotations,
      getSelectedId,
      findAnnotationAtPoint,
      setSelectedAnnotation,
      setDrawingState,
      resetDrawingState,
      naturalSize,
      zoom,
    ]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!fileId) return;

      const imgCoords = screenToImage(e.clientX, e.clientY);
      const clampedX = clamp(imgCoords.x, 0, naturalSize.w);
      const clampedY = clamp(imgCoords.y, 0, naturalSize.h);
      const clampedPoint = { x: clampedX, y: clampedY };

      // Handle resize
      if (resizeState.isResizing && resizeState.annotationId && resizeState.handle && resizeState.originalBox) {
        const { handle, originalBox } = resizeState;
        let newBox = { ...originalBox };

        switch (handle) {
          case "nw":
            newBox.x1 = clampedX;
            newBox.y1 = clampedY;
            break;
          case "n":
            newBox.y1 = clampedY;
            break;
          case "ne":
            newBox.x2 = clampedX;
            newBox.y1 = clampedY;
            break;
          case "e":
            newBox.x2 = clampedX;
            break;
          case "se":
            newBox.x2 = clampedX;
            newBox.y2 = clampedY;
            break;
          case "s":
            newBox.y2 = clampedY;
            break;
          case "sw":
            newBox.x1 = clampedX;
            newBox.y2 = clampedY;
            break;
          case "w":
            newBox.x1 = clampedX;
            break;
        }

        // Normalize and update
        newBox = normalizeBBox(newBox);

        // Ensure minimum size
        const minSize = 10;
        if (newBox.x2 - newBox.x1 >= minSize && newBox.y2 - newBox.y1 >= minSize) {
          updateAnnotation(fileId, resizeState.annotationId, {
            geometry: { type: "bbox", data: newBox },
          });
        }
        return;
      }

      // Handle drag
      if (dragState.isDragging && dragState.annotationId) {
        const annotations = getAnnotations(fileId);
        const ann = annotations.find((a) => a.id === dragState.annotationId);
        if (!ann) return;

        if (ann.geometry.type === "bbox") {
          const box = ann.geometry.data;
          const width = box.x2 - box.x1;
          const height = box.y2 - box.y1;

          let newX1 = clampedX - dragState.offset.x;
          let newY1 = clampedY - dragState.offset.y;

          // Clamp to image bounds
          newX1 = clamp(newX1, 0, naturalSize.w - width);
          newY1 = clamp(newY1, 0, naturalSize.h - height);

          updateAnnotation(fileId, dragState.annotationId, {
            geometry: {
              type: "bbox",
              data: {
                x1: newX1,
                y1: newY1,
                x2: newX1 + width,
                y2: newY1 + height,
              },
            },
          });
        } else if (ann.geometry.type === "polygon") {
          const points = ann.geometry.data;
          const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
          const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

          const dx = clampedX - dragState.offset.x - cx;
          const dy = clampedY - dragState.offset.y - cy;

          // Move all points
          const newPoints = points.map((p) => ({
            x: clamp(p.x + dx, 0, naturalSize.w),
            y: clamp(p.y + dy, 0, naturalSize.h),
          }));

          updateAnnotation(fileId, dragState.annotationId, {
            geometry: { type: "polygon", data: newPoints },
          });
        }
        return;
      }

      // Handle drawing preview
      if (toolMode === "draw-bbox" && drawingState.isDrawing) {
        setDrawingState({
          ...drawingState,
          currentPoint: clampedPoint,
        });
      } else if (toolMode === "draw-polygon") {
        setDrawingState({
          ...drawingState,
          currentPoint: clampedPoint,
        });
      }
    },
    [
      fileId,
      dragState,
      resizeState,
      toolMode,
      drawingState,
      screenToImage,
      getAnnotations,
      updateAnnotation,
      setDrawingState,
      naturalSize,
    ]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!fileId) return;

      // End resize
      if (resizeState.isResizing) {
        setResizeState({
          isResizing: false,
          annotationId: null,
          handle: null,
          originalBox: null,
          startPoint: null,
        });
        return;
      }

      // End drag
      if (dragState.isDragging) {
        setDragState({
          isDragging: false,
          annotationId: null,
          offset: { x: 0, y: 0 },
        });
        return;
      }

      // End panning
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      // End bbox drawing
      if (toolMode === "draw-bbox" && drawingState.isDrawing && drawingState.startPoint && drawingState.currentPoint) {
        const box = normalizeBBox({
          x1: drawingState.startPoint.x,
          y1: drawingState.startPoint.y,
          x2: drawingState.currentPoint.x,
          y2: drawingState.currentPoint.y,
        });

        // Only create if box has meaningful size
        if (box.x2 - box.x1 >= 10 && box.y2 - box.y1 >= 10) {
          const newAnnotation: Annotation = {
            id: generateAnnotationId(),
            label: "",
            color: getClassColor(""),
            geometry: { type: "bbox", data: box },
            source: { type: "manual" },
          };

          // Calculate label position (top-left of box)
          const screenPos = imageToScreen(box.x1, box.y1);

          setPendingLabelAnnotation({
            annotation: newAnnotation,
            position: screenPos,
          });
        }

        resetDrawingState();
      }
    },
    [
      fileId,
      toolMode,
      drawingState,
      dragState,
      resizeState,
      isPanning,
      imageToScreen,
      resetDrawingState,
    ]
  );

  // Confirm pending annotation with label
  const confirmPendingAnnotation = useCallback(
    (label: string) => {
      if (!fileId || !pendingLabelAnnotation) return;

      const color = getClassColor(label);
      const annotation: Annotation = {
        ...pendingLabelAnnotation.annotation,
        label,
        color,
      };

      addAnnotation(fileId, annotation);
      setPendingLabelAnnotation(null);
    },
    [fileId, pendingLabelAnnotation, addAnnotation]
  );

  // Cancel pending annotation
  const cancelPendingAnnotation = useCallback(() => {
    setPendingLabelAnnotation(null);
    resetDrawingState();
  }, [resetDrawingState]);

  // Delete selected annotation
  const deleteSelected = useCallback(() => {
    if (!fileId) return;
    const selectedId = getSelectedId(fileId);
    if (selectedId) {
      deleteAnnotation(fileId, selectedId);
    }
  }, [fileId, getSelectedId, deleteAnnotation]);

  // Deselect all
  const deselectAll = useCallback(() => {
    if (!fileId) return;
    setSelectedAnnotation(fileId, null);
    resetDrawingState();
  }, [fileId, setSelectedAnnotation, resetDrawingState]);

  // Get cursor style based on state
  const getCursorStyle = useCallback((): string => {
    if (dragState.isDragging) return "grabbing";
    if (resizeState.isResizing && resizeState.handle) {
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
      return cursors[resizeState.handle];
    }
    if (isPanning) return "grabbing";

    switch (toolMode) {
      case "pan":
        return "grab";
      case "select":
        return "default";
      case "draw-bbox":
      case "draw-polygon":
        return "crosshair";
      default:
        return "default";
    }
  }, [toolMode, dragState, resizeState, isPanning]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getCursorStyle,
    screenToImage,
    imageToScreen,
    isPanning,
    setIsPanning,
    pendingLabelAnnotation,
    confirmPendingAnnotation,
    cancelPendingAnnotation,
    deleteSelected,
    deselectAll,
  };
};
