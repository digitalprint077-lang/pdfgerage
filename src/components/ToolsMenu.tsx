import { useEffect, useRef, useCallback, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { TOOLS, type ToolDef } from "../data/catalog";
import { useI18n } from "../i18n/I18nContext";
import { useDropdownMotion } from "../hooks/useDropdownMotion";
import { computeDropdownPosition, type DropdownPosition } from "../utils/dropdownPosition";

interface ToolsMenuProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  panelHoverProps?: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

const MENU_WIDTH = 720;
const VIEWPORT_PAD = 12;

function toolPath(id: string) {
  return id === "home" ? "/" : `/tool/${id}`;
}

function IconConvert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconOptimize({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function IconMerge({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function IconTranslate({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  );
}

function IconAi({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function IconArchive({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

function ToolLink({
  tool,
  active,
  onClose,
}: {
  tool: ToolDef;
  active: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      to={toolPath(tool.id)}
      role="menuitem"
      onClick={onClose}
      className={`block rounded-md px-1 py-1.5 text-sm transition hover:text-white ${
        active ? "font-medium text-brand" : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card-hover))]"
      }`}
    >
      {tool.label}
    </Link>
  );
}

function splitInHalf(items: ToolDef[]) {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)] as const;
}

export default function ToolsMenu({ open, onClose, anchorRef, panelHoverProps }: ToolsMenuProps) {
  const { t } = useI18n();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<(DropdownPosition & { maxHeight: number }) | null>(null);
  const { mounted, state, handleTransitionEnd } = useDropdownMotion(open, () => setPos(null));

  const convertTools = TOOLS.filter((tool) => tool.group === "convert");
  const [convertCol1, convertCol2] = splitInHalf(convertTools);

  const optimizeTools = [
    ...TOOLS.filter((tool) => tool.group === "optimize"),
    ...TOOLS.filter((tool) => tool.id === "pdf-ocr"),
  ];
  const mergeTools = TOOLS.filter((tool) => tool.group === "merge");
  const translateTools = [
    ...TOOLS.filter((tool) => tool.group === "translate"),
    ...TOOLS.filter((tool) => tool.id === "image-ocr"),
  ];
  const archiveTools = TOOLS.filter((tool) => tool.group === "archives");
  const aiTools = TOOLS.filter((tool) => tool.group === "ai");

  const isActive = (id: string) => location.pathname === toolPath(id);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const maxHeight = Math.min(spaceBelow, 560);
    const base = computeDropdownPosition({
      anchor: rect,
      panelHeight: maxHeight,
      width: MENU_WIDTH,
      gap: VIEWPORT_PAD,
      viewportPad: VIEWPORT_PAD,
      align: "start",
    });
    setPos({ ...base, maxHeight });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!mounted) return;
    updatePosition();
  }, [mounted, open, updatePosition]);

  useEffect(() => {
    if (!mounted) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [mounted, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !pos) return null;

  const panelClass = "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--foreground))]";
  const sectionHeaderBorder = "border-[rgb(var(--border))]";
  const iconWrap = "flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--card-hover))] text-[rgb(var(--muted))]";

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      data-state={state}
      onTransitionEnd={handleTransitionEnd}
      {...panelHoverProps}
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxHeight,
        width: pos.width,
        transformOrigin: pos.transformOrigin,
      }}
      className={`dropdown-popover fixed z-[200] overflow-y-auto overscroll-contain rounded-2xl border p-5 shadow-2xl picker-scroll ${panelClass}`}
    >
      {/* Row 1: Convert (2 cols) + Optimize */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconConvert className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.convert")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            <div>
              {convertCol1.map((tool) => (
                <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
              ))}
            </div>
            <div>
              {convertCol2.map((tool) => (
                <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconOptimize className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.optimize")}</h3>
          </div>
          {optimizeTools.map((tool) => (
            <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
          ))}
        </div>
      </div>

      {/* Row 2: Merge + Translate + Archives */}
      <div className={`mt-6 grid gap-6 border-t pt-6 md:grid-cols-3 ${sectionHeaderBorder}`}>
        <div>
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconMerge className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.merge")}</h3>
          </div>
          {mergeTools.map((tool) => (
            <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
          ))}
        </div>

        <div>
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconTranslate className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.translate")}</h3>
          </div>
          {translateTools.map((tool) => (
            <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
          ))}
        </div>

        <div>
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconAi className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.ai")}</h3>
          </div>
          {aiTools.map((tool) => (
            <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
          ))}
        </div>

        <div>
          <div className={`mb-3 flex items-center gap-2.5 border-b pb-3 ${sectionHeaderBorder}`}>
            <span className={iconWrap}>
              <IconArchive className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">{t("toolGroups.archives")}</h3>
          </div>
          {archiveTools.map((tool) => (
            <ToolLink key={tool.id} tool={tool} active={isActive(tool.id)} onClose={onClose} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
