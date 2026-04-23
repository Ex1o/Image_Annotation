const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const buildApiUrl = (path: string) => `${API_BASE}${path}`;

const withCacheBuster = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
};

export interface Detection {
  id: string;
  class: string;
  class_id?: number;
  confidence: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  color: string;
}

export interface SearchInfo {
  query: string;
  matched_classes: string[];
  total_matched: number;
}

export interface DetectionResult {
  objects_detected: number;
  detections: Detection[];
  output_image_url: string;
  processing_time_ms: number;
  search_info?: SearchInfo | null;
}

export interface ClassesResult {
  classes: string[];
  class_map: Record<number, string>;
  total: number;
}

export async function detectObjects(file: File, searchQuery?: string): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (searchQuery && searchQuery.trim()) {
    formData.append("search", searchQuery.trim());
  }

  const res = await fetch(buildApiUrl("/detect"), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Detection failed (${res.status})`);
  }

  const data: DetectionResult = await res.json();
  const outputUrl = data.output_image_url.startsWith("http")
    ? data.output_image_url
    : buildApiUrl(data.output_image_url);

  // Force fresh output image loads after each detection run.
  data.output_image_url = withCacheBuster(outputUrl);
  return data;
}

export async function getAvailableClasses(): Promise<ClassesResult> {
  const res = await fetch(buildApiUrl("/classes"), { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch available classes");
  }
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl("/health"), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
