import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X } from "lucide-react";
import { COCO_CLASSES, CLASS_PALETTE } from "@/lib/annotation-types";

interface ClassLabelPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (label: string) => void;
  onCancel: () => void;
  position: { x: number; y: number };
  currentLabel?: string;
}

/**
 * Professional class label selection popover with:
 * - Searchable list of COCO classes
 * - Color preview for each class
 * - Keyboard navigation
 * - Custom label input
 * - Smart positioning to stay in viewport
 */
export const ClassLabelPopover = ({
  open,
  onOpenChange,
  onSelect,
  onCancel,
  position,
  currentLabel,
}: ClassLabelPopoverProps) => {
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter classes based on search
  const filteredClasses = useMemo(() => {
    if (!search.trim()) return COCO_CLASSES;
    const lower = search.toLowerCase();
    return COCO_CLASSES.filter((cls) => cls.toLowerCase().includes(lower));
  }, [search]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const highlighted = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      highlighted?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredClasses.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredClasses[highlightedIndex]) {
          onSelect(filteredClasses[highlightedIndex]);
        } else if (search.trim()) {
          onSelect(search.trim());
        }
        break;
      case "Escape":
        e.preventDefault();
        onCancel();
        break;
    }
  };

  // Calculate adjusted position to keep popover in viewport
  const adjustedPosition = useMemo(() => {
    const popoverWidth = 280;
    const popoverHeight = 380;
    const padding = 16;

    let x = position.x;
    let y = position.y;

    // Adjust X to stay in viewport
    if (x + popoverWidth + padding > window.innerWidth) {
      x = window.innerWidth - popoverWidth - padding;
    }
    if (x < padding) x = padding;

    // Adjust Y to stay in viewport
    if (y + popoverHeight + padding > window.innerHeight) {
      y = position.y - popoverHeight - 10;
    }
    if (y < padding) y = padding;

    return { x, y };
  }, [position]);

  const getClassColor = (cls: string) => {
    const index = COCO_CLASSES.indexOf(cls);
    return CLASS_PALETTE[index >= 0 ? index % CLASS_PALETTE.length : 0];
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={onCancel}
          />

          {/* Popover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-50 w-[280px] bg-hero border border-upload-dashed rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: adjustedPosition.x,
              top: adjustedPosition.y,
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-upload-dashed bg-upload/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hero-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search or type custom label..."
                  className="w-full bg-hero border border-upload-dashed rounded-lg py-2 pl-9 pr-8 text-sm text-hero-foreground placeholder:text-hero-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-upload transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-hero-muted" />
                  </button>
                )}
              </div>
            </div>

            {/* Class list */}
            <div
              ref={listRef}
              className="max-h-[280px] overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-upload-dashed scrollbar-track-transparent"
            >
              {/* Custom label option */}
              {search.trim() && !filteredClasses.includes(search.trim().toLowerCase()) && (
                <button
                  onClick={() => onSelect(search.trim())}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-upload transition-colors text-left"
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-hero-muted/30"
                    style={{ backgroundColor: CLASS_PALETTE[0] }}
                  />
                  <span className="text-sm text-hero-foreground font-medium truncate">
                    Create "{search.trim()}"
                  </span>
                </button>
              )}

              {filteredClasses.length === 0 && !search.trim() && (
                <div className="px-3 py-6 text-center text-hero-muted text-sm">
                  No classes found
                </div>
              )}

              {filteredClasses.map((cls, index) => {
                const color = getClassColor(cls);
                const isHighlighted = index === highlightedIndex;
                const isCurrent = cls === currentLabel;

                return (
                  <button
                    key={cls}
                    data-index={index}
                    onClick={() => onSelect(cls)}
                    className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                      isHighlighted ? "bg-primary/10" : "hover:bg-upload"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white/10"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={`text-sm font-medium capitalize truncate flex-1 ${
                        isHighlighted ? "text-primary" : "text-hero-foreground"
                      }`}
                    >
                      {cls}
                    </span>
                    {isCurrent && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-upload-dashed bg-upload/30">
              <div className="flex items-center justify-between text-[11px] text-hero-muted">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Cancel</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
