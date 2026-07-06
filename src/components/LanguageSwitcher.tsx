import { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { UI_LANGUAGES, type Locale } from "../i18n/languages";
import { useI18n } from "../i18n/I18nContext";
import { useDropdownMotion } from "../hooks/useDropdownMotion";
import { computeDropdownPosition, type DropdownPosition } from "../utils/dropdownPosition";
import { useHoverDropdown } from "../hooks/useHoverDropdown";
import FlagIcon from "./FlagIcon";

const ITEM_HEIGHT = 40;
const PANEL_PADDING = 12;
const VIEWPORT_PAD = 8;
const PANEL_WIDTH = 200;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, currentLanguage } = useI18n();
  const menu = useHoverDropdown();
  const open = menu.open;
  const setOpen = menu.setOpen;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<(DropdownPosition & { maxHeight: number }) | null>(null);
  const { mounted, state, handleTransitionEnd } = useDropdownMotion(open, () => setPos(null));

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const naturalHeight = UI_LANGUAGES.length * ITEM_HEIGHT + PANEL_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(openUp ? spaceAbove : spaceBelow, 360, naturalHeight);

    const base = computeDropdownPosition({
      anchor: rect,
      panelHeight: maxHeight,
      width: PANEL_WIDTH,
      gap: VIEWPORT_PAD,
      viewportPad: VIEWPORT_PAD,
      align: "start",
    });

    let left = rect.right - PANEL_WIDTH;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD));

    setPos({
      ...base,
      left,
      maxHeight,
      transformOrigin: openUp ? `${rect.right - left}px ${maxHeight}px` : `${rect.right - left}px 0px`,
    });
  }, []);

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
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative" {...menu.hoverZoneProps}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Language: ${currentLanguage.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-2 py-1.5 text-sm transition sm:gap-2 ${
          open
            ? "border-brand/50 bg-brand/10"
            : "border-[rgb(var(--border))] hover:border-brand/40 hover:bg-[rgb(var(--card-hover))]"
        }`}
      >
        <FlagIcon country={currentLanguage.country} className="h-3.5 w-[1.375rem] shrink-0" />
        {!compact ? (
          <span className="max-w-[5.5rem] truncate text-xs sm:max-w-none sm:text-sm">{currentLanguage.label}</span>
        ) : (
          <span className="hidden max-w-[5.5rem] truncate text-xs min-[420px]:inline sm:max-w-none sm:text-sm">
            {currentLanguage.label}
          </span>
        )}
        <svg
          className={`h-3 w-3 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted && pos
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label="Select language"
              data-state={state}
              onTransitionEnd={handleTransitionEnd}
              {...menu.panelHoverProps}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                transformOrigin: pos.transformOrigin,
              }}
              className="dropdown-popover modern-card fixed z-[200] overflow-y-auto overscroll-contain p-1 shadow-soft-lg picker-scroll"
            >
              {UI_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={locale === lang.code}
                  onClick={() => {
                    setLocale(lang.code as Locale);
                    menu.closeMenu();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-brand/10 ${
                    locale === lang.code ? "bg-brand/10 text-brand" : ""
                  }`}
                >
                  <FlagIcon country={lang.country} className="h-3.5 w-[1.375rem]" />
                  <span className="min-w-0 flex-1 truncate">{lang.label}</span>
                  {locale === lang.code && (
                    <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-brand" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
