import type { Locale } from "./languages";

export type TranslationKey =
  | "appTitle"
  | "homeTitle"
  | "homeSubtitle"
  | "tools"
  | "pricing"
  | "selectFileTitle"
  | "selectFileHint"
  | "filesRemovedNote"
  | "selectFile"
  | "selectFiles"
  | "fromUrl"
  | "load"
  | "convertTo"
  | "working"
  | "convert"
  | "mergePdfs"
  | "compress"
  | "extractArchive"
  | "createZip"
  | "runOcr"
  | "translateDoc"
  | "ocrLanguage"
  | "outputFormat"
  | "translateFrom"
  | "translateTo"
  | "engines"
  | "limitedMode"
  | "popularConversions"
  | "formatCatalog"
  | "formatCatalogDesc"
  | "commonConversionTypes"
  | "formatsListed"
  | "browseFormats"
  | "securityTitle"
  | "securityDesc"
  | "footerLocal"
  | "toolGroups.convert"
  | "toolGroups.optimize"
  | "toolGroups.merge"
  | "toolGroups.archives"
  | "toolGroups.ocr"
  | "toolGroups.translate"
  | "toolGroups.ai"
  | "chatPdfTitle"
  | "chatPdfSubtitle"
  | "chatPdfNotConfigured"
  | "chatPdfUploadTitle"
  | "chatPdfUploadHint"
  | "chatPdfSelectPdf"
  | "chatPdfReady"
  | "chatPdfNewFile"
  | "chatPdfAskAnything"
  | "chatPdfThinking"
  | "chatPdfPlaceholder"
  | "chatPdfSend"
  | "chatPdfDeployNeeded"
  | "assistantTitle"
  | "assistantSubtitle"
  | "assistantWelcome"
  | "assistantPlaceholder"
  | "assistantSend"
  | "assistantThinking"
  | "assistantOpen"
  | "assistantClose"
  | "assistantNewChat"
  | "assistantNotConfigured"
  | "assistantUnavailable"
  | "assistantContact"
  | "assistantSuggestConvert"
  | "assistantSuggestOcr"
  | "assistantSuggestChatPdf"
  | "assistantHubTitle"
  | "assistantAsk"
  | "assistantTileConvert"
  | "assistantTileConvertSub"
  | "assistantTileOcr"
  | "assistantTileOcrSub"
  | "assistantTileChatPdf"
  | "assistantTileChatPdfSub"
  | "assistantTileBilling"
  | "assistantTileBillingSub"
  | "login"
  | "signup"
  | "logout"
  | "loginTitle"
  | "loginSubtitle"
  | "signupTitle"
  | "signupSubtitle"
  | "email"
  | "password"
  | "name"
  | "optional"
  | "passwordHint"
  | "passwordMinLength"
  | "noAccount"
  | "haveAccount"
  | "loginFailed"
  | "signupFailed"
  | "emailOrUsername"
  | "forgotPassword"
  | "continue"
  | "profile"
  | "profileWelcome"
  | "profileAccount"
  | "profileDetails"
  | "profileQuickActions"
  | "profileSaveChanges"
  | "profileSaved"
  | "profileSaveFailed"
  | "profileNamePlaceholder"
  | "profileSignInMethod"
  | "profileGoogleAccount"
  | "profileEmailAccount"
  | "profileUserId"
  | "profileStartConverting"
  | "profileContactSupport"
  | "profileSecurityInfo"
  | "profilePrivacyNote"
  | "profilePrivacyDesc"
  | "memberSince"
  | "backToHome"
  | "dashOverview"
  | "dashActivity"
  | "dashSecurity"
  | "dashPlan"
  | "dashTotalConversions"
  | "dashThisMonth"
  | "dashToday"
  | "dashOcrJobs"
  | "dashTranslateJobs"
  | "dashUsageToday"
  | "dashRemaining"
  | "dashRecentActivity"
  | "dashNoActivity"
  | "dashNoActivityHint"
  | "dashFile"
  | "dashOperation"
  | "dashFormat"
  | "dashDate"
  | "dashStatus"
  | "dashSuccess"
  | "dashCurrentPlan"
  | "dashFreePlan"
  | "dashPlanDesc"
  | "dashDailyLimit"
  | "dashMaxFileSize"
  | "dashUnlimitedLocal"
  | "dashUpgradeSoon"
  | "dashBreakdown"
  | "dashLastActive"
  | "dashNever"
  | "dashSupportTickets"
  | "dashChangePassword"
  | "dashCurrentPassword"
  | "dashNewPassword"
  | "dashPasswordUpdated"
  | "dashPasswordFailed"
  | "dashGoogleConnected"
  | "dashEmailVerified"
  | "dashAccountStatus"
  | "dashActive"
  | "dashLoading"
  | "freeUsageRemaining"
  | "freeUsageLimitReached"
  | "freeUsageUpgrade"
  | "usageLimitTitle"
  | "usageLimitDaily"
  | "usageLimitNoCredits"
  | "buyCredits"
  | "usageJobFiles"
  | "usageBatchTooLarge";

type Dict = Record<TranslationKey, string>;

const en: Dict = {
  appTitle: "PDF Gerage",
  homeTitle: "Convert PDFs & Documents Online",
  homeSubtitle:
    "Drop a file into PDF Gerage and pick your output format. PDFs, Word, Excel, images, OCR, translation, and archives — free, secure, and right in your browser.",
  tools: "Tools",
  pricing: "Pricing",
  selectFileTitle: "Select your file here to get started",
  selectFileHint: "or drop your file here.",
  filesRemovedNote: "All files are removed after conversion.",
  selectFile: "Select File",
  selectFiles: "Select Files",
  fromUrl: "From URL",
  load: "Load",
  convertTo: "Convert to",
  working: "Working…",
  convert: "Convert",
  mergePdfs: "Merge PDFs",
  compress: "Compress",
  extractArchive: "Extract Archive",
  createZip: "Create ZIP",
  runOcr: "Run OCR",
  translateDoc: "Translate",
  ocrLanguage: "OCR language",
  outputFormat: "Output format",
  translateFrom: "From language",
  translateTo: "To language",
  engines: "Engines",
  limitedMode: "Some conversion engines are temporarily unavailable.",
  popularConversions: "Popular conversions",
  formatCatalog: "Format Catalog",
  formatCatalogDesc:
    "Handles {total} formats across {categories} categories — documents, images, archives and more.",
  commonConversionTypes: "Common conversion types",
  formatsListed: "listed",
  browseFormats: "Browse by category",
  securityTitle: "Your files stay private",
  securityDesc:
    "Files are transferred over encrypted connections, processed on secure servers, and automatically deleted after conversion.",
  footerLocal: "Secure cloud file conversion — files are deleted automatically after processing.",
  "toolGroups.convert": "Convert Files",
  "toolGroups.optimize": "Optimize Files",
  "toolGroups.merge": "Merge Files",
  "toolGroups.archives": "Archives",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "Translate",
  "toolGroups.ai": "AI Tools",
  chatPdfTitle: "Chat with PDF AI",
  chatPdfSubtitle: "Upload a PDF and ask questions — get summaries, key points, and answers from your document.",
  chatPdfNotConfigured: "AI chat is not available yet. The server needs an OpenAI or Gemini API key.",
  chatPdfUploadTitle: "Upload your PDF",
  chatPdfUploadHint: "Drop a PDF here or click to browse. Text is extracted for AI — scanned PDFs may need OCR first.",
  chatPdfSelectPdf: "Select PDF",
  chatPdfReady: "Ready to chat",
  chatPdfNewFile: "New file",
  chatPdfAskAnything: "Ask anything about this document",
  chatPdfThinking: "Thinking…",
  chatPdfPlaceholder: "Ask a question about your PDF…",
  chatPdfSend: "Send",
  chatPdfDeployNeeded:
    "Chat with PDF AI is not live on the server yet. Deploy the latest API build, then add OPENAI_API_KEY or GEMINI_API_KEY on Railway.",
  assistantTitle: "PDF Gerage Assistant",
  assistantSubtitle: "Ask how to convert, OCR, or use any tool",
  assistantWelcome: "Hi! I can help you convert files, use OCR, merge PDFs, translate documents, and more. What do you need?",
  assistantPlaceholder: "Ask how to convert, compress, OCR…",
  assistantSend: "Send",
  assistantThinking: "Thinking…",
  assistantOpen: "Open assistant",
  assistantClose: "Close assistant",
  assistantNewChat: "New conversation",
  assistantNotConfigured: "The AI assistant is not configured on this server yet. You can still browse tools from the menu or visit our contact page.",
  assistantUnavailable: "Assistant unavailable",
  assistantContact: "Contact support",
  assistantSuggestConvert: "How do I convert PDF to Word?",
  assistantSuggestOcr: "How does OCR work on scans?",
  assistantSuggestChatPdf: "Where is Chat with PDF AI?",
  assistantHubTitle: "How can we help?",
  assistantAsk: "Ask",
  assistantTileConvert: "Convert",
  assistantTileConvertSub: "PDF, images, docs…",
  assistantTileOcr: "OCR",
  assistantTileOcrSub: "Scanned text",
  assistantTileChatPdf: "Chat PDF",
  assistantTileChatPdfSub: "Ask your document",
  assistantTileBilling: "Billing",
  assistantTileBillingSub: "Plans & pricing",
  login: "Log in",
  signup: "Sign up",
  logout: "Log out",
  loginTitle: "Welcome back",
  loginSubtitle: "Sign in to your account to continue converting files.",
  signupTitle: "Create your account",
  signupSubtitle: "Sign up free — convert, OCR, and translate your files.",
  email: "Email",
  password: "Password",
  name: "Name",
  optional: "optional",
  passwordHint: "At least 8 characters",
  passwordMinLength: "Password must be at least 8 characters",
  noAccount: "Don't have an account?",
  haveAccount: "Already have an account?",
  loginFailed: "Login failed. Please try again.",
  signupFailed: "Sign up failed. Please try again.",
  emailOrUsername: "Email or Username",
  forgotPassword: "Forgot password?",
  continue: "Continue",
  profile: "Profile",
  profileWelcome: "Welcome back,",
  profileAccount: "Account settings",
  profileDetails: "Account details",
  profileQuickActions: "Quick actions",
  profileSaveChanges: "Save changes",
  profileSaved: "Profile updated.",
  profileSaveFailed: "Could not save profile.",
  profileNamePlaceholder: "Your display name",
  profileSignInMethod: "Sign-in method",
  profileGoogleAccount: "Google account",
  profileEmailAccount: "Email & password",
  profileUserId: "User ID",
  profileStartConverting: "Start converting files",
  profileContactSupport: "Contact support",
  profileSecurityInfo: "Security & privacy",
  profilePrivacyNote: "Your privacy",
  profilePrivacyDesc:
    "PDF Gerage processes your files on secure cloud infrastructure. Converted files are not kept after your job completes.",
  memberSince: "Member since",
  backToHome: "Back to PDF Gerage",
  dashOverview: "Overview",
  dashActivity: "Activity",
  dashSecurity: "Security",
  dashPlan: "Plan & usage",
  dashTotalConversions: "Total conversions",
  dashThisMonth: "This month",
  dashToday: "Today",
  dashOcrJobs: "OCR jobs",
  dashTranslateJobs: "Translations",
  dashUsageToday: "Today's usage",
  dashRemaining: "remaining today",
  dashRecentActivity: "Recent activity",
  dashNoActivity: "No activity yet",
  dashNoActivityHint: "Convert a file while signed in to see your history here.",
  dashFile: "File",
  dashOperation: "Operation",
  dashFormat: "Format",
  dashDate: "Date",
  dashStatus: "Status",
  dashSuccess: "Success",
  dashCurrentPlan: "Current plan",
  dashFreePlan: "Free",
  dashPlanDesc: "15 conversions per day across all tools. Resets at midnight UTC.",
  dashDailyLimit: "Conversions per day",
  dashMaxFileSize: "Max file size",
  dashUnlimitedLocal: "Secure cloud processing",
  dashUpgradeSoon: "Paid plans coming soon",
  dashBreakdown: "By operation type",
  dashLastActive: "Last activity",
  dashNever: "Never",
  dashSupportTickets: "Support messages sent",
  dashChangePassword: "Change password",
  dashCurrentPassword: "Current password",
  dashNewPassword: "New password",
  dashPasswordUpdated: "Password updated successfully.",
  dashPasswordFailed: "Could not change password.",
  dashGoogleConnected: "Google account connected",
  dashEmailVerified: "Email verified",
  dashAccountStatus: "Account status",
  dashActive: "Active",
  dashLoading: "Loading dashboard…",
  freeUsageRemaining: "{remaining} of {limit} free conversions left today",
  freeUsageLimitReached: "Daily limit reached (15 conversions). Resets at midnight UTC.",
  freeUsageUpgrade: "View paid plans",
  usageLimitTitle: "Conversion credits exceeded",
  usageLimitDaily:
    "Your daily limit of {limit} conversion credits exceeded. You can buy credits to continue using this service.",
  usageLimitNoCredits: "You have no conversion credits left. Buy a package to continue using this service.",
  buyCredits: "Buy credits",
  usageJobFiles: "This job uses {count} conversion credits.",
  usageBatchTooLarge:
    "This job converts {count} files but you only have {remaining} free conversions left today.",
};

const es: Dict = {
  ...en,
  homeTitle: "Convierte PDFs y documentos online",
  homeSubtitle:
    "Sube un archivo a PDF Gerage y elige el formato de salida. PDF, Word, Excel, imágenes, OCR, traducción y archivos — gratis, seguro y en tu navegador.",
  tools: "Herramientas",
  selectFileTitle: "Selecciona tu archivo para comenzar",
  selectFileHint: "o suelta tu archivo aquí.",
  filesRemovedNote: "Todos los archivos se eliminan después de la conversión.",
  selectFile: "Seleccionar archivo",
  selectFiles: "Seleccionar archivos",
  fromUrl: "Desde URL",
  load: "Cargar",
  convertTo: "Convertir a",
  working: "Procesando…",
  mergePdfs: "Combinar PDFs",
  runOcr: "Ejecutar OCR",
  translateDoc: "Traducir",
  ocrLanguage: "Idioma OCR",
  outputFormat: "Formato de salida",
  translateFrom: "Idioma origen",
  translateTo: "Idioma destino",
  popularConversions: "Conversiones populares",
  browseFormats: "Explorar por categoría",
  securityTitle: "Tus archivos son privados",
  securityDesc:
    "Los archivos se transfieren de forma cifrada, se procesan en servidores seguros y se eliminan automáticamente.",
  footerLocal: "Conversión segura en la nube — los archivos se eliminan tras procesarse.",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "Traducir",
};

const fr: Dict = {
  ...en,
  homeTitle: "Convertir PDF et documents en ligne",
  homeSubtitle:
    "Déposez un fichier sur PDF Gerage et choisissez le format de sortie. PDF, Word, Excel, images, OCR, traduction et archives — gratuit, sécurisé, dans le navigateur.",
  tools: "Outils",
  selectFileTitle: "Sélectionnez votre fichier pour commencer",
  selectFileHint: "ou déposez votre fichier ici.",
  filesRemovedNote: "Tous les fichiers sont supprimés après la conversion.",
  selectFile: "Choisir un fichier",
  fromUrl: "Depuis URL",
  load: "Charger",
  convertTo: "Convertir en",
  working: "En cours…",
  runOcr: "Lancer l'OCR",
  translateDoc: "Traduire",
  ocrLanguage: "Langue OCR",
  translateFrom: "Langue source",
  translateTo: "Langue cible",
  popularConversions: "Conversions populaires",
  securityTitle: "Vos fichiers restent privés",
  footerLocal: "Conversion cloud sécurisée — fichiers supprimés après traitement.",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "Traduire",
};

const de: Dict = {
  ...en,
  homeTitle: "PDFs & Dokumente online konvertieren",
  homeSubtitle:
    "Datei in PDF Gerage hochladen und Zielformat wählen. PDF, Word, Excel, Bilder, OCR, Übersetzung und Archive — kostenlos, sicher, im Browser.",
  tools: "Werkzeuge",
  selectFileTitle: "Datei auswählen zum Starten",
  selectFileHint: "oder Datei hier ablegen.",
  filesRemovedNote: "Alle Dateien werden nach der Konvertierung entfernt.",
  selectFile: "Datei wählen",
  fromUrl: "Von URL",
  load: "Laden",
  convertTo: "Konvertieren zu",
  working: "Arbeitet…",
  runOcr: "OCR starten",
  translateDoc: "Übersetzen",
  ocrLanguage: "OCR-Sprache",
  translateFrom: "Ausgangssprache",
  translateTo: "Zielsprache",
  popularConversions: "Beliebte Konvertierungen",
  securityTitle: "Ihre Dateien bleiben privat",
  footerLocal: "Sichere Cloud-Konvertierung — Dateien werden nach der Verarbeitung gelöscht.",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "Übersetzen",
};

const zh: Dict = {
  ...en,
  homeTitle: "在线转换 PDF 与文档",
  homeSubtitle:
    "将文件上传到 PDF Gerage 并选择输出格式。支持 PDF、Word、Excel、图片、OCR、翻译和压缩包 — 免费、安全、无需安装。",
  tools: "工具",
  selectFileTitle: "选择文件开始",
  selectFileHint: "或将文件拖放到此处。",
  filesRemovedNote: "转换完成后所有文件将被删除。",
  selectFile: "选择文件",
  fromUrl: "从 URL",
  load: "加载",
  convertTo: "转换为",
  working: "处理中…",
  runOcr: "运行 OCR",
  translateDoc: "翻译",
  ocrLanguage: "OCR 语言",
  translateFrom: "源语言",
  translateTo: "目标语言",
  popularConversions: "热门转换",
  securityTitle: "您的文件保持私密",
  footerLocal: "安全云端转换 — 处理完成后自动删除文件。",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "翻译",
};

const ar: Dict = {
  ...en,
  homeTitle: "تحويل PDF والمستندات عبر الإنترنت",
  homeSubtitle:
    "ارفع ملفاً إلى PDF Gerage واختر صيغة الإخراج. PDF وWord وExcel وصور وOCR وترجمة وأرشيف — مجاناً وآمناً في متصفحك.",
  tools: "الأدوات",
  selectFileTitle: "اختر ملفك للبدء",
  selectFileHint: "أو أسقط ملفك هنا.",
  filesRemovedNote: "تُزال جميع الملفات بعد التحويل.",
  selectFile: "اختر ملف",
  fromUrl: "من رابط",
  load: "تحميل",
  convertTo: "تحويل إلى",
  working: "جاري العمل…",
  runOcr: "تشغيل OCR",
  translateDoc: "ترجمة",
  ocrLanguage: "لغة OCR",
  translateFrom: "من اللغة",
  translateTo: "إلى اللغة",
  popularConversions: "تحويلات شائعة",
  securityTitle: "ملفاتك تبقى خاصة",
  footerLocal: "تحويل آمن عبر السحابة — تُحذف الملفات بعد المعالجة.",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "ترجمة",
};

const hi: Dict = {
  ...en,
  homeTitle: "PDF और दस्तावेज़ ऑनलाइन कन्वर्ट करें",
  homeSubtitle:
    "PDF Gerage में फ़ाइल अपलोड करें और आउटपुट फ़ॉर्मैट चुनें। PDF, Word, Excel, छवियाँ, OCR, अनुवाद और संग्रह — मुफ़्त, सुरक्षित, ब्राउज़र में।",
  tools: "टूल्स",
  selectFileTitle: "शुरू करने के लिए फ़ाइल चुनें",
  selectFileHint: "या फ़ाइल यहाँ छोड़ें।",
  filesRemovedNote: "रूपांतरण के बाद सभी फ़ाइलें हटा दी जाती हैं।",
  selectFile: "फ़ाइल चुनें",
  fromUrl: "URL से",
  load: "लोड",
  convertTo: "में बदलें",
  working: "काम हो रहा है…",
  runOcr: "OCR चलाएँ",
  translateDoc: "अनुवाद",
  ocrLanguage: "OCR भाषा",
  translateFrom: "स्रोत भाषा",
  translateTo: "लक्ष्य भाषा",
  popularConversions: "लोकप्रिय रूपांतरण",
  securityTitle: "आपकी फ़ाइलें निजी रहती हैं",
  footerLocal: "सुरक्षित क्लाउड रूपांतरण — प्रोसेसिंग के बाद फ़ाइलें हटा दी जाती हैं।",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "अनुवाद",
};

const ur: Dict = {
  ...en,
  homeTitle: "PDF اور دستاویزات آن لائن تبدیل کریں",
  homeSubtitle:
    "PDF Gerage میں فائل اپ لوڈ کریں اور آؤٹ پٹ فارمیٹ منتخب کریں۔ PDF، Word، Excel، تصاویر، OCR، ترجمہ اور آرکائیوز — مفت، محفوظ، براؤزر میں۔",
  tools: "اوزار",
  selectFileTitle: "شروع کرنے کے لیے فائل منتخب کریں",
  selectFileHint: "یا فائل یہاں چھوڑیں۔",
  filesRemovedNote: "تبدیلی کے بعد تمام فائلیں ہٹا دی جاتی ہیں۔",
  selectFile: "فائل منتخب کریں",
  fromUrl: "URL سے",
  load: "لوڈ",
  convertTo: "میں تبدیل",
  working: "کam جاری…",
  runOcr: "OCR چلائیں",
  translateDoc: "ترجمہ",
  ocrLanguage: "OCR زبان",
  translateFrom: "ماخذ زبان",
  translateTo: "ہدف زبان",
  popularConversions: "مشہور تبدیلیاں",
  securityTitle: "آپ ki فائلیں محفوظ",
  footerLocal: "محفوظ کلاؤڈ کنورژن — فائلیں پروسیسنگ کے بعد حذف ہو جاتی ہیں۔",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "ترجمہ",
};

const pt: Dict = {
  ...en,
  homeTitle: "Converta PDFs e documentos online",
  homeSubtitle:
    "Envie um arquivo para o PDF Gerage e escolha o formato de saída. PDF, Word, Excel, imagens, OCR, tradução e arquivos — grátis, seguro, no navegador.",
  tools: "Ferramentas",
  selectFileTitle: "Selecione seu arquivo para começar",
  selectFileHint: "ou solte seu arquivo aqui.",
  filesRemovedNote: "Todos os arquivos são removidos após a conversão.",
  selectFile: "Selecionar arquivo",
  fromUrl: "De URL",
  load: "Carregar",
  convertTo: "Converter para",
  working: "Processando…",
  runOcr: "Executar OCR",
  translateDoc: "Traduzir",
  ocrLanguage: "Idioma OCR",
  translateFrom: "Idioma origem",
  translateTo: "Idioma destino",
  popularConversions: "Conversões populares",
  securityTitle: "Seus arquivos ficam privados",
  footerLocal: "Conversão segura na nuvem — arquivos excluídos após o processamento.",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "Traduzir",
};

const ja: Dict = {
  ...en,
  homeTitle: "PDFとドキュメントをオンライン変換",
  homeSubtitle:
    "PDF Gerageにファイルをアップロードし、出力形式を選びます。PDF、Word、Excel、画像、OCR、翻訳、アーカイブ — 無料・安全・ブラウザだけで。",
  tools: "ツール",
  selectFileTitle: "ファイルを選択して開始",
  selectFileHint: "またはここにドロップ。",
  filesRemovedNote: "変換後、すべてのファイルは削除されます。",
  selectFile: "ファイルを選択",
  fromUrl: "URLから",
  load: "読み込み",
  convertTo: "変換先",
  working: "処理中…",
  runOcr: "OCR実行",
  translateDoc: "翻訳",
  ocrLanguage: "OCR言語",
  translateFrom: "翻訳元",
  translateTo: "翻訳先",
  popularConversions: "人気の変換",
  securityTitle: "ファイルは非公開のまま",
  footerLocal: "安全なクラウド変換 — 処理後にファイルは自動削除されます。",
  "toolGroups.ocr": "OCR",
  "toolGroups.translate": "翻訳",
};

export const translations: Record<Locale, Dict> = { en, es, fr, de, zh, ar, hi, ur, pt, ja };

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
