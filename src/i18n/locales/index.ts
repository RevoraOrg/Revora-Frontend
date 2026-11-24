import arSA from "./ar-SA";
import enUS from "./en-US";
import type { IcuPluralForms } from "../../constants/i18n";

export type I18nLocale = "en-US" | "ar-SA";
type TranslationCatalog = Readonly<Record<string, string | IcuPluralForms>>;

export const catalogs: Record<I18nLocale, TranslationCatalog> = {
  "en-US": enUS,
  "ar-SA": arSA,
};

export const I18N_LOCALES: readonly I18nLocale[] = ["en-US", "ar-SA"];
