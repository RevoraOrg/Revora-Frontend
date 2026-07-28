export const SUPPORTED_LOCALES = ["en-US", "de-DE", "ja-JP", "ar-SA"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const TRANSLATION_KEY_CONVENTIONS = {
  separator: ".",
  example: "namespace.section.element",
  rules: [
    "Use dot-separated namespaces for distributed copy: auth.login.title, form.revenue.submit, error.offering.network",
    "Keep keys stable and independent from wording changes: do not embed literal copy or punctuation in keys",
    "Use lowercase, kebab-case segments and avoid UI implementation details in key names",
    "Use noun-driven keys for static copy and verb-driven keys for actions",
    "Place runtime parameters in placeholders, not in the key: report.accountSummary, not report.withTotal",
  ] as const,
};

export const I18N_COPY_EXPANSION_RATIO = 1.4;
export const RTL_LOCALES: SupportedLocale[] = ["ar-SA"];
export const LOCALE_DIRECTION: Record<SupportedLocale, "ltr" | "rtl"> = {
  "en-US": "ltr",
  "de-DE": "ltr",
  "ja-JP": "ltr",
  "ar-SA": "rtl",
};

export type IcuPluralForms = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export const LOCALE_FORMAT_SETTINGS: Record<SupportedLocale, {
  label: string;
  date: Intl.DateTimeFormatOptions;
  number: Intl.NumberFormatOptions;
  currency: Intl.NumberFormatOptions;
}> = {
  "en-US": {
    label: "English (United States)",
    date: { year: "numeric", month: "short", day: "numeric" },
    number: { maximumFractionDigits: 2 },
    currency: { style: "currency", currency: "USD", currencyDisplay: "symbol", maximumFractionDigits: 0 },
  },
  "de-DE": {
    label: "Deutsch (Deutschland)",
    date: { year: "numeric", month: "numeric", day: "numeric" },
    number: { maximumFractionDigits: 2 },
    currency: { style: "currency", currency: "EUR", currencyDisplay: "symbol", maximumFractionDigits: 0 },
  },
  "ja-JP": {
    label: "日本語 (日本)",
    date: { year: "numeric", month: "numeric", day: "numeric" },
    number: { maximumFractionDigits: 0, useGrouping: true },
    currency: { style: "currency", currency: "JPY", currencyDisplay: "symbol", maximumFractionDigits: 0 },
  },
  "ar-SA": {
    label: "العربية (السعودية)",
    date: { year: "numeric", month: "numeric", day: "numeric" },
    number: { maximumFractionDigits: 2, useGrouping: true },
    currency: { style: "currency", currency: "SAR", currencyDisplay: "symbol", maximumFractionDigits: 0 },
  },
};

export function buildTranslationKey(
  namespace: string,
  section: string,
  element: string,
): string {
  return [namespace, section, element]
    .filter(Boolean)
    .map((segment) => segment.trim().toLowerCase().replace(/\s+/g, "-"))
    .join(TRANSLATION_KEY_CONVENTIONS.separator);
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as SupportedLocale);
}

export function formatNumber(
  value: number,
  locale: SupportedLocale = "en-US",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    useGrouping: true,
    ...LOCALE_FORMAT_SETTINGS[locale].number,
    ...options,
  }).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: SupportedLocale = "en-US",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    ...LOCALE_FORMAT_SETTINGS[locale].currency,
    ...options,
  }).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: SupportedLocale = "en-US",
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    ...LOCALE_FORMAT_SETTINGS[locale].date,
    ...options,
  }).format(new Date(value));
}

export function getPluralCategory(locale: SupportedLocale, count: number): string {
  return new Intl.PluralRules(locale).select(count);
}

export function selectPluralForm(
  locale: SupportedLocale,
  count: number,
  forms: IcuPluralForms,
): string {
  const category = getPluralCategory(locale, count) as keyof IcuPluralForms;
  return forms[category] ?? forms.other;
}

export const I18N_ACCESSIBILITY_GUIDELINES = {
  responsiveCopy: "Always allow localized copy to wrap and line-break without truncation. Avoid fixed-width buttons and headline containers that clip expanded values.",
  translatorUI: "Render translation content with dir=\"auto\" and visible placeholder labels so translators can preview expanded strings in context.",
  copyExpansion: "Design UI components to handle at least 40% copy expansion, especially for German compounds and Arabic RTL sentence structures.",
  numericAccessibility: "Use locale-aware currency, number, and date formatting. Provide visible labels for currency and date context, not just symbols.",
};
