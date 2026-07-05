export type FormatCategory =
  | "document"
  | "image"
  | "spreadsheet"
  | "presentation"
  | "ebook"
  | "archive"
  | "vector"
  | "cad"
  | "font";

export type Operation =
  | "convert"
  | "merge"
  | "compress"
  | "extract"
  | "create-archive"
  | "ocr"
  | "translate";

export interface FormatDef {
  id: string;
  label: string;
  category: FormatCategory;
}

export const CATEGORIES: { id: FormatCategory; label: string; count: number }[] = [
  { id: "document", label: "Documents", count: 23 },
  { id: "image", label: "Images", count: 42 },
  { id: "spreadsheet", label: "Spreadsheets", count: 4 },
  { id: "presentation", label: "Slides", count: 11 },
  { id: "ebook", label: "E-books", count: 21 },
  { id: "archive", label: "Archives", count: 35 },
  { id: "vector", label: "Vector", count: 10 },
  { id: "cad", label: "CAD", count: 3 },
  { id: "font", label: "Fonts", count: 3 },
];

export const ALL_FORMATS: FormatDef[] = [
  // Documents
  { id: "abw", label: "ABW", category: "document" },
  { id: "djvu", label: "DJVU", category: "document" },
  { id: "doc", label: "DOC", category: "document" },
  { id: "docm", label: "DOCM", category: "document" },
  { id: "docx", label: "DOCX", category: "document" },
  { id: "dot", label: "DOT", category: "document" },
  { id: "dotx", label: "DOTX", category: "document" },
  { id: "html", label: "HTML", category: "document" },
  { id: "hwp", label: "HWP", category: "document" },
  { id: "hwpx", label: "HWPX", category: "document" },
  { id: "lwp", label: "LWP", category: "document" },
  { id: "md", label: "MD", category: "document" },
  { id: "odt", label: "ODT", category: "document" },
  { id: "pages", label: "PAGES", category: "document" },
  { id: "pdf", label: "PDF", category: "document" },
  { id: "rst", label: "RST", category: "document" },
  { id: "rtf", label: "RTF", category: "document" },
  { id: "sdw", label: "SDW", category: "document" },
  { id: "tex", label: "TEX", category: "document" },
  { id: "txt", label: "TXT", category: "document" },
  { id: "wpd", label: "WPD", category: "document" },
  { id: "wps", label: "WPS", category: "document" },
  { id: "zabw", label: "ZABW", category: "document" },
  // Images
  { id: "3fr", label: "3FR", category: "image" },
  { id: "arw", label: "ARW", category: "image" },
  { id: "avif", label: "AVIF", category: "image" },
  { id: "bmp", label: "BMP", category: "image" },
  { id: "cr2", label: "CR2", category: "image" },
  { id: "cr3", label: "CR3", category: "image" },
  { id: "crw", label: "CRW", category: "image" },
  { id: "dcr", label: "DCR", category: "image" },
  { id: "dng", label: "DNG", category: "image" },
  { id: "eps", label: "EPS", category: "image" },
  { id: "erf", label: "ERF", category: "image" },
  { id: "gif", label: "GIF", category: "image" },
  { id: "heic", label: "HEIC", category: "image" },
  { id: "heif", label: "HEIF", category: "image" },
  { id: "icns", label: "ICNS", category: "image" },
  { id: "ico", label: "ICO", category: "image" },
  { id: "jfif", label: "JFIF", category: "image" },
  { id: "jpeg", label: "JPEG", category: "image" },
  { id: "jpg", label: "JPG", category: "image" },
  { id: "mos", label: "MOS", category: "image" },
  { id: "mrw", label: "MRW", category: "image" },
  { id: "nef", label: "NEF", category: "image" },
  { id: "odd", label: "ODD", category: "image" },
  { id: "odg", label: "ODG", category: "image" },
  { id: "orf", label: "ORF", category: "image" },
  { id: "pef", label: "PEF", category: "image" },
  { id: "png", label: "PNG", category: "image" },
  { id: "ppm", label: "PPM", category: "image" },
  { id: "ps", label: "PS", category: "image" },
  { id: "psb", label: "PSB", category: "image" },
  { id: "psd", label: "PSD", category: "image" },
  { id: "pub", label: "PUB", category: "image" },
  { id: "raf", label: "RAF", category: "image" },
  { id: "raw", label: "RAW", category: "image" },
  { id: "rw2", label: "RW2", category: "image" },
  { id: "tga", label: "TGA", category: "image" },
  { id: "tif", label: "TIF", category: "image" },
  { id: "tiff", label: "TIFF", category: "image" },
  { id: "webp", label: "WEBP", category: "image" },
  { id: "x3f", label: "X3F", category: "image" },
  { id: "xcf", label: "XCF", category: "image" },
  { id: "xps", label: "XPS", category: "image" },
  // Spreadsheets
  { id: "xlsx", label: "XLSX", category: "spreadsheet" },
  { id: "xls", label: "XLS", category: "spreadsheet" },
  { id: "ods", label: "ODS", category: "spreadsheet" },
  { id: "csv", label: "CSV", category: "spreadsheet" },
  // Presentations
  { id: "dps", label: "DPS", category: "presentation" },
  { id: "key", label: "KEY", category: "presentation" },
  { id: "odp", label: "ODP", category: "presentation" },
  { id: "pot", label: "POT", category: "presentation" },
  { id: "potx", label: "POTX", category: "presentation" },
  { id: "pps", label: "PPS", category: "presentation" },
  { id: "ppsx", label: "PPSX", category: "presentation" },
  { id: "ppt", label: "PPT", category: "presentation" },
  { id: "pptm", label: "PPTM", category: "presentation" },
  { id: "pptx", label: "PPTX", category: "presentation" },
  { id: "sda", label: "SDA", category: "presentation" },
  // E-books
  { id: "azw", label: "AZW", category: "ebook" },
  { id: "azw3", label: "AZW3", category: "ebook" },
  { id: "azw4", label: "AZW4", category: "ebook" },
  { id: "cbc", label: "CBC", category: "ebook" },
  { id: "cbr", label: "CBR", category: "ebook" },
  { id: "cbz", label: "CBZ", category: "ebook" },
  { id: "chm", label: "CHM", category: "ebook" },
  { id: "epub", label: "EPUB", category: "ebook" },
  { id: "fb2", label: "FB2", category: "ebook" },
  { id: "htmlz", label: "HTMLZ", category: "ebook" },
  { id: "lit", label: "LIT", category: "ebook" },
  { id: "lrf", label: "LRF", category: "ebook" },
  { id: "mobi", label: "MOBI", category: "ebook" },
  { id: "oeb", label: "OEB", category: "ebook" },
  { id: "pdb", label: "PDB", category: "ebook" },
  { id: "pml", label: "PML", category: "ebook" },
  { id: "prc", label: "PRC", category: "ebook" },
  { id: "rb", label: "RB", category: "ebook" },
  { id: "snb", label: "SNB", category: "ebook" },
  { id: "tcr", label: "TCR", category: "ebook" },
  { id: "txtz", label: "TXTZ", category: "ebook" },
  // Archives
  { id: "7z", label: "7Z", category: "archive" },
  { id: "ace", label: "ACE", category: "archive" },
  { id: "alz", label: "ALZ", category: "archive" },
  { id: "arc", label: "ARC", category: "archive" },
  { id: "arj", label: "ARJ", category: "archive" },
  { id: "bz", label: "BZ", category: "archive" },
  { id: "bz2", label: "BZ2", category: "archive" },
  { id: "cab", label: "CAB", category: "archive" },
  { id: "cpio", label: "CPIO", category: "archive" },
  { id: "deb", label: "DEB", category: "archive" },
  { id: "dmg", label: "DMG", category: "archive" },
  { id: "eml", label: "EML", category: "archive" },
  { id: "gz", label: "GZ", category: "archive" },
  { id: "img", label: "IMG", category: "archive" },
  { id: "iso", label: "ISO", category: "archive" },
  { id: "jar", label: "JAR", category: "archive" },
  { id: "lha", label: "LHA", category: "archive" },
  { id: "lz", label: "LZ", category: "archive" },
  { id: "lzma", label: "LZMA", category: "archive" },
  { id: "lzo", label: "LZO", category: "archive" },
  { id: "rar", label: "RAR", category: "archive" },
  { id: "rpm", label: "RPM", category: "archive" },
  { id: "rz", label: "RZ", category: "archive" },
  { id: "tar", label: "TAR", category: "archive" },
  { id: "tar.7z", label: "TAR.7Z", category: "archive" },
  { id: "tar.bz", label: "TAR.BZ", category: "archive" },
  { id: "tar.bz2", label: "TAR.BZ2", category: "archive" },
  { id: "tar.gz", label: "TAR.GZ", category: "archive" },
  { id: "tar.lzo", label: "TAR.LZO", category: "archive" },
  { id: "tar.xz", label: "TAR.XZ", category: "archive" },
  { id: "tar.z", label: "TAR.Z", category: "archive" },
  { id: "tbz", label: "TBZ", category: "archive" },
  { id: "tbz2", label: "TBZ2", category: "archive" },
  { id: "tgz", label: "TGZ", category: "archive" },
  { id: "tz", label: "TZ", category: "archive" },
  { id: "tzo", label: "TZO", category: "archive" },
  { id: "xz", label: "XZ", category: "archive" },
  { id: "z", label: "Z", category: "archive" },
  { id: "zip", label: "ZIP", category: "archive" },
  // Vector
  { id: "ai", label: "AI", category: "vector" },
  { id: "cdr", label: "CDR", category: "vector" },
  { id: "cgm", label: "CGM", category: "vector" },
  { id: "emf", label: "EMF", category: "vector" },
  { id: "sk", label: "SK", category: "vector" },
  { id: "sk1", label: "SK1", category: "vector" },
  { id: "svg", label: "SVG", category: "vector" },
  { id: "svgz", label: "SVGZ", category: "vector" },
  { id: "vsd", label: "VSD", category: "vector" },
  { id: "wmf", label: "WMF", category: "vector" },
  // CAD
  { id: "dwf", label: "DWF", category: "cad" },
  { id: "dwg", label: "DWG", category: "cad" },
  { id: "dxf", label: "DXF", category: "cad" },
  // Fonts
  { id: "ttf", label: "TTF", category: "font" },
  { id: "woff", label: "WOFF", category: "font" },
  { id: "woff2", label: "WOFF2", category: "font" },
];

export const ANY_FORMAT: FormatDef = { id: "any", label: "ANY", category: "document" };

export function getFormatsByCategory(cat: FormatCategory): FormatDef[] {
  return ALL_FORMATS.filter((f) => f.category === cat);
}

export function getFormat(id: string): FormatDef | undefined {
  if (id === "any") return ANY_FORMAT;
  return ALL_FORMATS.find((f) => f.id === id);
}

export interface ToolDef {
  id: string;
  label: string;
  group: "convert" | "optimize" | "merge" | "capture" | "archives" | "ocr" | "translate";
  category?: FormatCategory;
  operation: Operation;
  defaultFrom?: string;
  defaultTo?: string;
  description?: string;
}

export const TOOLS: ToolDef[] = [
  { id: "home", label: "PDF Gerage", group: "convert", operation: "convert", defaultFrom: "pdf", defaultTo: "any" },
  { id: "document", label: "Document Converter", group: "convert", category: "document", operation: "convert", defaultFrom: "pdf", defaultTo: "docx" },
  { id: "image", label: "Image Converter", group: "convert", category: "image", operation: "convert", defaultFrom: "png", defaultTo: "jpg" },
  { id: "spreadsheet", label: "Spreadsheet Converter", group: "convert", category: "spreadsheet", operation: "convert", defaultFrom: "xlsx", defaultTo: "csv" },
  { id: "presentation", label: "Presentation Converter", group: "convert", category: "presentation", operation: "convert", defaultFrom: "pptx", defaultTo: "pdf" },
  { id: "ebook", label: "Ebook Converter", group: "convert", category: "ebook", operation: "convert", defaultFrom: "epub", defaultTo: "pdf" },
  { id: "archive", label: "Archive Converter", group: "convert", category: "archive", operation: "convert", defaultFrom: "zip", defaultTo: "tar" },
  { id: "vector", label: "Vector Converter", group: "convert", category: "vector", operation: "convert", defaultFrom: "svg", defaultTo: "png" },
  { id: "compress-pdf", label: "Compress PDF", group: "optimize", operation: "compress", defaultFrom: "pdf", defaultTo: "pdf" },
  { id: "compress-png", label: "Compress PNG", group: "optimize", operation: "compress", defaultFrom: "png", defaultTo: "png" },
  { id: "compress-jpg", label: "Compress JPG", group: "optimize", operation: "compress", defaultFrom: "jpg", defaultTo: "jpg" },
  { id: "merge-pdf", label: "Merge PDF", group: "merge", operation: "merge", defaultFrom: "pdf", defaultTo: "pdf" },
  { id: "create-archive", label: "Create Archive", group: "archives", operation: "create-archive", defaultTo: "zip" },
  { id: "extract-archive", label: "Extract Archive", group: "archives", operation: "extract", defaultFrom: "zip" },
  { id: "pdf-ocr", label: "PDF OCR", group: "ocr", operation: "ocr", defaultFrom: "pdf", defaultTo: "txt", description: "Extract text from scanned PDFs using OCR." },
  { id: "image-ocr", label: "Image OCR", group: "ocr", operation: "ocr", defaultFrom: "png", defaultTo: "txt", description: "Recognize text in images (PNG, JPG, etc.)." },
  { id: "translate-doc", label: "Translate Document", group: "translate", operation: "translate", defaultFrom: "pdf", defaultTo: "txt", description: "Translate PDF, DOCX, or TXT to another language." },
];

export const POPULAR_CONVERSIONS = [
  { from: "pdf", to: "docx", tag: "editable Word document" },
  { from: "docx", to: "pdf", tag: "print-ready PDF" },
  { from: "html", to: "txt", tag: "plain text export" },
  { from: "png", to: "jpg", tag: "smaller image" },
  { from: "xlsx", to: "csv", tag: "spreadsheet export" },
  { from: "pptx", to: "pdf", tag: "shareable slides" },
  { from: "epub", to: "pdf", tag: "readable on any device" },
  { from: "heic", to: "jpg", tag: "iPhone photos" },
];

export const CATEGORY_COMMON_CONVERSIONS: Record<
  FormatCategory,
  { from: string; to: string; tag: string }[]
> = {
  document: [
    { from: "pdf", to: "docx", tag: "editable Word document" },
    { from: "docx", to: "pdf", tag: "print-ready PDF" },
    { from: "html", to: "txt", tag: "plain text export" },
  ],
  image: [
    { from: "png", to: "jpg", tag: "smaller file size" },
    { from: "heic", to: "jpg", tag: "iPhone photos" },
    { from: "webp", to: "png", tag: "lossless image" },
  ],
  spreadsheet: [
    { from: "xlsx", to: "csv", tag: "spreadsheet export" },
    { from: "csv", to: "xlsx", tag: "Excel workbook" },
    { from: "ods", to: "xlsx", tag: "LibreOffice to Excel" },
  ],
  presentation: [
    { from: "pptx", to: "pdf", tag: "shareable slides" },
    { from: "ppt", to: "pptx", tag: "modern PowerPoint" },
    { from: "odp", to: "pdf", tag: "OpenDocument to PDF" },
  ],
  ebook: [
    { from: "epub", to: "pdf", tag: "readable on any device" },
    { from: "mobi", to: "epub", tag: "Kindle to EPUB" },
    { from: "azw3", to: "epub", tag: "Amazon to EPUB" },
  ],
  archive: [
    { from: "zip", to: "tar", tag: "Unix archive" },
    { from: "rar", to: "zip", tag: "universal archive" },
    { from: "7z", to: "zip", tag: "wide compatibility" },
  ],
  vector: [
    { from: "svg", to: "png", tag: "raster preview" },
    { from: "cdr", to: "pdf", tag: "Corel to PDF" },
    { from: "ai", to: "pdf", tag: "Illustrator to PDF" },
  ],
  cad: [
    { from: "dwg", to: "pdf", tag: "AutoCAD to PDF" },
    { from: "dxf", to: "pdf", tag: "drawing preview" },
    { from: "dwf", to: "pdf", tag: "Design Web Format" },
  ],
  font: [
    { from: "ttf", to: "woff2", tag: "web font" },
    { from: "woff", to: "woff2", tag: "modern web font" },
    { from: "ttf", to: "woff", tag: "legacy web font" },
  ],
};

export function getCategoryFormatCount(cat: FormatCategory): number {
  return ALL_FORMATS.filter((f) => f.category === cat).length;
}

export function getTotalFormatCount(): number {
  return ALL_FORMATS.length;
}

export function inferFormatFromFile(file: File): string {
  const lower = file.name.toLowerCase();
  const doubleExtensions = [
    "tar.7z",
    "tar.bz2",
    "tar.bz",
    "tar.gz",
    "tar.lzo",
    "tar.xz",
    "tar.z",
  ];
  for (const id of doubleExtensions) {
    if (lower.endsWith(`.${id}`) && getFormat(id)) return id;
  }

  const ext = lower.split(".").pop() || "";
  const aliases: Record<string, string> = {
    htm: "html",
  };
  const id = aliases[ext] || ext;
  return getFormat(id) ? id : ext;
}

/** MIME accept string for CAD uploads. */
export function getCadAcceptTypes(): string {
  return `${ALL_FORMATS.filter((f) => f.category === "cad")
    .map((f) => `.${f.id}`)
    .join(",")},*/*`;
}

/** MIME accept string for document uploads. */
export function getDocumentAcceptTypes(): string {
  return `${ALL_FORMATS.filter((f) => f.category === "document")
    .map((f) => `.${f.id}`)
    .join(",")},*/*`;
}

/** MIME accept string for archive uploads. */
export function getArchiveAcceptTypes(): string {
  return `${ALL_FORMATS.filter((f) => f.category === "archive")
    .map((f) => `.${f.id}`)
    .join(",")},*/*`;
}

const PDF_TO_IMAGE_FORMATS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "ico",
  "heic",
  "avif",
]);

export function supportsMultiFileConvert(fromFormat: string, toFormat: string | null | undefined): boolean {
  if (!toFormat || toFormat === "any") return false;
  if (fromFormat.toLowerCase() !== "pdf") return false;
  const to = toFormat.toLowerCase().replace("jpeg", "jpg");
  return PDF_TO_IMAGE_FORMATS.has(to);
}

export function getAcceptTypes(fromFormat: string, toFormat: string, operation: Operation): string {
  if (operation === "ocr") return ".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.tif,application/pdf,image/*";
  if (operation === "translate") return ".pdf,.docx,.doc,.txt,.md,application/pdf";
  if (operation === "merge") return ".pdf,application/pdf";
  if (operation === "create-archive") return "*/*";
  if (operation === "extract") return getArchiveAcceptTypes();
  if (fromFormat === "any" || toFormat === "any") return "*/*";
  const fmt = getFormat(fromFormat);
  if (fmt?.category === "image") return "image/*";
  if (fmt?.category === "document") return getDocumentAcceptTypes();
  if (fmt?.category === "archive") return getArchiveAcceptTypes();
  if (fmt?.category === "presentation") {
    return ".dps,.key,.odp,.pot,.potx,.pps,.ppsx,.ppt,.pptm,.pptx,.sda,*/*";
  }
  if (fmt?.category === "ebook") {
    return ".azw,.azw3,.azw4,.cbc,.cbr,.cbz,.chm,.epub,.fb2,.htmlz,.lit,.lrf,.mobi,.oeb,.pdb,.pml,.prc,.rb,.snb,.tcr,.txtz,*/*";
  }
  if (fmt?.category === "vector") {
    return ".ai,.cdr,.cgm,.emf,.sk,.sk1,.svg,.svgz,.vsd,.wmf,image/svg+xml,*/*";
  }
  if (fmt?.category === "cad") return getCadAcceptTypes();
  return `.${fromFormat},*/*`;
}
