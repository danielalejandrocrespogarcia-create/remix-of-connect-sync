import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxItems?: number;
}

export const TagListEditor = ({ values, onChange, placeholder, suggestions = [], maxItems = 12 }: Props) => {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) return;
    if (values.length >= maxItems) return;
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
          maxLength={40}
        />
        <Button type="button" size="icon" variant="neon" onClick={() => add(draft)} aria-label="Agregar">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !values.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                + {s}
              </button>
            ))}
        </div>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 pl-2.5 pr-1 py-0.5 text-xs font-medium text-accent"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
                aria-label={`Quitar ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
