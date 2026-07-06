import { useRef, useState } from "react";
import FormatIcon from "./FormatIcon";
import FormatPickerPanel, { type PickerOption } from "./FormatPickerPanel";
import { formatLabel } from "../utils/formatGlyphs";

interface CompactFormatPickerProps {
  value: string | null;
  options: PickerOption[];
  onChange: (id: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

export default function CompactFormatPicker({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Pick",
}: CompactFormatPickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = value ? options.find((o) => o.id === value) : null;
  const display = selected?.label || (value ? formatLabel(value) : placeholder);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-w-[4.25rem] items-center gap-1 rounded-lg border px-2 py-1.5 transition hover:border-brand/40 hover:bg-[rgb(var(--card-hover))] ${
          value
            ? "border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)]"
            : "border-dashed border-brand/40 bg-brand/5"
        }`}
      >
        {value ? (
          <FormatIcon format={value} small />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center text-brand">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
        )}
        <span className={`text-[10px] font-bold uppercase tracking-wide ${value ? "" : "text-brand"}`}>
          {display}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-[rgb(var(--muted))] transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <FormatPickerPanel
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        value={value || options[0]?.id || "pdf"}
        onChange={(id) => {
          onChange(id);
          setOpen(false);
        }}
        anchorRef={buttonRef}
      />
    </>
  );
}
