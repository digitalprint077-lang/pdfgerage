export interface SitePageSection {

  heading?: string;

  paragraphs?: string[];

  bullets?: string[];

}



export interface SitePage {

  slug: string;

  title: string;

  subtitle?: string;

  sections: SitePageSection[];

}



export const SITE_PAGES: Record<string, SitePage> = {

  about: {

    slug: "about",

    title: "About PDF Gerage",

    subtitle: "Your online file conversion platform",

    sections: [

      {

        paragraphs: [

          "PDF Gerage is a document conversion platform built for everyday file work — PDFs, Office files, images, OCR, and translation — in one simple workflow.",

          "Upload a file, choose your output format, and download the result. Our cloud infrastructure handles the heavy lifting so you can convert from any device with a browser.",

        ],

      },

      {

        heading: "What you can do",

        bullets: [

          "Convert between document, image, spreadsheet, and presentation formats",

          "Merge or compress PDFs and images",

          "Extract text from scans with OCR",

          "Translate PDF, DOCX, and text files",

          "Create and extract ZIP archives",

        ],

      },

      {

        heading: "Our approach",

        paragraphs: [

          "We prioritize privacy and speed: encrypted transfers, automatic file deletion after processing, and industry-standard conversion engines (LibreOffice, Tesseract).",

          "PDF Gerage is designed for students, freelancers, and teams who need reliable conversions without complicated software installs.",

        ],

      },

    ],

  },

  security: {

    slug: "security",

    title: "Security",

    subtitle: "How PDF Gerage handles your files",

    sections: [

      {

        paragraphs: [

          "PDF Gerage processes files on secure cloud servers. Uploads are used only to complete the conversion you request and are not kept after the job finishes.",

        ],

      },

      {

        heading: "Data handling",

        bullets: [

          "Files are transferred over HTTPS and processed in isolated temporary storage",

          "Source and output files are deleted automatically after conversion completes",

          "Optional accounts (email or Google) are used for sign-in and usage tracking — not for storing your documents",

          "Translation sends text segments to external translation providers — not permanent file storage",

        ],

      },

      {

        heading: "Recommendations",

        bullets: [

          "Use PDF Gerage over a trusted network connection",

          "Do not share your login session on public computers",

          "Review converted output before sharing sensitive documents externally",

        ],

      },

      {

        heading: "Reporting issues",

        paragraphs: [

          "If you discover a security concern, please contact us through the Contact page. We take privacy reports seriously.",

        ],

      },

    ],

  },

  blog: {

    slug: "blog",

    title: "Blog",

    subtitle: "Tips and updates from PDF Gerage",

    sections: [

      {

        heading: "How to pick the right PDF output format",

        paragraphs: [

          "Need an editable document? Choose DOCX. Need universal sharing? Stay with PDF. For spreadsheets extracted from PDFs, try CSV or XLSX depending on whether you need formulas or plain data.",

        ],

      },

      {

        heading: "When to use OCR vs. Translate",

        paragraphs: [

          "OCR is for scanned pages and photos — it turns pixels into text. Translate works on text already inside PDF, DOCX, or TXT files. For a scanned foreign-language PDF, run OCR first, then translate the extracted text.",

        ],

      },

      {

        heading: "Compress PDFs without losing readability",

        paragraphs: [

          "Use the Compress PDF tool and adjust quality if available. For text-heavy documents, moderate compression usually cuts size dramatically while keeping text sharp. For image-heavy PDFs, expect more visible quality trade-offs.",

        ],

      },

      {

        heading: "Keeping conversions fast",

        paragraphs: [

          "Large PDFs and high-resolution images take longer to process. For the best experience, convert one large file at a time and use a stable internet connection.",

        ],

      },

    ],

  },

  privacy: {

    slug: "privacy",

    title: "Privacy Policy",

    subtitle: "Last updated: June 30, 2026",

    sections: [

      {

        paragraphs: [

          "PDF Gerage (“we”, “us”, or “the service”) is an online file conversion platform. This Privacy Policy describes how we collect, use, and protect information when you use PDF Gerage.",

          "When you upload a file for conversion, it is transmitted to our servers, processed to produce your requested output, and deleted when the job completes unless otherwise stated below.",

        ],

      },

      {

        heading: "1. Information we collect",

        bullets: [

          "Account information — email address, display name, and hashed password if you create an account",

          "Google Sign-In profile — name and email when you choose Google authentication",

          "Contact form submissions — name, email, subject, and message when you use the Contact page",

          "Service logs — error messages, request timing, and operational metadata used to maintain reliability",

        ],

      },

      {

        heading: "2. Information we do not collect",

        bullets: [

          "We do not build a permanent library of files you convert",

          "We do not sell or rent your personal information",

          "We do not use conversion content for advertising or model training",

          "We do not track you across third-party websites",

        ],

      },

      {

        heading: "3. How we use your information",

        bullets: [

          "Authenticate your account and keep you signed in",

          "Respond to support messages you send through the Contact form",

          "Operate, secure, and improve the conversion service",

          "Provide the conversion, OCR, and translation features you request",

        ],

      },

      {

        heading: "4. Files you convert",

        paragraphs: [

          "When you upload a file, it is processed on our servers to perform the job you selected. Temporary working files are deleted after processing completes.",

          "Downloaded outputs are saved only where you choose to save them in your browser or file system. We do not retain copies of your converted files after the job finishes.",

        ],

      },

      {

        heading: "5. Third-party services",

        bullets: [

          "Google Sign-In (optional) — governed by Google’s privacy policy when you use it",

          "Translation providers (Google Translate, MyMemory, or LibreTranslate) — receive text segments sent for translation, not permanent file storage",

          "Cloud import (Google Drive, Dropbox, OneDrive) — only used if you configure API keys and explicitly import a file",

        ],

        paragraphs: [

          "Some features rely on third-party providers. Translation and optional sign-in are the main exceptions to processing entirely on PDF Gerage infrastructure.",

        ],

      },

      {

        heading: "6. Cookies and browser storage",

        paragraphs: [

          "PDF Gerage uses HTTP cookies to maintain your sign-in session when you use an account. We do not use cookies for cross-site advertising.",

          "Your browser may store preferences such as dark mode or language selection.",

        ],

      },

      {

        heading: "7. Data retention",

        bullets: [

          "Converted files — not retained after the job finishes",

          "Account data — kept until you delete your account or ask us to remove it",

          "Contact messages — stored in our database until removed by our team",

          "Status uptime history — stored to power the public Status page",

        ],

      },

      {

        heading: "8. Your rights and choices",

        bullets: [

          "Use PDF Gerage without an account for many conversion tools",

          "Request account deletion by contacting us",

          "Review and update your account email or name from account settings when available",

        ],

      },

      {

        heading: "9. Children’s privacy",

        paragraphs: [

          "PDF Gerage is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us so we can remove it.",

        ],

      },

      {

        heading: "10. Changes to this policy",

        paragraphs: [

          "We may update this Privacy Policy from time to time. The “Last updated” date at the top will reflect the latest version. Continued use of PDF Gerage after changes means you accept the updated policy.",

        ],

      },

      {

        heading: "11. Contact us",

        paragraphs: [

          "Questions about this Privacy Policy? Visit the Contact page or email support@pdfgerage.app.",

        ],

      },

    ],

  },

  terms: {

    slug: "terms",

    title: "Terms of Service",

    subtitle: "Last updated: June 30, 2026",

    sections: [

      {

        paragraphs: [

          "These Terms of Service (“Terms”) govern your use of PDF Gerage. By accessing or using the service, you agree to these Terms. If you do not agree, do not use PDF Gerage.",

        ],

      },

      {

        heading: "1. The service",

        paragraphs: [

          "PDF Gerage provides file conversion, optimization, OCR, translation, and related tools through our website and cloud API. Feature availability depends on the formats you choose and the processing engines we operate.",

        ],

      },

      {

        heading: "2. Eligibility",

        paragraphs: [

          "You must be at least 13 years old to create an account. You are responsible for ensuring your use complies with applicable laws in your jurisdiction.",

        ],

      },

      {

        heading: "3. Acceptable use",

        bullets: [

          "Use PDF Gerage only for files you have the legal right to access, convert, and distribute",

          "Do not upload malware, illegal content, or material that infringes copyright or privacy rights",

          "Do not attempt to disrupt, reverse-engineer, scrape, or overload the service or its API",

          "Do not use automated tools to abuse translation or conversion endpoints",

          "Do not misrepresent your identity when contacting support or creating an account",

        ],

      },

      {

        heading: "4. Accounts",

        bullets: [

          "You are responsible for keeping your password confidential",

          "You must provide accurate account information",

          "We may suspend accounts that violate these Terms or pose a security risk",

          "You may stop using your account at any time; contact us to request deletion",

        ],

      },

      {

        heading: "5. Your content",

        paragraphs: [

          "You retain ownership of files and content you process with PDF Gerage. You grant us only the limited rights needed to perform conversions you request through the service.",

          "You are solely responsible for reviewing output before relying on it for legal, medical, financial, or other critical purposes.",

        ],

      },

      {

        heading: "6. Third-party services",

        paragraphs: [

          "Some features rely on third-party software or APIs. Your use of those features may be subject to separate terms from those providers. We are not responsible for third-party outages, pricing, or policy changes.",

        ],

      },

      {

        heading: "7. Disclaimer of warranties",

        paragraphs: [

          "PDF Gerage is provided “as is” and “as available” without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.",

          "Conversion quality varies by source file and format. We do not guarantee error-free, lossless, or perfectly formatted output for every file type.",

        ],

      },

      {

        heading: "8. Limitation of liability",

        paragraphs: [

          "To the fullest extent permitted by law, PDF Gerage and its contributors are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or business arising from your use of the service.",

          "Our total liability for any claim related to PDF Gerage is limited to the amount you paid us in the twelve months before the claim, or zero if you use the service for free.",

        ],

      },

      {

        heading: "9. Indemnification",

        paragraphs: [

          "You agree to indemnify and hold harmless PDF Gerage from claims arising out of your misuse of the service, your content, or your violation of these Terms or applicable law.",

        ],

      },

      {

        heading: "10. Termination",

        paragraphs: [

          "We may modify or discontinue features at any time. You may stop using PDF Gerage at any time. Sections that by nature should survive termination (including disclaimers, limitations of liability, and indemnification) will remain in effect.",

        ],

      },

      {

        heading: "11. Changes to these Terms",

        paragraphs: [

          "We may update these Terms occasionally. The “Last updated” date shows the current version. Continued use after changes constitutes acceptance of the revised Terms.",

        ],

      },

      {

        heading: "12. Governing law",

        paragraphs: [

          "These Terms are governed by the laws applicable where PDF Gerage is operated, without regard to conflict-of-law rules. Disputes should first be raised through the Contact page so we can try to resolve them informally.",

        ],

      },

      {

        heading: "13. Contact",

        paragraphs: [

          "Questions about these Terms? Visit the Contact page or email support@pdfgerage.app.",

        ],

      },

    ],

  },

};



export const FOOTER_LINKS = {

  company: [

    { label: "About Us", path: "/about" },

    { label: "Security", path: "/security" },

  ],

  resources: [

    { label: "Blog", path: "/blog" },

    { label: "Pricing", path: "/pricing" },

    { label: "Status", path: "/status" },

  ],

  legal: [

    { label: "Privacy", path: "/privacy" },

    { label: "Terms", path: "/terms" },

  ],

  contact: [{ label: "Contact Us", path: "/contact" }],

};


