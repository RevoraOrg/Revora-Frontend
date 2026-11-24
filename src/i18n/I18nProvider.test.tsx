import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "./I18nProvider";
import { catalogs } from "./locales";

function I18nHarness() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span>{locale}</span>
      <span>{t("home.offering-count", { count: 2 })}</span>
      <button onClick={() => setLocale("ar-SA")}>Arabic</button>
      <button onClick={() => setLocale("en-US")}>English</button>
      <span>{t("home.title")}</span>
    </div>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps all locale catalogs on the same set of keys", () => {
    const localeKeys = Object.values(catalogs).map((catalog) =>
      Object.keys(catalog).sort(),
    );
    expect(localeKeys.every((keys) => JSON.stringify(keys) === JSON.stringify(localeKeys[0]))).toBe(true);
  });

  it("pluralizes in the active locale and updates document direction and persistence", async () => {
    render(
      <I18nProvider>
        <I18nHarness />
      </I18nProvider>,
    );

    expect(screen.getByText("2 offerings available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Arabic" }));

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("ar-SA");
      expect(document.documentElement.dir).toBe("rtl");
      expect(localStorage.getItem("revora-locale")).toBe("ar-SA");
    });
    expect(screen.getByText("عرضان متاحان")).toBeInTheDocument();
  });

  it("restores a persisted locale and its document direction", async () => {
    localStorage.setItem("revora-locale", "ar-SA");
    render(
      <I18nProvider>
        <I18nHarness />
      </I18nProvider>,
    );

    expect(screen.getByText("ar-SA")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
    });
  });

  it("returns the key and warns in development when no translation exists", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    function MissingTranslation() {
      return <span>{useI18n().t("missing.translation")}</span>;
    }

    render(
      <I18nProvider>
        <MissingTranslation />
      </I18nProvider>,
    );

    expect(screen.getByText("missing.translation")).toBeInTheDocument();
    expect(warning).toHaveBeenCalledWith(
      'Missing English fallback translation "missing.translation".',
    );
    warning.mockRestore();
  });
});
