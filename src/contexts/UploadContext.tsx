import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { DetectionResult, detectObjects, getAvailableClasses, ClassesResult } from "@/lib/api";

const TARGET_UPLOAD_BYTES = 900 * 1024;
const INITIAL_JPEG_QUALITY = 0.88;
const MIN_JPEG_QUALITY = 0.55;
const JPEG_QUALITY_STEP = 0.08;

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
}

interface UploadContextType {
  files: UploadedFile[];
  addFiles: (newFiles: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  /** Detection state keyed by file id */
  detectionResults: Record<string, DetectionResult>;
  detectionLoading: Record<string, boolean>;
  detectionError: Record<string, string | null>;
  runDetection: (fileId: string, searchQuery?: string) => Promise<void>;
  
  /** Search and class filtering */
  availableClasses: string[];
  loadAvailableClasses: () => Promise<void>;
}

const UploadContext = createContext<UploadContextType | null>(null);

export const useUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
};

function generateUploadId(): string {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Resize image to 1536x1024 before uploading/processing
 * This ensures consistent dimensions across the pipeline
 */
async function resizeImage(file: File, width = 1536, height = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip videos
    if (file.type.startsWith("video/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      // Set canvas to target dimensions
      canvas.width = width;
      canvas.height = height;

      // Flatten transparency to white before JPEG export.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      const fileBaseName = file.name.replace(/\.[^.]+$/, "") || "upload";

      const createJpegBlob = (quality: number): Promise<Blob> =>
        new Promise((blobResolve, blobReject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                blobReject(new Error("Failed to create JPEG blob"));
                return;
              }
              blobResolve(blob);
            },
            "image/jpeg",
            quality
          );
        });

      (async () => {
        try {
          let quality = INITIAL_JPEG_QUALITY;
          let blob = await createJpegBlob(quality);

          while (blob.size > TARGET_UPLOAD_BYTES && quality > MIN_JPEG_QUALITY) {
            quality = Math.max(MIN_JPEG_QUALITY, quality - JPEG_QUALITY_STEP);
            blob = await createJpegBlob(quality);
          }

          const resizedFile = new File([blob], `${fileBaseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          console.log(
            `✅ Image resized to ${width}x${height}: ${file.name} (${Math.round(blob.size / 1024)} KB)`
          );
          resolve(resizedFile);
        } catch (compressionError) {
          reject(compressionError);
        } finally {
          URL.revokeObjectURL(img.src);
        }
      })();
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [detectionResults, setDetectionResults] = useState<Record<string, DetectionResult>>({});
  const [detectionLoading, setDetectionLoading] = useState<Record<string, boolean>>({});
  const [detectionError, setDetectionError] = useState<Record<string, string | null>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  const addFiles = async (newFiles: File[]) => {
    const filtered = newFiles.filter((f) => {
      if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
        return true;
      }

      // Some browsers/filesystems may not provide MIME type for local files.
      return /\.(png|jpe?g|webp|gif|bmp|tiff?|mp4|mov|webm|mkv|avi)$/i.test(f.name);
    });

    // Resize all images to 1536x1024 before adding
    const resizedFiles = await Promise.all(
      filtered.map(async (file) => {
        try {
          return await resizeImage(file);
        } catch (error) {
          console.error(`Failed to resize ${file.name}:`, error);
          return file; // Fallback to original if resize fails
        }
      })
    );

    const mapped = resizedFiles.map((file) => ({
      id: generateUploadId(),
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith("video/") ? "video" : "image") as "image" | "video",
    }));

    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
    // Clean up detection state
    setDetectionResults((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    setDetectionLoading((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    setDetectionError((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
  };

  const clearFiles = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setDetectionResults({});
    setDetectionLoading({});
    setDetectionError({});
  };

  const loadAvailableClasses = useCallback(async () => {
    try {
      const result = await getAvailableClasses();
      setAvailableClasses(result.classes);
    } catch (err) {
      console.error("Failed to load available classes:", err);
    }
  }, []);

  const runDetection = useCallback(
    async (fileId: string, searchQuery?: string) => {
      const target = files.find((f) => f.id === fileId);
      if (!target) return;

      setDetectionLoading((prev) => ({ ...prev, [fileId]: true }));
      setDetectionError((prev) => ({ ...prev, [fileId]: null }));

      try {
        const result = await detectObjects(target.file, searchQuery);
        setDetectionResults((prev) => ({ ...prev, [fileId]: result }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Detection failed";
        setDetectionError((prev) => ({ ...prev, [fileId]: message }));
      } finally {
        setDetectionLoading((prev) => ({ ...prev, [fileId]: false }));
      }
    },
    [files],
  );

  return (
    <UploadContext.Provider
      value={{
        files,
        addFiles,
        removeFile,
        clearFiles,
        detectionResults,
        detectionLoading,
        detectionError,
        runDetection,
        availableClasses,
        loadAvailableClasses,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
