import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

expect.extend(toHaveNoViolations);

const settingsRoutes = [
  { path: "/settings", element: <SettingsPage /> },
  { path: "/settings/:tab", element: <SettingsPage /> },
];

function renderSettingsAt(initialEntry = "/settings") {
  const router = createMemoryRouter(settingsRoutes, {
    initialEntries: [initialEntry],
  });
  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

describe("SettingsPage", () => {
  it("renders settings header and default i18n tab at /settings", () => {
    renderSettingsAt("/settings");

    expect(screen.getByRole("heading", { name: /Account & Application Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /Settings tabs/i })).toBeInTheDocument();
    const i18nTab = screen.getByRole("tab", { name: /Localization & Formatting/i });
    expect(i18nTab).toHaveAttribute("aria-selected", "true");
    expect(i18nTab).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: /Payout Settings/i })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { name: /Locale Formatter Preview/i })).toBeInTheDocument();
  });

  it.each([
    ["/settings/i18n", /Localization & Formatting/i, () => screen.getByRole("heading", { name: /Locale Formatter Preview/i })],
    ["/settings/payouts", /Payout Settings/i, () => screen.getByRole("heading", { name: /Payout Schedule/i })],
    ["/settings/compliance", /Compliance & Regions/i, () => screen.getByRole("heading", { name: /Regional Access Controls/i })],
    ["/settings/general", /General Offering Settings/i, () => screen.getByLabelText(/Offering Name/i)],
  ])("opens %s directly via deep link", (path, tabLabel, getPanelElement) => {
    renderSettingsAt(path);

    const activeTab = screen.getByRole("tab", { name: tabLabel });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(getPanelElement()).toBeInTheDocument();
  });

  it("redirects unknown tab slugs to the default tab", () => {
    const { router } = renderSettingsAt("/settings/unknown-slug");

    expect(router.state.location.pathname).toBe("/settings/i18n");
    expect(screen.getByRole("tab", { name: /Localization & Formatting/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /Locale Formatter Preview/i })).toBeInTheDocument();
  });

  it("updates URL when switching tabs and moves between tabs on browser back/forward", async () => {
    const { router } = renderSettingsAt("/settings");

    fireEvent.click(screen.getByRole("tab", { name: /Payout Settings/i }));
    expect(router.state.location.pathname).toBe("/settings/payouts");
    expect(screen.getByRole("heading", { name: /Payout Schedule/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Compliance & Regions/i }));
    expect(router.state.location.pathname).toBe("/settings/compliance");
    expect(screen.getByRole("heading", { name: /Regional Access Controls/i })).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe("/settings/payouts");
    expect(screen.getByRole("tab", { name: /Payout Settings/i })).toHaveAttribute("aria-selected", "true");

    await act(async () => {
      await router.navigate(1);
    });
    expect(router.state.location.pathname).toBe("/settings/compliance");
    expect(screen.getByRole("tab", { name: /Compliance & Regions/i })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard navigation with ArrowRight, ArrowLeft, End, and Home and roving tabindex", () => {
    const { router } = renderSettingsAt("/settings/i18n");

    const i18nTab = screen.getByRole("tab", { name: /Localization & Formatting/i });
    const payoutsTab = screen.getByRole("tab", { name: /Payout Settings/i });
    const complianceTab = screen.getByRole("tab", { name: /Compliance & Regions/i });
    const generalTab = screen.getByRole("tab", { name: /General Offering Settings/i });

    fireEvent.keyDown(i18nTab, { key: "ArrowRight" });
    expect(router.state.location.pathname).toBe("/settings/payouts");
    expect(payoutsTab).toHaveAttribute("aria-selected", "true");
    expect(payoutsTab).toHaveAttribute("tabindex", "0");
    expect(i18nTab).toHaveAttribute("tabindex", "-1");
    expect(payoutsTab).toHaveFocus();

    fireEvent.keyDown(payoutsTab, { key: "End" });
    expect(router.state.location.pathname).toBe("/settings/general");
    expect(generalTab).toHaveAttribute("aria-selected", "true");
    expect(generalTab).toHaveAttribute("tabindex", "0");
    expect(generalTab).toHaveFocus();

    fireEvent.keyDown(generalTab, { key: "ArrowLeft" });
    expect(router.state.location.pathname).toBe("/settings/compliance");
    expect(complianceTab).toHaveAttribute("aria-selected", "true");
    expect(complianceTab).toHaveFocus();

    fireEvent.keyDown(complianceTab, { key: "Home" });
    expect(router.state.location.pathname).toBe("/settings/i18n");
    expect(i18nTab).toHaveAttribute("aria-selected", "true");
    expect(i18nTab).toHaveFocus();
  });

  it("also works standalone outside a router context", () => {
    render(<SettingsPage />);

    const payoutsTab = screen.getByRole("tab", { name: /Payout Settings/i });
    fireEvent.click(payoutsTab);

    expect(payoutsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /Payout Schedule/i })).toBeInTheDocument();
  });

  it.each([
    "/settings/i18n",
    "/settings/payouts",
    "/settings/compliance",
    "/settings/general",
  ])("passes axe accessibility checks on %s", async (path) => {
    const { container } = renderSettingsAt(path);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

