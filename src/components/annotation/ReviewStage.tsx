import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Download,
  FileJson,
  Image as ImageIcon,
  Layers,
  AlertCircle,
} from "lucide-react";
import { UploadedFile } from "@/contexts/UploadContext";
import { Annotation } from "@/lib/annotation-types";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay";
import { PolygonOverlay } from "./PolygonOverlay";

interface ReviewStageProps {
  files: UploadedFile[];
  getAnnotationsForFile: (fileId: string) => Annotation[];
  detectionResults?: Record<string, { output_image_url: string }>;
  onComplete: () => void;
}

/**
 * Review stage for verifying all annotations before export with:
 * - Gallery view of all annotated images
 * - Summary statistics
 * - Per-file annotation counts
 * - Validation warnings
 */
export const ReviewStage = ({
  files,
  getAnnotationsForFile,
  detectionResults = {},
  onComplete,
}: ReviewStageProps) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    files[0]?.id ?? null
  );
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate total annotations and per-class breakdown
  const stats = useMemo(() => {
    const classBreakdown: Record<string, number> = {};
    let totalAnnotations = 0;
    let yoloAnnotations = 0;
    let manualAnnotations = 0;
    let filesWithAnnotations = 0;
    let filesWithoutAnnotations = 0;

    files.forEach((file) => {
      const anns = getAnnotationsForFile(file.id);
      if (anns.length > 0) {
        filesWithAnnotations++;
      } else {
        filesWithoutAnnotations++;
      }

      anns.forEach((ann) => {
        totalAnnotations++;
        if (ann.source.type === "yolo") {
          yoloAnnotations++;
        } else {
          manualAnnotations++;
        }

        const label = ann.label || "unlabeled";
        classBreakdown[label] = (classBreakdown[label] || 0) + 1;
      });
    });

    return {
      totalAnnotations,
      yoloAnnotations,
      manualAnnotations,
      filesWithAnnotations,
      filesWithoutAnnotations,
      classBreakdown,
      totalFiles: files.length,
    };
  }, [files, getAnnotationsForFile]);

  // Get selected file annotations
  const selectedFile = files.find((f) => f.id === selectedFileId);
  const selectedAnnotations = selectedFileId
    ? getAnnotationsForFile(selectedFileId)
    : [];

  // Get annotated image URL if available
  const getImageUrl = useCallback((file: UploadedFile) => {
    const result = detectionResults[file.id];
    return result?.output_image_url || file.preview;
  }, [detectionResults]);

  // Sort classes by count for display
  const sortedClasses = useMemo(() => {
    return Object.entries(stats.classBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats.classBreakdown]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Summary header */}
      <div className="border-b border-upload-dashed p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-hero-foreground mb-4">
            Review Your Annotations
          </h2>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-upload rounded-xl p-4">
              <div className="text-3xl font-bold text-hero-foreground">
                {stats.totalAnnotations}
              </div>
              <div className="text-sm text-hero-muted">Total Annotations</div>
            </div>
            <div className="bg-upload rounded-xl p-4">
              <div className="text-3xl font-bold text-primary">
                {stats.yoloAnnotations}
              </div>
              <div className="text-sm text-hero-muted">Auto-Detected</div>
            </div>
            <div className="bg-upload rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">
                {stats.manualAnnotations}
              </div>
              <div className="text-sm text-hero-muted">Manual Annotations</div>
            </div>
            <div className="bg-upload rounded-xl p-4">
              <div className="text-3xl font-bold text-hero-foreground">
                {stats.filesWithAnnotations}/{stats.totalFiles}
              </div>
              <div className="text-sm text-hero-muted">Files Annotated</div>
            </div>
          </div>

          {/* Warning for unannotated files */}
          {stats.filesWithoutAnnotations > 0 && (
            <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-lg px-4 py-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                {stats.filesWithoutAnnotations} file
                {stats.filesWithoutAnnotations > 1 ? "s" : ""} without
                annotations
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File gallery sidebar */}
        <div className="w-64 border-r border-upload-dashed overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-hero-foreground mb-3">
            Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => {
              const anns = getAnnotationsForFile(file.id);
              const isSelected = file.id === selectedFileId;

              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    isSelected
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "hover:bg-upload"
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={getImageUrl(file)}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm text-hero-foreground truncate">
                      {file.file.name}
                    </div>
                    <div className="text-xs text-hero-muted">
                      {anns.length} annotation{anns.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {anns.length > 0 ? (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex flex-col p-6 overflow-auto">
          {selectedFile && (
            <motion.div
              key={selectedFile.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              {/* Image preview with annotations overlay */}
              <div className="flex-1 flex items-center justify-center bg-black/20 rounded-xl overflow-hidden mb-4">
                <div className="relative inline-block">
                  <img
                    ref={imageRef}
                    src={getImageUrl(selectedFile)}
                    alt={selectedFile.file.name}
                    className="max-w-full max-h-[50vh] object-contain block"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                  />
                  {/* SVG annotation overlay with bounding boxes and labels */}
                  {imageSize.w > 1 && selectedAnnotations.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {selectedAnnotations.map((ann) =>
                        ann.geometry.type === "bbox" ? (
                          <BoundingBoxOverlay
                            key={ann.id}
                            annotation={ann}
                            isSelected={false}
                            naturalSize={imageSize}
                            onSelect={() => {}}
                          />
                        ) : (
                          <PolygonOverlay
                            key={ann.id}
                            annotation={ann}
                            isSelected={false}
                            naturalSize={imageSize}
                            onSelect={() => {}}
                          />
                        )
                      )}
                    </svg>
                  )}
                </div>
              </div>

              {/* Annotation list for selected file */}
              <div className="bg-upload rounded-xl p-4">
                <h4 className="text-sm font-semibold text-hero-foreground mb-3">
                  Annotations ({selectedAnnotations.length})
                </h4>
                {selectedAnnotations.length === 0 ? (
                  <p className="text-sm text-hero-muted">
                    No annotations for this file
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {selectedAnnotations.map((ann) => (
                      <div
                        key={ann.id}
                        className="flex items-center gap-2 bg-hero rounded-lg px-3 py-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full ring-1 ring-white/20"
                          style={{ backgroundColor: ann.color }}
                        />
                        <span className="text-sm text-hero-foreground capitalize truncate">
                          {ann.label || "Unlabeled"}
                        </span>
                        {ann.source.type === "yolo" && (
                          <span className="text-[10px] text-hero-muted ml-auto">
                            {Math.round(ann.source.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Class breakdown sidebar */}
        <div className="w-72 border-l border-upload-dashed overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-hero-foreground mb-3">
            Class Breakdown
          </h3>
          <div className="space-y-2">
            {sortedClasses.map(([cls, count]) => (
              <div
                key={cls}
                className="flex items-center justify-between bg-upload rounded-lg px-3 py-2"
              >
                <span className="text-sm text-hero-foreground capitalize">
                  {cls}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Complete button */}
          <button
            onClick={onComplete}
            disabled={stats.totalAnnotations === 0}
            className="w-full mt-6 bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Continue to Export</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
