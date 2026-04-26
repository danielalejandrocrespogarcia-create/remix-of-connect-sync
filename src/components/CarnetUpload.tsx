import { useRef, useState } from "react";
import { Upload, X, Loader2, IdCard, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CarnetUploadProps {
  /** Object URL or signed URL preview to show */
  previewUrl?: string | null;
  /** Called with the picked file (validated). Parent decides what to do (preview or upload). */
  onFileSelected: (file: File) => void;
  /** Called when user clears selection */
  onClear?: () => void;
  /** Show loading state */
  loading?: boolean;
  /** Click on preview opens it in new tab */
  onView?: () => void;
  className?: string;
  label?: string;
  hint?: string;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export const CarnetUpload = ({
  previewUrl,
  onFileSelected,
  onClear,
  loading,
  onView,
  className,
  label = "Foto del carné estudiantil",
  hint = "JPG, PNG o WEBP · máx 5 MB",
}: CarnetUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato no válido. Usa JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen pesa más de 5 MB.");
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        {previewUrl && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Quitar
          </button>
        )}
      </div>

      {previewUrl ? (
        <div className="neon-card relative overflow-hidden p-0">
          <img
            src={previewUrl}
            alt="Carné estudiantil"
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent p-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
              <IdCard className="h-3.5 w-3.5" /> Carné cargado
            </span>
            <div className="flex gap-2">
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="inline-flex items-center gap-1 rounded-lg bg-secondary/80 px-2 py-1 text-xs hover:bg-secondary"
                >
                  <Eye className="h-3 w-3" /> Ver
                </button>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground"
              >
                <Upload className="h-3 w-3" /> Cambiar
              </button>
            </div>
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "neon-card flex h-36 w-full flex-col items-center justify-center gap-2 border-dashed text-center transition-all",
            drag && "border-accent bg-accent/5",
            loading && "pointer-events-none opacity-60"
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <IdCard className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">
                Toca para subir tu <span className="neon-text">carné</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{hint}</p>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
};
