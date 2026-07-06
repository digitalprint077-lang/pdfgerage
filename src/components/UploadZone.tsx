import { useCallback, useRef, useState, useEffect } from "react";
import type { ConversionState } from "../App";
import { getAcceptTypes, inferFormatFromFile } from "../data/catalog";
import type { Operation } from "../data/catalog";
import { useI18n } from "../i18n/I18nContext";
import { OCR_LANG_OPTIONS, TRANSLATE_LANG_OPTIONS } from "../i18n/languages";
import FileJobWorkspace from "./FileJobWorkspace";
import AddFilesMenu, { type CloudProvider } from "./AddFilesMenu";
import CloudSetupModal from "./CloudSetupModal";
import SelectDropdown from "./SelectDropdown";
import ConversionPreviewModal from "./ConversionPreviewModal";
import UsageLimitBanner from "./UsageLimitBanner";
import { useUsageSnapshot } from "../hooks/useUsageSnapshot";
import {
  type ConversionResultInfo,
  downloadConversionResult,
} from "./ConversionResultBar";
import { importFromCloud, isCloudConfigured } from "../utils/cloudImport";
import { apiUrl } from "../utils/api";

const OUTPUT_FORMAT_OPTIONS = [
  { code: "txt", label: "TXT" },
  { code: "docx", label: "DOCX (scan + bordered fields)" },
  { code: "pdf", label: "PDF (searchable scan)" },
];

interface UploadZoneProps {
  operation: Operation;
  fromFormat: string;
  toFormat: string;
  selectedFiles: File[];
  onFilesSelect: (files: File[]) => void;
  status: ConversionState;
  error: string | null;
  onStatusChange: (s: ConversionState) => void;
  onError: (e: string | null) => void;
  onToFormatChange?: (fmt: string) => void;
  onFromFormatChange?: (fmt: string) => void;
  overlapHero?: boolean;
}

const labelClass = "text-[rgb(var(--muted))]";

export default function UploadZone({
  operation,
  fromFormat,
  toFormat,
  selectedFiles,
  onFilesSelect,
  status,
  error,
  onStatusChange,
  onError,
  onToFormatChange,
  onFromFormatChange,
  overlapHero,
}: UploadZoneProps) {
  const { t } = useI18n();
  const { usage, refresh: refreshUsage, isBlocked, blockVariant, limit, applyUsageResponse } =
    useUsageSnapshot();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [outputFormat, setOutputFormat] = useState<string | null>(
    toFormat !== "any" ? toFormat : operation === "ocr" ? "docx" : operation === "translate" ? "txt" : null
  );
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [ocrLang, setOcrLang] = useState("eng");
  const [translateFrom, setTranslateFrom] = useState("auto");
  const [translateTo, setTranslateTo] = useState("en");
  const [translateProgress, setTranslateProgress] = useState<{
    phase: string;
    done: number;
    total: number;
  } | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{
    phase: string;
    done: number;
    total: number;
  } | null>(null);
  const [cloudSetup, setCloudSetup] = useState<CloudProvider | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResultInfo | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const effectiveTo =
    operation === "ocr" || operation === "translate"
      ? outputFormat || (operation === "ocr" ? "docx" : "txt")
      : toFormat === "any"
        ? outputFormat
        : toFormat;
  const multiSelect = true;

  useEffect(() => {
    if (toFormat !== "any") {
      setOutputFormat(toFormat);
    } else if (operation === "ocr") {
      setOutputFormat("docx");
    } else if (operation === "translate") {
      setOutputFormat("txt");
    } else if (selectedFiles.length === 0) {
      setOutputFormat(null);
    }
  }, [toFormat, operation, selectedFiles.length]);

  const handleOutputChange = (fmt: string | null) => {
    setOutputFormat(fmt);
    if (fmt) onToFormatChange?.(fmt);
    else onToFormatChange?.("any");
  };

  const accept = getAcceptTypes(fromFormat, effectiveTo || "docx", operation);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      onFilesSelect(multiSelect ? [...selectedFiles, ...list] : list.slice(0, 1));
      onError(null);
      onStatusChange("idle");
      setConversionResult(null);
      setPreviewOpen(false);
    },
    [multiSelect, onFilesSelect, onError, onStatusChange, selectedFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return;
    onStatusChange("uploading");
    onError(null);
    try {
      const res = await fetch(apiUrl("/api/fetch-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch URL");
      const bin = atob(data.dataUrl.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const file = new File([arr], data.name, { type: "application/octet-stream" });
      handleFiles([file]);
      setShowUrl(false);
      setUrlInput("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "URL fetch failed");
    } finally {
      onStatusChange("idle");
    }
  };

  const convert = async () => {
    if (!selectedFiles.length) return;
    if (isBlocked) return;
    if (operation === "convert" && !effectiveTo) {
      onError("Please select output format");
      return;
    }
    onStatusChange("converting");
    onError(null);
    setConversionResult(null);
    setPreviewOpen(false);

    const progressId =
      operation === "translate" || operation === "ocr" ? crypto.randomUUID() : null;
    if (progressId && operation === "translate") {
      setTranslateProgress({ phase: "extracting", done: 0, total: 0 });
    }
    if (progressId && operation === "ocr") {
      setOcrProgress({ phase: "starting", done: 0, total: 0 });
    }

    const formData = new FormData();
    formData.append("operation", operation);
    selectedFiles.forEach((f) => formData.append("files", f));

    const actualFrom =
      fromFormat === "any" || operation === "ocr" || operation === "translate"
        ? inferFormatFromFile(selectedFiles[0])
        : fromFormat;

    if (operation === "convert") {
      formData.append("fromFormat", actualFrom);
      formData.append("toFormat", effectiveTo!);
    } else if (operation !== "merge" && operation !== "create-archive") {
      formData.append("fromFormat", actualFrom);
      if (effectiveTo) formData.append("toFormat", effectiveTo);
      if (operation === "ocr") formData.append("ocrLang", ocrLang);
      if (operation === "translate") {
        formData.append("translateFrom", translateFrom);
        formData.append("translateTo", translateTo);
      }
      if (progressId) formData.append("progressId", progressId);
    }

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (progressId) {
      const progressUrl =
        operation === "ocr"
          ? `/api/ocr/progress/${progressId}`
          : `/api/translate/progress/${progressId}`;
      pollTimer = setInterval(async () => {
        try {
          const pr = await fetch(apiUrl(progressUrl));
          if (!pr.ok) return;
          const data = await pr.json();
          if (operation === "ocr") setOcrProgress(data);
          else setTranslateProgress(data);
        } catch {
          /* ignore poll errors */
        }
      }, 500);
    }

    const controller = new AbortController();
    const timeoutMs = operation === "ocr" ? 10 * 60 * 1000 : 5 * 60 * 1000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(apiUrl(`/api/convert?operation=${encodeURIComponent(operation)}`), {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Conversion failed" }));
        if (res.status === 429 && (data.code === "DAILY_LIMIT" || data.code === "NO_CREDITS")) {
          applyUsageResponse(data.usage, data.code);
        }
        throw new Error(data.error || "Conversion failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || "converted";
      const outFmt =
        effectiveTo ||
        filename.split(".").pop()?.toLowerCase() ||
        "bin";

      setConversionResult({
        blob,
        filename,
        size: blob.size,
        outputFormat: outFmt,
      });
      onStatusChange("done");
      refreshUsage();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        onError(
          operation === "ocr"
            ? "OCR timed out. Try a smaller file, fewer pages, or set OCR_FAST=true on the server."
            : "Conversion timed out. Try a smaller file."
        );
      } else {
        onError(err instanceof Error ? err.message : "Conversion failed");
      }
      onStatusChange("error");
    } finally {
      clearTimeout(timeoutId);
      if (pollTimer) clearInterval(pollTimer);
      setTranslateProgress(null);
      setOcrProgress(null);
    }
  };

  const handleCloudImport = async (provider: CloudProvider) => {
    if (!isCloudConfigured(provider)) {
      setCloudSetup(provider);
      onError(null);
      return;
    }
    onError(null);
    onStatusChange("uploading");
    try {
      const file = await importFromCloud(provider);
      if (file) handleFiles([file]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Cloud import failed");
    } finally {
      onStatusChange("idle");
    }
  };

  const cloudModal = (
    <CloudSetupModal
      provider={cloudSetup}
      onClose={() => setCloudSetup(null)}
      onUseComputer={() => inputRef.current?.click()}
      onUseUrl={() => setShowUrl(true)}
    />
  );

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiSelect}
      className="hidden"
      onChange={(e) => e.target.files && handleFiles(e.target.files)}
    />
  );

  if (selectedFiles.length > 0) {
    return (
      <>
        {hiddenInput}
        {cloudModal}
        {showUrl && (
          <div className="mb-4 flex w-full max-w-md gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/file.pdf"
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />
            <button
              onClick={loadFromUrl}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              {t("load")}
            </button>
            <button
              onClick={() => setShowUrl(false)}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        <FileJobWorkspace
          operation={operation}
          files={selectedFiles}
          fromFormat={fromFormat}
          toFormat={toFormat}
          onFromFormatChange={(f) => onFromFormatChange?.(f)}
          onToFormatChange={(f) => onToFormatChange?.(f)}
          outputFormat={outputFormat}
          onOutputFormatChange={handleOutputChange}
          onRemoveFile={(i) => {
            onFilesSelect(selectedFiles.filter((_, j) => j !== i));
            setConversionResult(null);
            setPreviewOpen(false);
            onStatusChange("idle");
          }}
          onAddFiles={(files) => handleFiles(files)}
          onAddUrl={() => setShowUrl(true)}
          onCloudImport={handleCloudImport}
          onConvert={convert}
          status={status}
          error={error}
          conversionResult={conversionResult}
          onDownloadResult={() => conversionResult && downloadConversionResult(conversionResult)}
          onPreviewResult={() => setPreviewOpen(true)}
          ocrLang={ocrLang}
          onOcrLangChange={setOcrLang}
          translateFrom={translateFrom}
          translateTo={translateTo}
          onTranslateFromChange={setTranslateFrom}
          onTranslateToChange={setTranslateTo}
          translateProgress={translateProgress}
          ocrProgress={ocrProgress}
          usageBlocked={isBlocked}
          usageBlockVariant={blockVariant}
          usageLimit={limit}
        />
        {conversionResult ? (
          <ConversionPreviewModal
            result={conversionResult}
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            onDownload={() => downloadConversionResult(conversionResult)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {hiddenInput}
      {cloudModal}
    <section
      className={`modern-card relative mb-12 overflow-hidden transition ${
        overlapHero ? "home-upload-overlap" : ""
      } ${dragOver ? "border-brand/60 bg-brand/5 shadow-glow-sm" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="relative flex flex-col items-center gap-5 px-4 py-6 text-center sm:gap-6 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center gap-6">
          <svg className="h-12 w-12 text-brand" viewBox="0 0 64 64" fill="none" aria-hidden>
            <path
              d="M48 28c0-6.627-5.373-12-12-12-1.3 0-2.55.21-3.72.6C30.28 11.24 26.4 8 22 8c-6.627 0-12 5.373-12 12 0 .68.06 1.35.17 2C5.62 22.53 2 27.14 2 32.5 2 39.4 7.6 45 14.5 45H48c5.523 0 10-4.477 10-10s-4.477-10-10-10z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M32 36V24m0 0l-4 4m4-4l4 4"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("selectFileTitle")}</h2>
            <p className="text-[rgb(var(--muted))]">{t("selectFileHint")}</p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-[rgb(var(--muted))]">
              <svg className="h-3.5 w-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t("filesRemovedNote")}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {isBlocked ? (
            <div className="w-full max-w-lg">
              <UsageLimitBanner variant={blockVariant} limit={limit} />
            </div>
          ) : (
            <>
          <AddFilesMenu
            onAddFiles={() => inputRef.current?.click()}
            onAddUrl={() => setShowUrl(true)}
            onCloudImport={handleCloudImport}
            label={t("selectFiles")}
            variant="primary"
            placement="below"
          />

          {showUrl && (
            <div className="mt-2 flex w-full max-w-md gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/file.pdf"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
              <button
                onClick={loadFromUrl}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                {t("load")}
              </button>
              <button
                onClick={() => setShowUrl(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          {operation === "ocr" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <span className={labelClass}>{t("ocrLanguage")}:</span>
                  <SelectDropdown
                    value={ocrLang}
                    onChange={setOcrLang}
                    options={OCR_LANG_OPTIONS}
                    ariaLabel="OCR language"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className={labelClass}>{t("outputFormat")}:</span>
                  <SelectDropdown
                    value={outputFormat || "txt"}
                    onChange={handleOutputChange}
                    options={OUTPUT_FORMAT_OPTIONS}
                    ariaLabel="Output format"
                  />
                </label>
              </div>
              <p className="max-w-lg text-xs text-gray-500 dark:text-gray-400">
                DOCX embeds the original scan plus bordered field tables. PDF keeps the scan with selectable text. For English permits use <strong>English</strong>. Watermarked scans may take 1–3 minutes.
              </p>
            </div>
          )}

          {operation === "translate" && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <span className={labelClass}>{t("translateFrom")}:</span>
                  <SelectDropdown
                    value={translateFrom}
                    onChange={setTranslateFrom}
                    options={TRANSLATE_LANG_OPTIONS}
                    ariaLabel="Source language"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className={labelClass}>{t("translateTo")}:</span>
                  <SelectDropdown
                    value={translateTo}
                    onChange={setTranslateTo}
                    options={TRANSLATE_LANG_OPTIONS.filter((l) => l.code !== "auto")}
                    ariaLabel="Target language"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className={labelClass}>{t("outputFormat")}:</span>
                  <SelectDropdown
                    value={outputFormat || "txt"}
                    onChange={handleOutputChange}
                    options={OUTPUT_FORMAT_OPTIONS}
                    ariaLabel="Output format"
                  />
                </label>
              </div>
              <p className="max-w-md text-xs text-gray-500 dark:text-gray-400">
                Translation uses Google Translate with automatic fallbacks. OCR is powered by Tesseract on our servers.
              </p>
            </div>
          )}

          {error && !isBlocked && (
            <p className="max-w-md rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
            </>
          )}

          {!isBlocked && usage && usage.remaining > 0 && usage.plan === "free" ? (
            <p className="text-xs text-[rgb(var(--muted))]">
              {t("freeUsageRemaining")
                .replace("{remaining}", String(usage.remaining))
                .replace("{limit}", String(usage.limit))}
            </p>
          ) : null}
        </div>
      </div>
    </section>
    </>
  );
}
