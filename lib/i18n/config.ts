export const locales = [
  "en",
  "fr",
  "id",
  "de",
  "ar",
  "es",
  "sv",
  "nl",
  "ru",
  "tr",
  "it",
  "ms",
  "zh",
  "fa",
  "hi",
  "ur",
  "bn",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const rtlLocales: Locale[] = ["ar", "ur", "fa"];

export function isRtl(locale: string): boolean {
  return (rtlLocales as string[]).includes(locale);
}

// Human-readable names shown in the LocaleSwitcher, written in each
// language's own script (not translated into the viewer's language) — the
// convention used by virtually every multilingual site's language picker.
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  id: "Bahasa Indonesia",
  de: "Deutsch",
  ar: "العربية",
  es: "Español",
  sv: "Svenska",
  nl: "Nederlands",
  ru: "Русский",
  tr: "Türkçe",
  it: "Italiano",
  ms: "Bahasa Melayu",
  zh: "中文",
  fa: "فارسی",
  hi: "हिन्दी",
  ur: "اردو",
  bn: "বাংলা",
};
