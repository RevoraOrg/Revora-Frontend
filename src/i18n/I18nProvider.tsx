import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  interpolatePlaceholders,
  isRtlLocale,
  selectPluralForm,
  type IcuPluralForms,
} from "../constants/i18n";
import { catalogs, type I18nLocale } from "./locales";

const DEFAULT_LOCALE: I18nLocale = "en-US";
const LOCALE_STORAGE_KEY = "revora-locale";

type TranslationParams = Record<string, string | number>;
type TranslationValue = string | IcuPluralForms;

interface I18nContextValue {
  locale: I18nLocale;
  setLocale: (locale: I18nLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isI18nLocale(locale: string | null): locale is I18nLocale {
  return locale !== null && Object.prototype.hasOwnProperty.call(catalogs, locale);
}

function isPluralForms(value: TranslationValue): value is IcuPluralForms {
  return typeof value !== "string";
}

function readInitialLocale(): I18nLocale {
  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isI18nLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<I18nLocale>(readInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback(
    (key: string, params: TranslationParams = {}) => {
      const currentCatalog = catalogs[locale];
      const englishCatalog = catalogs[DEFAULT_LOCALE];
      let value = currentCatalog[key];
      let translationLocale = locale;

      if (value === undefined) {
        value = englishCatalog[key];
        translationLocale = DEFAULT_LOCALE;
        if (import.meta.env.DEV) {
          console.warn(`Missing translation "${key}" for locale "${locale}".`);
        }
      }

      if (value === undefined) {
        if (import.meta.env.DEV) {
          console.warn(`Missing English fallback translation "${key}".`);
        }
        return key;
      }

      const template = isPluralForms(value)
        ? selectPluralForm(
            translationLocale,
            typeof params.count === "number" ? params.count : 0,
            value,
          )
        : value;

      return interpolatePlaceholders(template, params);
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, t],
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }
  return context;
}
