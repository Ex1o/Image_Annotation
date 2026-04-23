const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const buildApiUrl = (path: string) => `${API_BASE}${path}`;

const withCacheBuster = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
};

const getErrorMessage = async (res: Response): Promise<string> => {
  if (res.status === 413) {
    return "Upload is too large for the gateway. Please try a smaller image.";
  }

  if (res.status === 502) {
    return "Gateway error while contacting backend. Please retry in a few seconds.";
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await res.json().catch(() => null) as { error?: string; detail?: string } | null;
    const jsonMessage = payload?.error || payload?.detail;
    if (jsonMessage) {
      return jsonMessage;
    }
  }

  const text = await res.text().catch(() => "");
  if (text) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized) {
      return normalized.slice(0, 220);
    }
  }

  return `Request failed (${res.status})`;
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

  let res: Response;
  try {
    res = await fetch(buildApiUrl("/detect"), {
      method: "POST",
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach API gateway. Check network and backend status.");
  }

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
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
