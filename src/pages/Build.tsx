import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X, Plus, ArrowLeft, ChevronUp, ChevronDown, Loader2,
  ZoomIn, ZoomOut, RotateCcw, Download, Pencil, Trash2,
  Check, Circle, Lock, Search, Sparkles,
} from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";
import { useAnnotation } from "@/contexts/AnnotationContext";
import { useAnnotationCanvas } from "@/hooks/useAnnotationCanvas";
import UploadZone from "@/components/UploadZone";
import {
  BoundingBoxOverlay,
  PolygonOverlay,
  ClassLabelPopover,
  AnnotationToolbar,
  DrawingPreview,
  ReviewStage,
  UseStage,
  useAnnotatedCanvasRenderer,
} from "@/components/annotation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getClassColor } from "@/lib/annotation-types";
import { useState, useRef, useCallback, useEffect } from "react";

const steps = ["Build", "Review", "Use"];

// Popular COCO classes for quick selection
const POPULAR_CLASSES = [
  "person", "car", "truck", "bus", "motorcycle", "bicycle",
  "dog", "cat", "bird", "horse", "cow", "sheep",
  "chair", "couch", "bed", "dining table",
  "cell phone", "laptop", "tv", "bottle",
];

const BuildPage = () => {
  const {
    files, addFiles, removeFile,
    detectionResults, detectionLoading, detectionError, runDetection,
    availableClasses, loadAvailableClasses,
  } = useUpload();

  const {
    getAnnotations,
    getSelectedId,
    setSelectedAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toolMode,
    setToolMode,
    drawingState,
    undo,
    redo,
    canUndo,
    canRedo,
    importYoloDetections,
  } = useAnnotation();

  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDragging, setPanDragging] = useState(false);
  const [panDragOrigin, setPanDragOrigin] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [relabelAnnotationId, setRelabelAnnotationId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Track if image has been initially loaded to prevent zoom/pan reset on detection updates
  const imageInitialized = useRef<Record<string, boolean>>({});
  
  // Search and annotate state
  const [searchQuery, setSearchQuery] = useState("");
  const [showClassSuggestions, setShowClassSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files[activeIndex] ?? null;
  const activeFileId = activeFile?.id ?? null;
  const activeResult = activeFile ? detectionResults[activeFile.id] : null;
  const activeLoading = activeFile ? detectionLoading[activeFile.id] : false;
  const activeError = activeFile ? detectionError[activeFile.id] : null;

  const annotations = activeFileId ? getAnnotations(activeFileId) : [];
  const selectedId = activeFileId ? getSelectedId(activeFileId) : null;
  const selectedAnnotation = annotations.find(a => a.id === selectedId) ?? null;
  
  // Load available classes on mount
  useEffect(() => {
    loadAvailableClasses();
  }, [loadAvailableClasses]);
  
  // Filter suggestions based on search input
  const getFilteredSuggestions = useCallback(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return POPULAR_CLASSES;
    
    const classes = availableClasses.length > 0 ? availableClasses : POPULAR_CLASSES;
    return classes.filter(c => c.toLowerCase().includes(query)).slice(0, 12);
  }, [searchQuery, availableClasses]);

  // Calculate total annotations across all files
  const totalAnnotationsAllFiles = files.reduce(
    (sum, f) => sum + getAnnotations(f.id).length,
    0
  );

  // Step unlock logic
  const canAccessStep = (step: number): boolean => {
    if (step === 0) return true; // Build is always accessible
    if (step === 1) return totalAnnotationsAllFiles > 0; // Review requires at least 1 annotation
    if (step === 2) return reviewCompleted; // Use requires review completion
    return false;
  };

  // Step progress indicators
  const getStepStatus = (step: number): "complete" | "current" | "locked" | "available" => {
    if (step < currentStep) return "complete";
    if (step === currentStep) return "current";
    if (!canAccessStep(step)) return "locked";
    return "available";
  };

  // Get annotations for any file (for Review/Use stages)
  const getAnnotationsForFile = useCallback(
    (fileId: string) => getAnnotations(fileId),
    [getAnnotations]
  );

  // Canvas interaction hook
  const {
    handlePointerDown: canvasPointerDown,
    handlePointerMove: canvasPointerMove,
    handlePointerUp: canvasPointerUp,
    getCursorStyle,
    pendingLabelAnnotation,
    confirmPendingAnnotation,
    cancelPendingAnnotation,
    deleteSelected,
    deselectAll,
  } = useAnnotationCanvas({
    fileId: activeFileId,
    viewportRef,
    zoom,
    pan,
    naturalSize,
  });

  // Calculate fit-zoom so the image fills ~90% of the viewport
  const computeFitZoom = useCallback((imgW: number, imgH: number) => {
    const vp = viewportRef.current;
    if (!vp || imgW <= 0 || imgH <= 0) return 1;
    const vpW = vp.clientWidth * 0.9;
    const vpH = (vp.clientHeight - 80) * 0.9;
    return Math.min(vpW / imgW, vpH / imgH);
  }, []);

  // Reset zoom/pan/size when active file changes (not on detection updates)
  useEffect(() => {
    if (activeFileId) {
      // Mark as uninitialized when switching files
      imageInitialized.current[activeFileId] = false;
    }
    // Start with fit zoom for 1536x1024 (standard processed size) to avoid size jump
    const fitZ = computeFitZoom(1536, 1024);
    setZoom(fitZ);
    setPan({ x: 0, y: 0 });
    setNaturalSize({ w: 1, h: 1 });
  }, [activeFile?.id, computeFitZoom]);

  // Ensure viewport never scrolls - force it to stay at top
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    
    const preventScroll = () => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    };
    
    // Reset scroll immediately
    preventScroll();
    
    // Watch for any scroll attempts
    el.addEventListener('scroll', preventScroll, { passive: true });
    
    return () => {
      el.removeEventListener('scroll', preventScroll);
    };
  }, []);

  // Mouse-wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(10, Math.max(0.2, z * (e.deltaY < 0 ? 1.12 : 0.88))));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space for temporary pan mode
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }

      // Tool mode shortcuts
      if (e.key === "v" || e.key === "V") setToolMode("select");
      if (e.key === "b" || e.key === "B") setToolMode("draw-bbox");
      if (e.key === "p" || e.key === "P") setToolMode("draw-polygon");

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (activeFileId && canUndo(activeFileId)) undo(activeFileId);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (activeFileId && canRedo(activeFileId)) redo(activeFileId);
      }

      // Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && activeFileId) {
        e.preventDefault();
        deleteSelected();
      }

      // Escape to deselect/cancel
      if (e.key === "Escape") {
        deselectAll();
        cancelPendingAnnotation();
      }

      // F for fit to window
      if (e.key === "f" || e.key === "F") {
        setZoom(computeFitZoom(naturalSize.w, naturalSize.h));
        setPan({ x: 0, y: 0 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeFileId, selectedId, canUndo, canRedo, undo, redo, setToolMode, deleteSelected, deselectAll, cancelPendingAnnotation, computeFitZoom, naturalSize]);

  // Determine effective tool mode (space overrides to pan)
  const effectiveToolMode = spaceHeld ? "pan" : toolMode;

  // Pointer events for pan (when in pan mode or space held)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (effectiveToolMode === "pan") {
      e.preventDefault();
      setPanDragging(true);
      setPanDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      canvasPointerDown(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panDragging) {
      setPan({ x: e.clientX - panDragOrigin.x, y: e.clientY - panDragOrigin.y });
    } else {
      canvasPointerMove(e);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (panDragging) {
      setPanDragging(false);
    } else {
      canvasPointerUp(e);
    }
  };

  // Handle YOLO detection with import to annotation context
  const handleRunDetection = async () => {
    if (!activeFile) return;
    await runDetection(activeFile.id, searchQuery || undefined);
  };
  
  // Handle search with specific classes
  const handleSearchAndAnnotate = async () => {
    if (!activeFile || !searchQuery.trim()) return;
    await runDetection(activeFile.id, searchQuery.trim());
  };
  
  // Add class to search query
  const addClassToSearch = (className: string) => {
    const currentClasses = searchQuery.split(",").map(c => c.trim()).filter(Boolean);
    if (!currentClasses.includes(className)) {
      const newQuery = currentClasses.length > 0 
        ? `${searchQuery}, ${className}` 
        : className;
      setSearchQuery(newQuery);
    }
    setShowClassSuggestions(false);
    searchInputRef.current?.focus();
  };

  // Import YOLO results when they arrive
  useEffect(() => {
    if (activeResult && activeFileId) {
      // Convert YOLO detections to annotations (only if not already imported)
      const existingYoloIds = annotations
        .filter(a => a.source.type === "yolo")
        .map(a => a.id);

      // Import current detection output and replace stale YOLO annotations
      if (activeResult.detections.length > 0 || existingYoloIds.length > 0) {
        importYoloDetections(activeFileId, activeResult.detections);
      }
      
      // Do NOT reset pan/zoom here - preserve user's current view position
      // The image should stay where it is after detection completes
    }
  }, [activeResult, activeFileId]);

  // High-quality canvas renderer
  const { renderAnnotatedImage } = useAnnotatedCanvasRenderer();

  // Canvas-merge download (backend mask image + vector boxes) - High quality output
  const handleDownload = async () => {
    if (!activeFile) return;
    
    const src = activeResult ? activeResult.output_image_url : activeFile.preview;
    const maskOverlay = activeResult?.output_image_url;
    
    try {
      const blob = await renderAnnotatedImage({
        imageUrl: activeFile.preview,
        annotations,
        maskOverlayUrl: maskOverlay,
        quality: 1.0,
        showLabels: true,
        showConfidence: true,
      });
      
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFile.file.name.replace(/\.[^.]+$/, "") + "_annotated.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback to basic rendering
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = src;
      });
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Draw all annotations with improved quality
      const fs = Math.max(12, Math.min(24, img.naturalWidth / 50));
      const lw = Math.max(2, Math.min(5, img.naturalWidth / 400));
      const borderRadius = Math.max(2, Math.min(8, img.naturalWidth / 300));

      // Track label positions for collision avoidance
      const placedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];
      const labelHeight = fs + 12;

      annotations.forEach((ann) => {
        const c = ann.color;

        if (ann.geometry.type === "bbox") {
          const { x1, y1, x2, y2 } = ann.geometry.data;
          
          // Semi-transparent fill
          ctx.fillStyle = c + "18";
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          
          // Main stroke with rounded appearance
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.strokeRect(x1 + lw/2, y1 + lw/2, x2 - x1 - lw, y2 - y1 - lw);
          
          // Inner highlight
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x1 + lw + 1, y1 + lw + 1, x2 - x1 - lw*2 - 2, y2 - y1 - lw*2 - 2);
          
          // Label with collision detection
          if (!ann.hideLabel) {
            const label = ann.source.type === "yolo"
              ? `${ann.label} ${Math.round(ann.source.confidence * 100)}%`
              : ann.label || "Unlabeled";
            ctx.font = `600 ${fs}px system-ui, -apple-system, sans-serif`;
            const tw = ctx.measureText(label).width;
            const labelWidth = tw + 14;
            
            // Find best label position
            let lx = x1;
            let ly = y1 > labelHeight + 4 ? y1 - labelHeight - 4 : y1 + 4;
            
            // Check for collisions and adjust
            const checkCollision = (testX: number, testY: number) => {
              return placedLabels.some(l => 
                testX < l.x + l.w + 4 && testX + labelWidth + 4 > l.x &&
                testY < l.y + l.h + 4 && testY + labelHeight + 4 > l.y
              );
            };
            
            // Try alternative positions if collision detected
            if (checkCollision(lx, ly)) {
              const alternatives = [
                { x: x1, y: y2 + 4 },
                { x: x1 + 20, y: y1 - labelHeight - 4 },
                { x: x1, y: y1 + 4 },
              ];
              for (const alt of alternatives) {
                if (!checkCollision(alt.x, alt.y)) {
                  lx = alt.x;
                  ly = alt.y;
                  break;
                }
              }
            }
            
            placedLabels.push({ x: lx, y: ly, w: labelWidth, h: labelHeight });
            
            // Draw label background with shadow
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.roundRect(lx, ly, labelWidth, labelHeight, borderRadius);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Label highlight
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.beginPath();
            ctx.roundRect(lx + 1, ly + 1, labelWidth - 2, labelHeight * 0.4, borderRadius);
            ctx.fill();
            
            // Label text
            ctx.fillStyle = "#fff";
            ctx.textBaseline = "middle";
            ctx.fillText(label, lx + 7, ly + labelHeight / 2 + 1);
          }
        } else if (ann.geometry.type === "polygon") {
          const points = ann.geometry.data;
          if (points.length >= 3) {
            // Fill with gradient effect
            ctx.fillStyle = c + "30";
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fill();
            
            // Stroke
            ctx.strokeStyle = c;
            ctx.lineWidth = lw;
            ctx.lineJoin = "round";
            ctx.stroke();
            
            // Label
            if (!ann.hideLabel) {
              const label = ann.source.type === "yolo"
                ? `${ann.label} ${Math.round(ann.source.confidence * 100)}%`
                : ann.label || "Unlabeled";
              ctx.font = `600 ${fs}px system-ui, sans-serif`;
              const tw = ctx.measureText(label).width;
              const lx = points[0].x;
              const ly = points[0].y > labelHeight + 4 ? points[0].y - labelHeight - 4 : points[0].y + 4;
              
              ctx.shadowColor = "rgba(0,0,0,0.35)";
              ctx.shadowBlur = 4;
              ctx.shadowOffsetY = 2;
              ctx.fillStyle = c;
              ctx.beginPath();
              ctx.roundRect(lx, ly, tw + 14, labelHeight, borderRadius);
              ctx.fill();
              ctx.shadowBlur = 0;
              
              ctx.fillStyle = "#fff";
              ctx.textBaseline = "middle";
              ctx.fillText(label, lx + 7, ly + labelHeight / 2 + 1);
            }
          }
        }
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeFile.file.name.replace(/\.[^.]+$/, "") + "_annotated.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    }
  };

  // Get cursor based on tool mode and state
  const getCursor = () => {
    if (panDragging) return "grabbing";
    if (effectiveToolMode === "pan") return "grab";
    return getCursorStyle();
  };

  // Handle relabeling
  const handleRelabel = (label: string) => {
    if (relabelAnnotationId && activeFileId) {
      updateAnnotation(activeFileId, relabelAnnotationId, {
        label,
        color: getClassColor(label),
      });
      setRelabelAnnotationId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="min-h-screen bg-hero flex flex-col">
        <header className="border-b border-upload-dashed px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-hero-muted hover:text-hero-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-hero-foreground font-semibold">VisionRapid</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <h2 className="text-2xl font-bold text-hero-foreground text-center mb-2">
              Upload an image 
            </h2>
            <p className="text-hero-muted text-center mb-8 text-sm">
              Images will be annotated in a few seconds.
            </p>
            <UploadZone onFilesSelected={addFiles} />
          </div>
        </div>
      </div>
    );
  }

  // Render header with stepper
  const renderHeader = () => (
    <header className="border-b border-upload-dashed px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="text-hero-muted hover:text-hero-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-hero-foreground font-semibold">VisionRapid</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const status = getStepStatus(i);
          const isClickable = canAccessStep(i);

          const stepButton = (
            <button
              key={step}
              onClick={() => isClickable && setCurrentStep(i)}
              disabled={!isClickable}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                status === "current"
                  ? "bg-primary text-primary-foreground"
                  : status === "complete"
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer"
                  : status === "available"
                  ? "text-hero-muted hover:bg-upload cursor-pointer"
                  : "text-hero-muted/50 cursor-not-allowed"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                  status === "current"
                    ? "bg-primary-foreground/20"
                    : status === "complete"
                    ? "bg-green-500/30"
                    : "bg-upload"
                }`}
              >
                {status === "complete" ? (
                  <Check className="w-3 h-3" />
                ) : status === "locked" ? (
                  <Lock className="w-3 h-3" />
                ) : status === "current" ? (
                  <Circle className="w-2 h-2 fill-current" />
                ) : (
                  i + 1
                )}
              </span>
              {step}
            </button>
          );

          return (
            <div key={step} className="flex items-center gap-2">
              {status === "locked" ? (
                <Tooltip>
                  <TooltipTrigger asChild>{stepButton}</TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {i === 1
                        ? "Add at least one annotation first"
                        : "Complete the Review stage first"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                stepButton
              )}
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-px ${
                    status === "complete" ? "bg-green-500/50" : "bg-upload-dashed"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-24" />
    </header>
  );

  // Render Build stage
  const renderBuildStage = () => (
    <div className="h-screen bg-hero flex flex-col overflow-hidden">
      {renderHeader()}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar - file list */}
        <aside className="w-24 border-r border-upload-dashed flex flex-col items-center py-4 gap-3 overflow-y-auto flex-shrink-0">
          <span className="text-xs text-hero-muted font-medium mb-1">
            Files {files.length}
          </span>

          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-upload-dashed flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors group">
            <Plus className="w-5 h-5 text-hero-muted group-hover:text-primary transition-colors" />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
              }}
            />
          </label>

          {files.map((f, i) => (
            <div key={f.id} className="relative group">
              <button
                onClick={() => setActiveIndex(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === activeIndex
                    ? "border-primary shadow-elevated"
                    : "border-upload-dashed hover:border-hero-muted"
                }`}
              >
                {f.type === "image" ? (
                  <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={f.preview} className="w-full h-full object-cover" muted />
                )}
              </button>
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                  if (activeIndex >= files.length - 1 && activeIndex > 0) {
                    setActiveIndex(activeIndex - 1);
                  }
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {files.length > 1 && (
            <div className="flex flex-col gap-1 mt-auto">
              <button
                onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                disabled={activeIndex === 0}
                className="w-9 h-9 rounded-full bg-upload flex items-center justify-center text-hero-muted hover:text-hero-foreground disabled:opacity-30 transition-all"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveIndex((p) => Math.min(files.length - 1, p + 1))}
                disabled={activeIndex === files.length - 1}
                className="w-9 h-9 rounded-full bg-upload flex items-center justify-center text-hero-muted hover:text-hero-foreground disabled:opacity-30 transition-all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Main canvas – zoom/pan viewport */}
        <main
          ref={viewportRef}
          className="flex-1 relative overflow-hidden select-none min-w-0 min-h-0"
          style={{ 
            cursor: getCursor(),
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onScroll={(e) => {
            // Prevent any accidental scrolling
            e.currentTarget.scrollTop = 0;
            e.currentTarget.scrollLeft = 0;
          }}
        >
          {activeFile && (
            <>
              {/* Transformed image + overlay container */}
              <motion.div
                key={activeFile.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              >
                {/* Image + SVG overlay container */}
                <div
                  className="relative"
                  style={{ display: "inline-block", borderRadius: "0.75rem", overflow: "hidden" }}
                >
                  {activeFile.type === "image" ? (
                    <>
                      <img
                        key={activeFile.id}
                        src={activeResult ? activeResult.output_image_url : activeFile.preview}
                        alt={activeFile.file.name}
                        className="block transition-opacity duration-200"
                        style={{ display: "block", maxWidth: "none", maxHeight: "none", opacity: activeLoading ? 0.8 : 1 }}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const nw = img.naturalWidth;
                          const nh = img.naturalHeight;
                          
                          // Always update natural size
                          setNaturalSize({ w: nw, h: nh });
                          
                          // Only auto-fit zoom and reset pan on initial load, not when detection results arrive
                          if (activeFileId && !imageInitialized.current[activeFileId]) {
                            // Use fit zoom based on processed image size (1536x1024) for consistency
                            const fitZ = computeFitZoom(1536, 1024);
                            setZoom(fitZ);
                            setPan({ x: 0, y: 0 });
                            imageInitialized.current[activeFileId] = true;
                          }
                          // If already initialized, preserve current zoom and pan (no jump!)
                        }}
                        draggable={false}
                      />

                      {/* SVG annotation overlay */}
                      {naturalSize.w > 1 && (
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
                          preserveAspectRatio="none"
                          style={{ pointerEvents: effectiveToolMode === "pan" ? "none" : "auto" }}
                        >
                          {/* Render all annotations */}
                          {annotations.map((ann) => (
                            ann.geometry.type === "bbox" ? (
                              <BoundingBoxOverlay
                                key={ann.id}
                                annotation={ann}
                                isSelected={ann.id === selectedId}
                                naturalSize={naturalSize}
                                onSelect={() => {
                                  if (activeFileId) setSelectedAnnotation(activeFileId, ann.id);
                                }}
                                onDoubleClick={() => setRelabelAnnotationId(ann.id)}
                              />
                            ) : (
                              <PolygonOverlay
                                key={ann.id}
                                annotation={ann}
                                isSelected={ann.id === selectedId}
                                naturalSize={naturalSize}
                                onSelect={() => {
                                  if (activeFileId) setSelectedAnnotation(activeFileId, ann.id);
                                }}
                                onDoubleClick={() => setRelabelAnnotationId(ann.id)}
                              />
                            )
                          ))}

                          {/* Drawing preview */}
                          <DrawingPreview
                            drawingState={drawingState}
                            toolMode={effectiveToolMode}
                            naturalSize={naturalSize}
                            zoom={zoom}
                          />
                        </svg>
                      )}
                    </>
                  ) : (
                    <video
                      src={activeFile.preview}
                      controls
                      className="block rounded-xl"
                      style={{ maxHeight: "70vh", maxWidth: "calc(100vw - 26rem)" }}
                      draggable={false}
                    />
                  )}

                  {/* Loading overlay - compact centered spinner */}
                  {activeLoading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-30">
                      <div className="flex flex-col items-center gap-2 bg-black/85 px-4 py-3 rounded-md shadow-lg" style={{ minWidth: '140px', maxWidth: '160px' }}>
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-white text-xs font-medium">Detecting objects...</span>
                          <span className="text-white/50 text-[10px]">Please wait</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Top toolbar: filename & remove */}
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 z-20 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-white/80 truncate max-w-[200px]">
                  {activeFile.file.name}
                </span>
                <div className="w-px h-3.5 bg-white/25" />
                <button
                  onClick={() => {
                    removeFile(activeFile.id);
                    setActiveIndex((p) => Math.max(0, p - 1));
                  }}
                  className="text-white/60 hover:text-red-400 transition-colors"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Annotation toolbar */}
              {activeFile.type === "image" && (
                <AnnotationToolbar fileId={activeFileId} />
              )}

              {/* Bottom toolbar: zoom controls + download */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl px-2.5 py-1.5 z-20 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setZoom((z) => Math.max(0.2, z / 1.25))}
                  className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Zoom out (scroll down)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/80 w-12 text-center tabular-nums font-medium">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(10, z * 1.25))}
                  className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Zoom in (scroll up)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button
                  onClick={() => { setZoom(computeFitZoom(naturalSize.w, naturalSize.h)); setPan({ x: 0, y: 0 }); }}
                  className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Fit to window (F)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button
                  onClick={handleDownload}
                  className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Download annotated image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Class label popover for new annotations */}
              {pendingLabelAnnotation && (
                <ClassLabelPopover
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) cancelPendingAnnotation();
                  }}
                  onSelect={confirmPendingAnnotation}
                  onCancel={cancelPendingAnnotation}
                  position={pendingLabelAnnotation.position}
                />
              )}

              {/* Relabel popover */}
              {relabelAnnotationId && (
                <ClassLabelPopover
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) setRelabelAnnotationId(null);
                  }}
                  onSelect={handleRelabel}
                  onCancel={() => setRelabelAnnotationId(null)}
                  position={{ x: window.innerWidth / 2, y: 200 }}
                  currentLabel={selectedAnnotation?.label}
                />
              )}
            </>
          )}
        </main>

        {/* Right sidebar – annotations */}
        <aside 
          className="w-72 border-l border-upload-dashed p-5 flex flex-col gap-5 overflow-y-auto flex-shrink-0"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div>
            <h3 className="text-hero-foreground font-semibold mb-3">Object Detection</h3>
            <p className="text-xs text-hero-muted mb-3">
              Auto-detect objects using YOLOv8 or search for specific classes.
            </p>
          </div>

          {/* Search and Annotate Section */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 bg-upload rounded-xl px-3 py-2 border border-upload-dashed focus-within:border-primary/50 transition-colors">
                <Search className="w-4 h-4 text-hero-muted flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowClassSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClassSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      handleSearchAndAnnotate();
                    }
                  }}
                  placeholder="Search: car, person, dog..."
                  className="flex-1 bg-transparent text-sm text-hero-foreground placeholder:text-hero-muted outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-hero-muted hover:text-hero-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {/* Class suggestions dropdown */}
              {showClassSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-upload border border-upload-dashed rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  <div className="p-2">
                    <p className="text-[10px] uppercase tracking-widest text-hero-muted font-semibold px-2 py-1">
                      {searchQuery ? "Matching Classes" : "Popular Classes"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {getFilteredSuggestions().map((cls) => (
                        <button
                          key={cls}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addClassToSearch(cls);
                          }}
                          className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors capitalize"
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Search info display */}
            {activeResult?.search_info && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-hero-muted">
                    Found <span className="font-semibold text-primary">{activeResult.search_info.total_matched}</span>
                    {" "}
                    {activeResult.search_info.matched_classes.length > 0 && (
                      <span className="text-hero-foreground">
                        ({activeResult.search_info.matched_classes.join(", ")})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Detection buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRunDetection}
              disabled={!activeFile || activeLoading || activeFile.type !== "image"}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {activeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting...
                </>
              ) : searchQuery.trim() ? (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Find All
                </>
              )}
            </button>
          </div>

          {activeError && (
            <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-3">
              {activeError}
            </div>
          )}

          {/* Annotations list */}
          {annotations.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-upload rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-hero-muted font-semibold">Total</span>
                  <span className="text-xl font-bold text-hero-foreground tabular-nums">
                    {annotations.length}
                  </span>
                </div>
                <div className="bg-upload rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-hero-muted font-semibold">Manual</span>
                  <span className="text-xl font-bold text-hero-foreground tabular-nums">
                    {annotations.filter(a => a.source.type === "manual").length}
                  </span>
                </div>
                <div className="bg-upload rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-hero-muted font-semibold">Time</span>
                  <span className="text-xl font-bold text-hero-foreground tabular-nums">
                    {activeResult?.processing_time_ms !== undefined
                      ? activeResult.processing_time_ms < 1000
                        ? `${activeResult.processing_time_ms}ms`
                        : `${(activeResult.processing_time_ms / 1000).toFixed(1)}s`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-hero-foreground font-medium">Annotations</span>
              </div>

              <div className="flex flex-col gap-2">
                {annotations.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => {
                      if (activeFileId) setSelectedAnnotation(activeFileId, ann.id);
                    }}
                    className={`flex items-center justify-between bg-upload rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                      ann.id === selectedId ? "ring-2 ring-primary" : "hover:bg-upload/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/20"
                        style={{ backgroundColor: ann.color }}
                      />
                      <span className="text-hero-foreground font-medium capitalize truncate">
                        {ann.label || "Unlabeled"}
                      </span>
                      {ann.geometry.type === "polygon" && (
                        <span className="text-[10px] text-hero-muted bg-hero-muted/10 px-1.5 py-0.5 rounded">
                          Polygon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {ann.source.type === "yolo" && (
                        <span className="text-hero-muted text-xs">
                          {(ann.source.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRelabelAnnotationId(ann.id);
                        }}
                        className="p-1 text-hero-muted hover:text-hero-foreground transition-colors"
                        title="Edit label"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeFileId) deleteAnnotation(activeFileId, ann.id);
                        }}
                        className="p-1 text-hero-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {annotations.length === 0 && !activeLoading && !activeError && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-hero-muted text-center">
                Click "Find Objects" to auto-detect, or use the drawing tools to annotate manually.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  // Render Review stage
  const renderReviewStage = () => (
    <div className="min-h-screen bg-hero flex flex-col">
      {renderHeader()}
      <ReviewStage
        files={files}
        getAnnotationsForFile={getAnnotationsForFile}
        detectionResults={detectionResults}
        onComplete={() => {
          setReviewCompleted(true);
          setCurrentStep(2);
        }}
      />
    </div>
  );

  // Render Use stage
  const renderUseStage = () => (
    <div className="min-h-screen bg-hero flex flex-col">
      {renderHeader()}
      <UseStage
        files={files}
        getAnnotationsForFile={getAnnotationsForFile}
        detectionResults={detectionResults}
      />
    </div>
  );

  // Main render based on current step
  if (currentStep === 1) return renderReviewStage();
  if (currentStep === 2) return renderUseStage();
  return renderBuildStage();
};

export default BuildPage;
