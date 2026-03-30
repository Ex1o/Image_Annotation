import { useCallback, useRef, useState, DragEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}

const UploadZone = ({ onFilesSelected, compact = false }: UploadZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 group",
        compact
          ? "p-6 border-border bg-muted/30 hover:border-primary/40"
          : "p-12 border-upload-dashed bg-upload/60 backdrop-blur-sm hover:border-primary/50",
        dragging && "border-primary bg-primary/5 scale-[1.01]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          "rounded-full flex items-center justify-center transition-colors",
          compact
            ? "w-10 h-10 bg-accent group-hover:bg-primary/10"
            : "w-14 h-14 bg-primary/10 group-hover:bg-primary/20"
        )}
      >
        <ArrowUp className={cn("text-primary", compact ? "w-5 h-5" : "w-6 h-6")} />
      </div>
      <p className={cn("font-medium", compact ? "text-sm text-foreground" : "text-hero-foreground")}>
        Upload an image 
      </p>
      <p className={cn("text-sm", compact ? "text-muted-foreground" : "text-hero-muted")}>
        Images will be annotated in a few seconds.
      </p>
    </div>
  );
};

export default UploadZone;
