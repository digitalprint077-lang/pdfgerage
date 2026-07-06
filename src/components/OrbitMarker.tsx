type OrbitKind = "image" | "document" | "sheet" | "archive" | "code" | "vector" | "pdf";

export interface OrbitMarkerDef {
  id: string;
  label: string;
  kind: OrbitKind;
}

export const ORBIT_MARKERS: OrbitMarkerDef[] = [
  { id: "jpg", label: "JPG", kind: "image" },
  { id: "png", label: "PNG", kind: "image" },
  { id: "webp", label: "WEBP", kind: "image" },
  { id: "docx", label: "DOC", kind: "document" },
  { id: "xlsx", label: "XLS", kind: "sheet" },
  { id: "zip", label: "ZIP", kind: "archive" },
  { id: "html", label: "HTML", kind: "code" },
  { id: "svg", label: "SVG", kind: "vector" },
  { id: "pdf", label: "PDF", kind: "pdf" },
];

function OrbitGlyph({ kind }: { kind: OrbitKind }) {
  const cls = "h-3.5 w-3.5 shrink-0";

  switch (kind) {
    case "image":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "document":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "sheet":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
        </svg>
      );
    case "archive":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case "code":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case "vector":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case "pdf":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h1.5a1.25 1.25 0 010 2.5H9v1H8v-3.5zm3 0h1a1.5 1.5 0 010 3H11v-3zm4.25 0c.69 0 1.25.56 1.25 1.25v1c0 .69-.56 1.25-1.25 1.25H14v-3.5h1.25z" />
        </svg>
      );
  }
}

export default function OrbitMarker({
  marker,
  active,
}: {
  marker: OrbitMarkerDef;
  active?: boolean;
}) {
  return (
    <div
      className={`format-orbit-marker format-orbit-marker-${marker.kind}${active ? " format-orbit-marker-active" : ""}`}
    >
      <OrbitGlyph kind={marker.kind} />
      <span className="format-orbit-marker-label">{marker.label}</span>
    </div>
  );
}
