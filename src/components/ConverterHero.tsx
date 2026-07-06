import { useState, useRef, useEffect } from "react";
import {
  ALL_INPUT_FORMAT_OPTIONS,
  ALL_OUTPUT_FORMAT_OPTIONS,
} from "../data/formats";
import type { Operation } from "../data/catalog";
import FormatIcon from "./FormatIcon";
import FormatPickerPanel, { type PickerOption } from "./FormatPickerPanel";

interface ConverterHeroProps {
  title: string;
  subtitle: string;
  fromFormat: string;
  toFormat: string;
  operation: Operation;
  onFromChange: (f: string) => void;
  onToChange: (f: string) => void;
  onOperationChange?: (op: Operation) => void;
  hideFormatPickers?: boolean;
  hasFiles?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
  onFormatInteraction?: () => void;
}

type OpenPicker = "from" | "to" | null;

function useFlipAnimation(value: string) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    setPhase("out");
    const outTimer = setTimeout(() => {
      setDisplay(value);
      setPhase("in");
      prev.current = value;
    }, 280);
    const idleTimer = setTimeout(() => setPhase("idle"), 730);
    return () => {
      clearTimeout(outTimer);
      clearTimeout(idleTimer);
    };
  }, [value]);

  return { display, phase };
}

function FormatCard({
  value,
  label,
  open,
  onClick,
  ariaLabel,
  cardRef,
}: {
  value: string;
  label: string;
  open?: boolean;
  onClick: () => void;
  ariaLabel: string;
  cardRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { display, phase } = useFlipAnimation(value);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={open}
      className={`group/card relative flex h-[5.25rem] w-[4.75rem] cursor-pointer flex-col items-center justify-between rounded-xl border px-1 pb-1 pt-2.5 transition duration-200 sm:h-[6.75rem] sm:w-24 sm:px-1.5 sm:pb-1.5 sm:pt-3 ${
        open
          ? "border-brand/50 bg-[rgb(var(--format-card-hover))] shadow-[0_0_24px_rgba(239,68,68,0.22)] dark:shadow-[0_0_24px_rgba(239,68,68,0.28)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--format-card))] shadow-soft hover:border-brand/25 hover:bg-[rgb(var(--format-card-hover))]"
      }`}
      style={{ perspective: "1000px" }}
    >
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-2 ${
          phase === "out" ? "animate-card-flip-out" : phase === "in" ? "animate-card-flip-in" : ""
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <FormatIcon format={display} />
        <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--format-card-text))]">
          {label}
        </span>
      </div>
      <svg
        className={`h-3.5 w-3.5 text-[rgb(var(--format-card-text)/0.55)] transition ${open ? "rotate-180 text-brand" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function FormatSelector({
  value,
  options,
  onChange,
  label,
  open,
  onOpen,
  onClose,
}: {
  value: string;
  options: PickerOption[];
  onChange: (id: string) => void;
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.id === value) || options[0];

  return (
    <>
      <FormatCard
        cardRef={cardRef}
        value={selected?.id || value}
        label={selected?.label || value.toUpperCase()}
        open={open}
        onClick={() => (open ? onClose() : onOpen())}
        ariaLabel={`${label}: ${selected?.label || value}. Click to change.`}
      />
      <FormatPickerPanel
        open={open}
        onClose={onClose}
        options={options}
        value={value}
        onChange={onChange}
        anchorRef={cardRef}
      />
    </>
  );
}

function ConvertArrow({ onSwap }: { onSwap?: () => void }) {
  return (
    <div className="relative mx-0.5 flex shrink-0 flex-col items-center gap-1 sm:mx-1 sm:gap-1.5">
      <div className="flex items-center">
        <span className="convert-sync-line h-px w-3 sm:w-5" aria-hidden />
        <button
          type="button"
          aria-label="Swap input and output formats"
          onClick={onSwap}
          className="group/op relative mx-0.5 flex size-8 shrink-0 items-center justify-center bg-transparent p-0 sm:size-10"
        >
          <span className="convert-sync-glow pointer-events-none absolute inset-0 rounded-full" aria-hidden />
          <span className="convert-sync-circle relative flex size-8 items-center justify-center rounded-full border bg-[rgb(var(--sync-bg))] sm:size-10">
            <span
              className="convert-sync-ring pointer-events-none absolute inset-[2px] rounded-full border-2 border-transparent sm:inset-[3px]"
              aria-hidden
            />
            <svg
              className="relative z-[1] size-4 text-[rgb(var(--sync-icon))] sm:size-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </span>
        </button>
        <span className="convert-sync-line-reverse h-px w-3 sm:w-5" aria-hidden />
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--foreground))] sm:text-[10px] sm:tracking-[0.25em]">
        to
      </span>
    </div>
  );
}

function ToolBadge({ operation }: { operation: Operation }) {
  const labels: Record<Operation, string> = {
    convert: "Convert",
    merge: "Merge PDFs",
    compress: "Compress",
    extract: "Extract",
    "create-archive": "Create ZIP",
    ocr: "OCR",
    translate: "Translate",
  };
  return (
    <span className="mb-3 inline-block rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
      {labels[operation]}
    </span>
  );
}

function FormatPickerRow({
  fromFormat,
  toFormat,
  operation,
  onFromChange,
  onToChange,
  onPickerOpenChange,
  onFormatInteraction,
}: {
  fromFormat: string;
  toFormat: string;
  operation: Operation;
  onFromChange: (f: string) => void;
  onToChange: (f: string) => void;
  onPickerOpenChange?: (open: boolean) => void;
  onFormatInteraction?: () => void;
}) {
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);

  useEffect(() => {
    onPickerOpenChange?.(openPicker !== null);
  }, [openPicker, onPickerOpenChange]);

  const fromOptions: PickerOption[] = ALL_INPUT_FORMAT_OPTIONS;
  const toOptions: PickerOption[] = ALL_OUTPUT_FORMAT_OPTIONS;

  const handleFromChange = (f: string) => {
    onFormatInteraction?.();
    onFromChange(f);
    if (f === toFormat) {
      onToChange("any");
    }
  };

  const handleToChange = (f: string) => {
    onFormatInteraction?.();
    onToChange(f);
    if (f !== "any" && f === fromFormat) {
      const fallback = fromOptions.find((o) => o.id !== f);
      if (fallback) onFromChange(fallback.id);
    }
  };

  const swapFormats = () => {
    onFormatInteraction?.();
    let newFrom = toFormat;
    let newTo = fromFormat;
    if (newFrom === "any") newFrom = "pdf";
    if (newTo === "any") newTo = "pdf";
    onFromChange(newFrom);
    onToChange(newTo);
    setOpenPicker(null);
  };

  const openFrom = () => {
    setOpenPicker("from");
  };

  const openTo = () => {
    setOpenPicker("to");
  };

  return (
    <div className="relative flex w-full shrink-0 items-center justify-center gap-0 sm:w-auto sm:justify-start">
      <FormatSelector
        value={fromFormat}
        options={fromOptions}
        onChange={handleFromChange}
        label="Input format"
        open={openPicker === "from"}
        onOpen={openFrom}
        onClose={() => setOpenPicker(null)}
      />
      <ConvertArrow onSwap={operation === "convert" ? swapFormats : undefined} />
      <FormatSelector
        value={toFormat}
        options={toOptions}
        onChange={handleToChange}
        label="Output format"
        open={openPicker === "to"}
        onOpen={openTo}
        onClose={() => setOpenPicker(null)}
      />
    </div>
  );
}

export default function ConverterHero({
  title,
  subtitle,
  fromFormat,
  toFormat,
  operation,
  onFromChange,
  onToChange,
  hideFormatPickers,
  hasFiles,
  onPickerOpenChange,
  onFormatInteraction,
}: ConverterHeroProps) {
  return (
    <section className="relative mb-10">
      <div className="pointer-events-none absolute -right-8 top-0 hidden overflow-hidden lg:block">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-[280px] rounded-full border border-white/[0.05] animate-orbit-slow sm:size-[320px]" />
          <div className="absolute size-[220px] rounded-full border border-white/[0.04] animate-orbit-fast" />
        </div>
      </div>

      <div
        className={`relative flex flex-col gap-6 sm:gap-8 ${hasFiles ? "mb-4" : "mb-6 sm:mb-8 lg:flex-row lg:items-start lg:justify-between"}`}
      >
        {!hasFiles && (
          <div className="max-w-xl">
            {operation !== "convert" && <ToolBadge operation={operation} />}
            <h1 className="mb-3 text-3xl font-bold leading-[1.1] tracking-tight sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[rgb(var(--muted))] sm:text-lg">{subtitle}</p>
          </div>
        )}

        {!hideFormatPickers && !hasFiles && (
          <div className="flex w-full justify-center lg:justify-end">
            <FormatPickerRow
            fromFormat={fromFormat}
            toFormat={toFormat}
            operation={operation}
            onFromChange={onFromChange}
            onToChange={onToChange}
            onPickerOpenChange={onPickerOpenChange}
            onFormatInteraction={onFormatInteraction}
          />
          </div>
        )}
      </div>

      {!hideFormatPickers && hasFiles && (
        <div className="mb-6 flex justify-center">
          <FormatPickerRow
            fromFormat={fromFormat}
            toFormat={toFormat}
            operation={operation}
            onFromChange={onFromChange}
            onToChange={onToChange}
            onPickerOpenChange={onPickerOpenChange}
            onFormatInteraction={onFormatInteraction}
          />
        </div>
      )}
    </section>
  );
}

export { FormatIcon };
