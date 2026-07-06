import { formatGlyphKind, formatLabel, formatToneClass, FormatGlyph } from "../utils/formatGlyphs";

export default function FormatIcon({
  format,
  small,
  showLabel,
}: {
  format: string;
  small?: boolean;
  showLabel?: boolean;
}) {
  const kind = formatGlyphKind(format);
  const size = small ? "h-4 w-4" : "h-7 w-7";
  const label = formatLabel(format);

  return (
    <div
      className={`flex items-center justify-center gap-1.5 transition-transform duration-300 group-hover/card:scale-110 ${formatToneClass(kind)} ${small && !showLabel ? "h-6 w-6" : ""}`}
    >
      <FormatGlyph kind={kind} className={size} />
      {showLabel ? (
        <span className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">{label}</span>
      ) : null}
    </div>
  );
}
