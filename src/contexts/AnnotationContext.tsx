import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Annotation,
  ToolMode,
  HistorySnapshot,
  DrawingState,
  generateAnnotationId,
  getClassColor,
} from "@/lib/annotation-types";
import { Detection } from "@/lib/api";

const MAX_HISTORY_SIZE = 50;

interface FileAnnotationState {
  annotations: Annotation[];
  history: HistorySnapshot[];
  historyIndex: number;
  selectedId: string | null;
}

interface AnnotationContextType {
  // State per file
  getAnnotations: (fileId: string) => Annotation[];
  getSelectedId: (fileId: string) => string | null;

  // Tool mode (global)
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  // Drawing state
  drawingState: DrawingState;
  setDrawingState: (state: DrawingState) => void;
  resetDrawingState: () => void;

  // Annotation CRUD
  addAnnotation: (fileId: string, annotation: Annotation) => void;
  updateAnnotation: (fileId: string, id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (fileId: string, id: string) => void;
  setSelectedAnnotation: (fileId: string, id: string | null) => void;

  // History
  undo: (fileId: string) => void;
  redo: (fileId: string) => void;
  canUndo: (fileId: string) => boolean;
  canRedo: (fileId: string) => boolean;

  // YOLO integration
  importYoloDetections: (fileId: string, detections: Detection[]) => void;

  // Clear annotations for a file
  clearAnnotations: (fileId: string) => void;
}

const AnnotationContext = createContext<AnnotationContextType | null>(null);

export const useAnnotation = () => {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error("useAnnotation must be used within AnnotationProvider");
  return ctx;
};

const initialDrawingState: DrawingState = {
  isDrawing: false,
  startPoint: null,
  currentPoint: null,
  polygonPoints: [],
};

const createInitialFileState = (): FileAnnotationState => ({
  annotations: [],
  history: [],
  historyIndex: -1,
  selectedId: null,
});

const LABEL_IOU_THRESHOLD = 0.35;

const getIoU = (
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): number => {
  const interX1 = Math.max(a.x1, b.x1);
  const interY1 = Math.max(a.y1, b.y1);
  const interX2 = Math.min(a.x2, b.x2);
  const interY2 = Math.min(a.y2, b.y2);
  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const inter = interW * interH;
  const areaA = Math.max(0, (a.x2 - a.x1) * (a.y2 - a.y1));
  const areaB = Math.max(0, (b.x2 - b.x1) * (b.y2 - b.y1));
  const union = areaA + areaB - inter;
  return union <= 0 ? 0 : inter / union;
};

const buildYoloAnnotations = (detections: Detection[]): Annotation[] => {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const visiblePerClass = new Map<string, Annotation[]>();

  return sorted.map((det) => {
    const overlaps = (visiblePerClass.get(det.class) ?? []).some((ann) => {
      if (ann.geometry.type !== "bbox") return false;
      return getIoU(ann.geometry.data, det.box) >= LABEL_IOU_THRESHOLD;
    });

    const annotation: Annotation = {
      id: generateAnnotationId(),
      label: det.class,
      color: det.color,
      geometry: {
        type: "bbox",
        data: { ...det.box },
      },
      source: {
        type: "yolo",
        confidence: det.confidence,
      },
      hideLabel: overlaps,
    };

    if (!overlaps) {
      const existing = visiblePerClass.get(det.class) ?? [];
      existing.push(annotation);
      visiblePerClass.set(det.class, existing);
    }

    return annotation;
  });
};

export const AnnotationProvider = ({ children }: { children: ReactNode }) => {
  const [fileStates, setFileStates] = useState<Record<string, FileAnnotationState>>({});
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [drawingState, setDrawingState] = useState<DrawingState>(initialDrawingState);

  const resetDrawingState = useCallback(() => {
    setDrawingState(initialDrawingState);
  }, []);

  const getFileState = useCallback(
    (fileId: string): FileAnnotationState => {
      return fileStates[fileId] ?? createInitialFileState();
    },
    [fileStates]
  );

  const getAnnotations = useCallback(
    (fileId: string): Annotation[] => {
      return getFileState(fileId).annotations;
    },
    [getFileState]
  );

  const getSelectedId = useCallback(
    (fileId: string): string | null => {
      return getFileState(fileId).selectedId;
    },
    [getFileState]
  );

  // Push current state to history before making changes
  const pushToHistory = useCallback(
    (fileId: string, currentAnnotations: Annotation[]): HistorySnapshot[] => {
      const state = getFileState(fileId);
      const newSnapshot: HistorySnapshot = {
        annotations: JSON.parse(JSON.stringify(currentAnnotations)),
        timestamp: Date.now(),
      };

      // If we're not at the end of history, truncate forward history
      let newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newSnapshot);

      // Cap history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
      }

      return newHistory;
    },
    [getFileState]
  );

  const addAnnotation = useCallback(
    (fileId: string, annotation: Annotation) => {
      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        const newHistory = pushToHistory(fileId, state.annotations);
        const newAnnotations = [...state.annotations, annotation];

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: newAnnotations,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            selectedId: annotation.id,
          },
        };
      });
    },
    [pushToHistory]
  );

  const updateAnnotation = useCallback(
    (fileId: string, id: string, updates: Partial<Annotation>) => {
      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        const newHistory = pushToHistory(fileId, state.annotations);
        const newAnnotations = state.annotations.map((ann) =>
          ann.id === id ? { ...ann, ...updates } : ann
        );

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: newAnnotations,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
        };
      });
    },
    [pushToHistory]
  );

  const deleteAnnotation = useCallback(
    (fileId: string, id: string) => {
      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        const newHistory = pushToHistory(fileId, state.annotations);
        const newAnnotations = state.annotations.filter((ann) => ann.id !== id);

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: newAnnotations,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            selectedId: state.selectedId === id ? null : state.selectedId,
          },
        };
      });
    },
    [pushToHistory]
  );

  const setSelectedAnnotation = useCallback((fileId: string, id: string | null) => {
    setFileStates((prev) => {
      const state = prev[fileId] ?? createInitialFileState();
      return {
        ...prev,
        [fileId]: {
          ...state,
          selectedId: id,
        },
      };
    });
  }, []);

  const canUndo = useCallback(
    (fileId: string): boolean => {
      const state = getFileState(fileId);
      return state.historyIndex >= 0;
    },
    [getFileState]
  );

  const canRedo = useCallback(
    (fileId: string): boolean => {
      const state = getFileState(fileId);
      return state.historyIndex < state.history.length - 1;
    },
    [getFileState]
  );

  const undo = useCallback(
    (fileId: string) => {
      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        if (state.historyIndex < 0) return prev;

        const snapshot = state.history[state.historyIndex];
        const newAnnotations = JSON.parse(JSON.stringify(snapshot.annotations));

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: newAnnotations,
            historyIndex: state.historyIndex - 1,
            selectedId: null,
          },
        };
      });
    },
    []
  );

  const redo = useCallback(
    (fileId: string) => {
      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        if (state.historyIndex >= state.history.length - 1) return prev;

        const nextIndex = state.historyIndex + 1;
        // Get the state AFTER the action we want to redo
        const nextSnapshot = state.history[nextIndex];

        // For redo, we need to look at what the state should be after this action
        // So we look at the next snapshot if it exists, otherwise current annotations
        let newAnnotations: Annotation[];
        if (nextIndex + 1 < state.history.length) {
          // There's another snapshot after this - the current snapshot represents the state before an action
          // We need to apply the action by going to the next state
          newAnnotations = JSON.parse(JSON.stringify(state.history[nextIndex + 1]?.annotations ?? nextSnapshot.annotations));
        } else {
          // This is the last snapshot - just restore to current annotations would undo
          // Actually for redo at the end, the annotations are what they would become
          newAnnotations = JSON.parse(JSON.stringify(nextSnapshot.annotations));
        }

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: newAnnotations,
            historyIndex: nextIndex,
            selectedId: null,
          },
        };
      });
    },
    []
  );

  const importYoloDetections = useCallback(
    (fileId: string, detections: Detection[]) => {
      const newAnnotations = buildYoloAnnotations(detections);

      setFileStates((prev) => {
        const state = prev[fileId] ?? createInitialFileState();
        const newHistory = pushToHistory(fileId, state.annotations);
        const manualAnnotations = state.annotations.filter((ann) => ann.source.type !== "yolo");
        const combinedAnnotations = [...manualAnnotations, ...newAnnotations];

        return {
          ...prev,
          [fileId]: {
            ...state,
            annotations: combinedAnnotations,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
        };
      });
    },
    [pushToHistory]
  );

  const clearAnnotations = useCallback((fileId: string) => {
    setFileStates((prev) => {
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  }, []);

  return (
    <AnnotationContext.Provider
      value={{
        getAnnotations,
        getSelectedId,
        toolMode,
        setToolMode,
        drawingState,
        setDrawingState,
        resetDrawingState,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        setSelectedAnnotation,
        undo,
        redo,
        canUndo,
        canRedo,
        importYoloDetections,
        clearAnnotations,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
};
