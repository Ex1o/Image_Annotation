import { memo } from "react";
import { motion } from "framer-motion";
import {
  MousePointer2,
  Square,
  Pentagon,
  Hand,
  Undo2,
  Redo2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnnotation } from "@/contexts/AnnotationContext";
import { ToolMode } from "@/lib/annotation-types";

interface AnnotationToolbarProps {
  fileId: string | null;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolButton = memo(function ToolButton({
  icon,
  label,
  shortcut,
  isActive,
  disabled,
  onClick,
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
            isActive
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-white/70 hover:text-white hover:bg-white/10"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {icon}
          {isActive && (
            <motion.div
              layoutId="tool-indicator"
              className="absolute inset-0 rounded-lg bg-primary"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-black/20 rounded">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
});

/**
 * Professional annotation toolbar with:
 * - Tool selection (Select, BBox, Polygon, Pan)
 * - Undo/Redo controls
 * - Keyboard shortcut hints
 * - Visual active state indicators
 * - Smooth animations
 */
export const AnnotationToolbar = memo(function AnnotationToolbar({
  fileId,
}: AnnotationToolbarProps) {
  const {
    toolMode,
    setToolMode,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useAnnotation();

  const tools: Array<{
    mode: ToolMode;
    icon: React.ReactNode;
    label: string;
    shortcut: string;
  }> = [
    {
      mode: "select",
      icon: <MousePointer2 className="w-4.5 h-4.5" />,
      label: "Select & Move",
      shortcut: "V",
    },
    {
      mode: "draw-bbox",
      icon: <Square className="w-4 h-4" />,
      label: "Draw Bounding Box",
      shortcut: "B",
    },
    {
      mode: "draw-polygon",
      icon: <Pentagon className="w-4 h-4" />,
      label: "Draw Polygon",
      shortcut: "P",
    },
    {
      mode: "pan",
      icon: <Hand className="w-4 h-4" />,
      label: "Pan Canvas",
      shortcut: "Space",
    },
  ];

  const handleUndo = () => {
    if (fileId && canUndo(fileId)) {
      undo(fileId);
    }
  };

  const handleRedo = () => {
    if (fileId && canRedo(fileId)) {
      redo(fileId);
    }
  };

  return (
    <div
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-black/70 backdrop-blur-xl rounded-2xl p-2 flex flex-col gap-1 shadow-2xl border border-white/5"
      >
        {/* Tool buttons */}
        {tools.map((tool) => (
          <ToolButton
            key={tool.mode}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={toolMode === tool.mode}
            onClick={() => setToolMode(tool.mode)}
          />
        ))}

        {/* Divider */}
        <div className="h-px bg-white/10 my-1.5" />

        {/* History controls */}
        <ToolButton
          icon={<Undo2 className="w-4 h-4" />}
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!fileId || !canUndo(fileId)}
          onClick={handleUndo}
        />
        <ToolButton
          icon={<Redo2 className="w-4 h-4" />}
          label="Redo"
          shortcut="Ctrl+Y"
          disabled={!fileId || !canRedo(fileId)}
          onClick={handleRedo}
        />
      </motion.div>

      {/* Active tool indicator label */}
      <motion.div
        key={toolMode}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg"
      >
        <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">
          {toolMode === "select" && "Select"}
          {toolMode === "draw-bbox" && "Draw Box"}
          {toolMode === "draw-polygon" && "Draw Polygon"}
          {toolMode === "pan" && "Pan"}
        </span>
      </motion.div>
    </div>
  );
});
