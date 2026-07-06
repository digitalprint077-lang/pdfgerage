export type Locale = "en" | "es" | "fr" | "de" | "zh" | "ar" | "hi" | "ur" | "pt" | "ja";

export interface LanguageOption {
  code: Locale;
  label: string;
  /** ISO 3166-1 alpha-2 for flag icon */
  country: string;
  dir: "ltr" | "rtl";
}

export const UI_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", country: "US", dir: "ltr" },
  { code: "es", label: "Español", country: "ES", dir: "ltr" },
  { code: "fr", label: "Français", country: "FR", dir: "ltr" },
  { code: "de", label: "Deutsch", country: "DE", dir: "ltr" },
  { code: "zh", label: "中文", country: "CN", dir: "ltr" },
  { code: "ar", label: "العربية", country: "SA", dir: "rtl" },
  { code: "hi", label: "हिन्दी", country: "IN", dir: "ltr" },
  { code: "ur", label: "اردو", country: "PK", dir: "rtl" },
  { code: "pt", label: "Português", country: "BR", dir: "ltr" },
  { code: "ja", label: "日本語", country: "JP", dir: "ltr" },
];

export const OCR_LANG_OPTIONS = [
  { code: "eng", label: "English", country: "US" },
  { code: "urd", label: "Urdu — Pakistani forms", country: "PK" },
  { code: "ara", label: "Arabic", country: "SA" },
  { code: "hin", label: "Hindi", country: "IN" },
  { code: "fra", label: "French", country: "FR" },
  { code: "deu", label: "German", country: "DE" },
  { code: "spa", label: "Spanish", country: "ES" },
  { code: "chi_sim", label: "Chinese", country: "CN" },
  { code: "jpn", label: "Japanese", country: "JP" },
  { code: "por", label: "Portuguese", country: "BR" },
  { code: "ita", label: "Italian", country: "IT" },
  { code: "rus", label: "Russian", country: "RU" },
  { code: "kor", label: "Korean", country: "KR" },
  { code: "tur", label: "Turkish", country: "TR" },
  { code: "nld", label: "Dutch", country: "NL" },
  { code: "pol", label: "Polish", country: "PL" },
  { code: "ind", label: "Indonesian", country: "ID" },
  { code: "vie", label: "Vietnamese", country: "VN" },
];

/** Keep in sync with server/translateLanguages.js */
export const TRANSLATE_LANG_OPTIONS = [
  { code: "auto", label: "Auto-detect", country: "" },
  { code: "en", label: "English", country: "US" },
  { code: "es", label: "Spanish", country: "ES" },
  { code: "fr", label: "French", country: "FR" },
  { code: "de", label: "German", country: "DE" },
  { code: "zh", label: "Chinese", country: "CN" },
  { code: "ar", label: "Arabic", country: "SA" },
  { code: "hi", label: "Hindi", country: "IN" },
  { code: "ur", label: "Urdu", country: "PK" },
  { code: "pt", label: "Portuguese", country: "BR" },
  { code: "ja", label: "Japanese", country: "JP" },
  { code: "it", label: "Italian", country: "IT" },
  { code: "ru", label: "Russian", country: "RU" },
  { code: "ko", label: "Korean", country: "KR" },
  { code: "tr", label: "Turkish", country: "TR" },
  { code: "nl", label: "Dutch", country: "NL" },
  { code: "pl", label: "Polish", country: "PL" },
  { code: "id", label: "Indonesian", country: "ID" },
  { code: "vi", label: "Vietnamese", country: "VN" },
];
