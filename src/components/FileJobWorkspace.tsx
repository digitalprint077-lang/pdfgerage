import { useRef } from "react";
import type { ConversionState } from "../App";
import type { Operation } from "../data/catalog";
import { inferFormatFromFile } from "../data/catalog";
import FormatIcon from "./FormatIcon";
import AddFilesMenu, { type CloudProvider } from "./AddFilesMenu";
import ConversionResultBar, { type ConversionResultInfo } from "./ConversionResultBar";
import { formatFileTypeLabel } from "../utils/outputFormats";
import { useI18n } from "../i18n/I18nContext";
import { OCR_LANG_OPTIONS, TRANSLATE_LANG_OPTIONS } from "../i18n/languages";
import SelectDropdown from "./SelectDropdown";

const OUTPUT_FORMAT_OPTIONS = [
  { code: "txt", label: "TXT" },
  { code: "docx", label: "DOCX" },
];

interface FileJobWorkspaceProps {
  operation: Operation;
  files: File[];
  outputFormat: string | null;
  onOutputFormatChange: (fmt: string) => void;
  onRemoveFile: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onAddUrl: () => void;
  onCloudImport?: (provider: CloudProvider) => void;
  onConvert: () => void;
  status: ConversionState;
  error: string | null;
  conversionResult?: ConversionResultInfo | null;
  onDownloadResult?: () => void;
  onPreviewResult?: () => void;
  ocrLang: string;
  onOcrLangChange: (v: string) => void;
  translateFrom: string;
  translateTo: string;
  onTranslateFromChange: (v: string) => void;
  onTranslateToChange: (v: string) => void;
  translateProgress?: { phase: string; done: number; total: number } | null;
  ocrProgress?: { phase: string; done: number; total: number } | null;
}

export default function FileJobWorkspace({
  operation,
  files,
  outputFormat,
  onOutputFormatChange,
  onRemoveFile,
  onAddFiles,
  onAddUrl,
  onCloudImport,
  onConvert,
  status,
  error,
  conversionResult,
  onDownloadResult,
  onPreviewResult,
  ocrLang,
  onOcrLangChange,
  translateFrom,
  translateTo,
  onTranslateFromChange,
  onTranslateToChange,
  translateProgress,
  ocrProgress,
}: FileJobWorkspaceProps) {
  const { t } = useI18n();
  const addInputRef = useRef<HTMLInputElement>(null);

  const primary = files[0];
  const actualFrom = primary ? inferFormatFromFile(primary) : "pdf";
  const displayOutput = conversionResult?.outputFormat || outputFormat;
  const needsFormat = operation === "convert" && !outputFormat;
  const isDone = status === "done" && conversionResult;
  const isConverting = status === "converting";

  const canConvert =
    operation === "merge"
      ? files.length >= 2
      : operation === "create-archive"
        ? files.length >= 1
        : operation === "ocr" || operation === "translate"
          ? true
          : !needsFormat;

  const convertLabel =
    operation === "merge"
      ? t("mergePdfs")
      : operation === "ocr"
        ? t("runOcr")
        : operation === "translate"
          ? t("translateDoc")
          : t("convert");

  const statusMessage = needsFormat
    ? "Please select output format"
    : isConverting
      ? t("working")
      : error
        ? error
        : null;

  return (
    <div className="mb-12">
      <section className="modern-card overflow-hidden shadow-glow-sm">
      <input
        ref={addInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAddFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {/* Source file rows */}
      {files.map((file, i) => {
        const fmt = inferFormatFromFile(file);
        const showFormatFlow =
          (operation === "convert" && i === 0 && displayOutput) ||
          (isDone && i === 0 && displayOutput);

        return (
          <div
            key={`${file.name}-${i}`}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3 sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FormatIcon format={fmt} small />
              <div className="min-w-0">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-xs text-[rgb(var(--muted))]">{formatFileTypeLabel(fmt)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {!isConverting ? (
                <button
                  type="button"
                  onClick={onConvert}
                  disabled={!canConvert || isConverting}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--card-hover))] hover:text-brand disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {convertLabel}
                </button>
              ) : null}

              {showFormatFlow ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)] p-1">
                    <FormatIcon format={actualFrom} small />
                  </span>
                  <svg className="h-3.5 w-3.5 text-[rgb(var(--muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="inline-flex rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)] p-1">
                    <FormatIcon format={displayOutput!} small />
                  </span>
                </div>
              ) : null}

              {(operation === "ocr" || operation === "translate") && i === 0 && !isDone && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {operation === "ocr" && (
                    <SelectDropdown
                      value={ocrLang}
                      onChange={onOcrLangChange}
                      options={OCR_LANG_OPTIONS}
                      ariaLabel="OCR language"
                      compact
                    />
                  )}
                  {operation === "translate" && (
                    <>
                      <SelectDropdown
                        value={translateFrom}
                        onChange={onTranslateFromChange}
                        options={TRANSLATE_LANG_OPTIONS}
                        ariaLabel="Source language"
                        compact
                      />
                      <span className="text-[rgb(var(--muted))]">→</span>
                      <SelectDropdown
                        value={translateTo}
                        onChange={onTranslateToChange}
                        options={TRANSLATE_LANG_OPTIONS.filter((l) => l.code !== "auto")}
                        ariaLabel="Target language"
                        compact
                      />
                    </>
                  )}
                  <SelectDropdown
                    value={outputFormat || "txt"}
                    onChange={onOutputFormatChange}
                    options={OUTPUT_FORMAT_OPTIONS}
                    ariaLabel="Output format"
                    compact
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                className="rounded-lg p-1.5 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--card-hover))] hover:text-[rgb(var(--foreground))]"
                aria-label="Remove file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {/* Finished result row */}
      {isDone && conversionResult && onDownloadResult && onPreviewResult ? (
        <ConversionResultBar
          result={conversionResult}
          onDownload={onDownloadResult}
          onPreview={onPreviewResult}
        />
      ) : null}

      {/* Converting progress */}
      {isConverting ? (
        <div className="flex min-h-[160px] items-center justify-center bg-[rgb(var(--card-hover)/0.35)] px-6 py-10">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-[rgb(var(--muted))]">
            <Spinner large />
            {operation === "translate" && translateProgress ? (
              <>
                <p className="text-center text-sm">
                  {translateProgress.phase === "extracting"
                    ? "Extracting text from document…"
                    : translateProgress.total > 0
                      ? `Translating… ${translateProgress.done} / ${translateProgress.total}`
                      : t("working")}
                </p>
                {translateProgress.total > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--border)/0.5)]">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{
                        width: `${Math.max(4, (translateProgress.done / translateProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </>
            ) : operation === "ocr" && ocrProgress ? (
              <>
                <p className="text-center text-sm">
                  {ocrProgress.phase === "starting"
                    ? "Preparing OCR…"
                    : ocrProgress.total > 0
                      ? `Reading pages… ${Math.min(ocrProgress.done + 1, ocrProgress.total)} / ${ocrProgress.total}`
                      : ocrProgress.done > 0
                        ? `Reading page ${ocrProgress.done + 1}…`
                        : t("working")}
                </p>
                {ocrProgress.total > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--border)/0.5)]">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{
                        width: `${Math.max(4, (ocrProgress.done / ocrProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p>{t("working")}</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Footer — pre-convert only */}
      {!isDone ? (
        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card-hover)/0.5)] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {needsFormat && (
              <svg className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={error ? "text-red-400" : "text-[rgb(var(--muted))]"}>
              {statusMessage || (canConvert ? "Ready to convert" : "Add more files")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AddFilesMenu
              onAddFiles={() => addInputRef.current?.click()}
              onAddUrl={onAddUrl}
              onCloudImport={onCloudImport}
              placement="above"
            />
            <button
              type="button"
              onClick={onConvert}
              disabled={!canConvert || isConverting}
              className="btn-primary gap-2 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConverting ? (
                <Spinner />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {convertLabel}
            </button>
          </div>
          </div>
          <p className="mt-2 text-center text-xs text-[rgb(var(--muted))] sm:text-left">{t("filesRemovedNote")}</p>
        </div>
      ) : null}
      </section>

      {/* Gap + Done toolbar (CloudConvert-style) */}
      {isDone ? (
        <>
          <div className="min-h-[12rem] sm:min-h-[14rem]" aria-hidden />
          <section className="modern-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-glow-sm sm:px-5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Done
            </div>
            <AddFilesMenu
              onAddFiles={() => addInputRef.current?.click()}
              onAddUrl={onAddUrl}
              onCloudImport={onCloudImport}
              placement="above"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function Spinner({ large }: { large?: boolean }) {
  return (
    <svg className={`animate-spin ${large ? "h-8 w-8" : "h-4 w-4"}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
