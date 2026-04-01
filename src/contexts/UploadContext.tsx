import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { DetectionResult, detectObjects, getAvailableClasses, ClassesResult } from "@/lib/api";

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

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to Blob then File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          // Create new File with same name and type
          const resizedFile = new File([blob], file.name, {
            type: file.type || "image/png",
            lastModified: Date.now(),
          });

          console.log(`✅ Image resized to ${width}x${height}: ${file.name}`);
          resolve(resizedFile);
        },
        file.type || "image/png",
        0.95 // Quality (95%)
      );

      URL.revokeObjectURL(img.src);
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
    const filtered = newFiles.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );

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
      id: crypto.randomUUID(),
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
