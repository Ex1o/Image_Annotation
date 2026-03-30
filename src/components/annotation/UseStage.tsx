import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileJson,
  Image as ImageIcon,
  Layers,
  Copy,
  Check,
  FileText,
  Archive,
} from "lucide-react";
import { UploadedFile } from "@/contexts/UploadContext";
import { Annotation, CLASS_PALETTE, COCO_CLASSES } from "@/lib/annotation-types";
import { useAnnotatedCanvasRenderer } from "./AnnotatedCanvasRenderer";

interface UseStageProps {
  files: UploadedFile[];
  getAnnotationsForFile: (fileId: string) => Annotation[];
  detectionResults?: Record<string, { output_image_url: string }>;
}

type ExportFormat = "coco" | "yolo" | "pascal-voc" | "csv";

/**
 * Export stage with multiple format options:
 * - COCO JSON format
 * - YOLO TXT format
 * - Pascal VOC XML format
 * - CSV format
 * - Annotated images download
 */
export const UseStage = ({
  files,
  getAnnotationsForFile,
  detectionResults = {},
}: UseStageProps) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("coco");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Use the high-quality canvas renderer for annotated image export
  const { renderAnnotatedImage } = useAnnotatedCanvasRenderer();

  // Generate preview of export format
  const exportPreview = useMemo(() => {
    if (files.length === 0) return "";

    const firstFile = files[0];
    const annotations = getAnnotationsForFile(firstFile.id);

    switch (selectedFormat) {
      case "coco":
        return JSON.stringify(
          {
            images: [
              {
                id: 1,
                file_name: firstFile.file.name,
                width: 1920,
                height: 1080,
              },
            ],
            annotations: annotations.slice(0, 2).map((ann, i) => ({
              id: i + 1,
              image_id: 1,
              category_id: COCO_CLASSES.indexOf(ann.label) + 1 || 1,
              bbox:
                ann.geometry.type === "bbox"
                  ? [
                      ann.geometry.data.x1,
                      ann.geometry.data.y1,
                      ann.geometry.data.x2 - ann.geometry.data.x1,
                      ann.geometry.data.y2 - ann.geometry.data.y1,
                    ]
                  : [],
              area: 0,
              iscrowd: 0,
            })),
            categories: [
              ...new Set(annotations.map((a) => a.label || "object")),
            ].map((name, i) => ({
              id: i + 1,
              name,
              supercategory: "object",
            })),
          },
          null,
          2
        );

      case "yolo":
        return annotations
          .slice(0, 3)
          .map((ann) => {
            if (ann.geometry.type !== "bbox") return "";
            const { x1, y1, x2, y2 } = ann.geometry.data;
            const cx = ((x1 + x2) / 2 / 1920).toFixed(6);
            const cy = ((y1 + y2) / 2 / 1080).toFixed(6);
            const w = ((x2 - x1) / 1920).toFixed(6);
            const h = ((y2 - y1) / 1080).toFixed(6);
            const classId = COCO_CLASSES.indexOf(ann.label);
            return `${classId >= 0 ? classId : 0} ${cx} ${cy} ${w} ${h}`;
          })
          .filter(Boolean)
          .join("\n");

      case "pascal-voc":
        return `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <filename>${firstFile.file.name}</filename>
  <size>
    <width>1920</width>
    <height>1080</height>
    <depth>3</depth>
  </size>
${annotations
  .slice(0, 2)
  .map((ann) => {
    if (ann.geometry.type !== "bbox") return "";
    const { x1, y1, x2, y2 } = ann.geometry.data;
    return `  <object>
    <name>${ann.label || "object"}</name>
    <bndbox>
      <xmin>${Math.round(x1)}</xmin>
      <ymin>${Math.round(y1)}</ymin>
      <xmax>${Math.round(x2)}</xmax>
      <ymax>${Math.round(y2)}</ymax>
    </bndbox>
  </object>`;
  })
  .filter(Boolean)
  .join("\n")}
</annotation>`;

      case "csv":
        return `image,class,x1,y1,x2,y2,confidence
${annotations
  .slice(0, 3)
  .map((ann) => {
    if (ann.geometry.type !== "bbox") return "";
    const { x1, y1, x2, y2 } = ann.geometry.data;
    const conf = ann.source.type === "yolo" ? ann.source.confidence.toFixed(3) : "";
    return `${firstFile.file.name},${ann.label || "object"},${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)},${conf}`;
  })
  .filter(Boolean)
  .join("\n")}`;

      default:
        return "";
    }
  }, [files, getAnnotationsForFile, selectedFormat]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [exportPreview]);

  // Download all annotations in selected format
  const handleDownload = useCallback(async () => {
    setDownloading(true);

    try {
      // Generate full export data
      const allAnnotations = files.flatMap((file, fileIdx) => {
        const anns = getAnnotationsForFile(file.id);
        return anns.map((ann, annIdx) => ({
          file,
          fileIdx,
          ann,
          annIdx,
        }));
      });

      let content = "";
      let filename = "";
      let mimeType = "application/json";

      switch (selectedFormat) {
        case "coco": {
          const cocoData = {
            info: {
              description: "VisionRapid Annotations Export",
              version: "1.0",
              year: new Date().getFullYear(),
              date_created: new Date().toISOString(),
            },
            images: files.map((file, i) => ({
              id: i + 1,
              file_name: file.file.name,
              width: 1920, // Would need actual dimensions
              height: 1080,
            })),
            annotations: allAnnotations
              .filter((item) => item.ann.geometry.type === "bbox")
              .map((item, i) => {
                const { x1, y1, x2, y2 } = item.ann.geometry.data as {
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                };
                return {
                  id: i + 1,
                  image_id: item.fileIdx + 1,
                  category_id: COCO_CLASSES.indexOf(item.ann.label) + 1 || 1,
                  bbox: [x1, y1, x2 - x1, y2 - y1],
                  area: (x2 - x1) * (y2 - y1),
                  iscrowd: 0,
                };
              }),
            categories: [
              ...new Set(allAnnotations.map((a) => a.ann.label || "object")),
            ].map((name, i) => ({
              id: i + 1,
              name,
              supercategory: "object",
            })),
          };
          content = JSON.stringify(cocoData, null, 2);
          filename = "annotations_coco.json";
          break;
        }

        case "yolo": {
          // For YOLO, create a zip would be ideal, but for simplicity, create a single file
          // with all annotations grouped by image
          const lines: string[] = [];
          files.forEach((file) => {
            lines.push(`# ${file.file.name}`);
            const anns = getAnnotationsForFile(file.id);
            anns.forEach((ann) => {
              if (ann.geometry.type !== "bbox") return;
              const { x1, y1, x2, y2 } = ann.geometry.data;
              // Normalize assuming 1920x1080 (would need actual dimensions)
              const cx = ((x1 + x2) / 2 / 1920).toFixed(6);
              const cy = ((y1 + y2) / 2 / 1080).toFixed(6);
              const w = ((x2 - x1) / 1920).toFixed(6);
              const h = ((y2 - y1) / 1080).toFixed(6);
              const classId = Math.max(0, COCO_CLASSES.indexOf(ann.label));
              lines.push(`${classId} ${cx} ${cy} ${w} ${h}`);
            });
            lines.push("");
          });
          content = lines.join("\n");
          filename = "annotations_yolo.txt";
          mimeType = "text/plain";
          break;
        }

        case "csv": {
          const rows = [
            "image,class,x1,y1,x2,y2,confidence,source",
            ...allAnnotations
              .filter((item) => item.ann.geometry.type === "bbox")
              .map((item) => {
                const { x1, y1, x2, y2 } = item.ann.geometry.data as {
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                };
                const conf =
                  item.ann.source.type === "yolo"
                    ? item.ann.source.confidence.toFixed(4)
                    : "";
                return `${item.file.file.name},${item.ann.label || "object"},${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)},${conf},${item.ann.source.type}`;
              }),
          ];
          content = rows.join("\n");
          filename = "annotations.csv";
          mimeType = "text/csv";
          break;
        }

        case "pascal-voc": {
          // Generate XML for each file (simplified - single file for demo)
          const xmlParts = files.map((file) => {
            const anns = getAnnotationsForFile(file.id);
            const objects = anns
              .filter((ann) => ann.geometry.type === "bbox")
              .map((ann) => {
                const { x1, y1, x2, y2 } = ann.geometry.data as {
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                };
                return `  <object>
    <name>${ann.label || "object"}</name>
    <pose>Unspecified</pose>
    <truncated>0</truncated>
    <difficult>0</difficult>
    <bndbox>
      <xmin>${Math.round(x1)}</xmin>
      <ymin>${Math.round(y1)}</ymin>
      <xmax>${Math.round(x2)}</xmax>
      <ymax>${Math.round(y2)}</ymax>
    </bndbox>
  </object>`;
              })
              .join("\n");

            return `<?xml version="1.0" encoding="UTF-8"?>
<annotation>
  <folder>images</folder>
  <filename>${file.file.name}</filename>
  <size>
    <width>1920</width>
    <height>1080</height>
    <depth>3</depth>
  </size>
${objects}
</annotation>`;
          });

          content = xmlParts.join("\n\n---\n\n");
          filename = "annotations_voc.xml";
          mimeType = "application/xml";
          break;
        }
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [files, getAnnotationsForFile, selectedFormat]);

  // Download annotated images with bounding boxes and labels
  const handleDownloadImages = useCallback(async () => {
    setDownloading(true);

    try {
      for (const file of files) {
        const annotations = getAnnotationsForFile(file.id);
        const result = detectionResults[file.id];
        const maskOverlayUrl = result?.output_image_url;

        // Render the image with bounding boxes and labels using the canvas renderer
        const blob = await renderAnnotatedImage({
          imageUrl: file.preview,
          annotations,
          maskOverlayUrl,
          quality: 1.0,
          showLabels: true,
          showConfidence: true,
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.file.name.replace(
            /\.[^.]+$/,
            "_annotated.png"
          );
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Small delay between downloads
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } catch (err) {
      console.error("Image download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [files, getAnnotationsForFile, detectionResults, renderAnnotatedImage]);

  const formats: Array<{
    id: ExportFormat;
    name: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "coco",
      name: "COCO JSON",
      description: "Standard COCO format for detection/segmentation",
      icon: <FileJson className="w-5 h-5" />,
    },
    {
      id: "yolo",
      name: "YOLO TXT",
      description: "Ultralytics YOLO format with normalized coordinates",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: "pascal-voc",
      name: "Pascal VOC XML",
      description: "XML format compatible with VOC datasets",
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: "csv",
      name: "CSV",
      description: "Simple CSV for spreadsheets and custom pipelines",
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-upload-dashed p-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-hero-foreground mb-2">
            Export Your Annotations
          </h2>
          <p className="text-sm text-hero-muted">
            Choose an export format and download your annotations for use in ML
            training pipelines.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Format selection */}
        <div className="w-72 border-r border-upload-dashed p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-hero-foreground mb-3">
            Export Format
          </h3>
          <div className="space-y-2">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                  selectedFormat === format.id
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-upload hover:bg-upload/80"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    selectedFormat === format.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-hero text-hero-muted"
                  }`}
                >
                  {format.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-hero-foreground">
                    {format.name}
                  </div>
                  <div className="text-xs text-hero-muted mt-0.5">
                    {format.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Download buttons */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Exporting..." : "Download Annotations"}
            </button>

            <button
              onClick={handleDownloadImages}
              disabled={downloading}
              className="w-full bg-upload text-hero-foreground rounded-xl py-3 font-semibold hover:bg-upload/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Download Annotated Images
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-hero-foreground">
              Preview
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-hero-muted hover:text-hero-foreground transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <motion.div
            key={selectedFormat}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-black/30 rounded-xl overflow-auto"
          >
            <pre className="p-4 text-sm text-green-400 font-mono leading-relaxed">
              <code>{exportPreview}</code>
            </pre>
          </motion.div>

          <div className="mt-4 text-xs text-hero-muted">
            <p>
              Preview shows a sample of the export format. The full download
              includes all {files.length} file
              {files.length !== 1 ? "s" : ""} with all annotations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
