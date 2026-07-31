import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import type { TokenGroup } from "./tokens";
import { TokenDiff } from "./TokenDiff";
import {
  computeTokenDiff,
  diffFilename,
  formatDiff,
  formatDiffCSS,
  formatDiffJSON,
  formatDiffSass,
  isHexColor,
  TOKEN_DIFF_AFTER,
  TOKEN_DIFF_BEFORE,
  type TokenDiffGroup,
} from "./tokenDiff";

const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

global.URL.createObjectURL = vi.fn(() => "blob:mock");
global.URL.revokeObjectURL = vi.fn();

const colors = (tokens: TokenGroup["tokens"]): TokenGroup => ({
  id: "colors",
  label: "Colors",
  type: "color",
  tokens,
});

const makeToken = (
  variable: string,
  name: string,
  value: string
): TokenGroup["tokens"][number] => ({ variable, name, value });

const minimalBefore: TokenGroup[] = [
  colors([
    makeToken("--primary", "Primary", "#2563eb"),
    makeToken("--overlay", "Overlay", "rgba(0,0,0,0.5)"),
    makeToken("--text-main", "Text Main", "#e5e7eb"),
  ]),
];

const minimalAfter: TokenGroup[] = [
  colors([
    makeToken("--primary", "Primary", "#3b82f6"),
    makeToken("--overlay", "Overlay", "rgba(0,0,0,0.6)"),
    makeToken("--text-main", "Text Main", "#e5e7eb"),
    makeToken("--accent", "Accent", "#38bdf8"),
  ]),
  {
    id: "icons",
    label: "Icons",
    type: "motion",
    tokens: [
      { name: "Logo", variable: "--icon-logo", value: "binary:logo.svg", isBinary: true },
    ],
  },
];

describe("tokenDiff helpers", () => {
  it("classifies added, changed, removed, and unchanged tokens", () => {
    const before: TokenGroup[] = [
      colors([
        makeToken("--primary", "Primary", "#2563eb"),
        makeToken("--legacy", "Legacy", "#f59e0b"),
        makeToken("--text-main", "Text Main", "#e5e7eb"),
      ]),
    ];
    const after: TokenGroup[] = [
      colors([
        makeToken("--primary", "Primary", "#3b82f6"),
        makeToken("--text-main", "Text Main", "#e5e7eb"),
        makeToken("--accent", "Accent", "#38bdf8"),
      ]),
    ];

    const groups = computeTokenDiff(before, after);
    expect(groups).toHaveLength(1);
    const byVariable = new Map(groups[0].entries.map((e) => [e.variable, e]));

    expect(byVariable.get("--primary")?.status).toBe("changed");
    expect(byVariable.get("--accent")?.status).toBe("added");
    expect(byVariable.get("--legacy")?.status).toBe("removed");
    expect(byVariable.get("--text-main")?.status).toBe("unchanged");
  });

  it("includes groups present in only one side and merges labels", () => {
    const groups = computeTokenDiff(
      [colors([makeToken("--a", "A", "1")])],
      [
        {
          id: "icons",
          label: "Icons (Binary)",
          type: "motion",
          tokens: [
            { name: "Logo", variable: "--icon-logo", value: "x", isBinary: true },
          ],
        },
      ]
    );
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("colors");
    expect(ids).toContain("icons");
    const icons = groups.find((g) => g.id === "icons");
    expect(icons?.entries[0].status).toBe("added");
    expect(icons?.entries[0].isBinary).toBe(true);
  });

  it("skips empty groups and falls back to before-side details", () => {
    const before: TokenGroup[] = [
      {
        id: "motion",
        label: "Motion Before",
        type: "motion",
        tokens: [
          { name: "Legacy Accent", variable: "--legacy-accent", value: "#f59e0b", description: "old" },
        ],
      },
      { id: "empty-group", label: "Empty", type: "motion", tokens: [] },
    ];
    const groups = computeTokenDiff(before, []);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Motion Before");
    expect(groups[0].entries[0]).toMatchObject({
      status: "removed",
      before: "#f59e0b",
      description: "old",
      type: "motion",
      isBinary: false,
    });
  });

  it("produces a meaningful diff from the bundled snapshots", () => {
    const groups = computeTokenDiff(TOKEN_DIFF_BEFORE, TOKEN_DIFF_AFTER);
    const all = groups.flatMap((g) => g.entries);
    const statusCounts = all.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});
    expect(statusCounts.added).toBe(3);
    expect(statusCounts.changed).toBe(11);
    expect(statusCounts.removed).toBe(1);
    expect(statusCounts.unchanged).toBe(73);
  });

  it("isHexColor accepts shorthand and long hex only", () => {
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("#3b82f6")).toBe(true);
    expect(isHexColor("rgba(0,0,0,0.5)")).toBe(false);
    expect(isHexColor("binary:logo.svg")).toBe(false);
    expect(isHexColor("#12345")).toBe(false);
    expect(isHexColor("red")).toBe(false);
  });
});

describe("export formatters", () => {
  it("formats JSON with added/changed/removed sections", () => {
    const groups = computeTokenDiff(minimalBefore, minimalAfter);
    const json = JSON.parse(formatDiffJSON(groups));
    expect(json.added).toMatchObject({ "--accent": "#38bdf8", "--icon-logo": "[binary asset]" });
    expect(json.changed["--primary"]).toEqual({ before: "#2563eb", after: "#3b82f6" });
    expect(json.removed).toEqual({});
  });

  it("formats JSON removed values from the before snapshot", () => {
    const before = [colors([makeToken("--legacy", "Legacy", "#f59e0b")])];
    const after = [colors([])];
    const groups = computeTokenDiff(before, after);
    const json = JSON.parse(formatDiffJSON(groups));
    expect(json.removed).toEqual({ "--legacy": "#f59e0b" });
  });

  it("formats CSS variables with added/changed and commented removed lines", () => {
    const groups = computeTokenDiff(minimalBefore, minimalAfter);
    const css = formatDiffCSS(groups);
    expect(css).toContain(":root {");
    expect(css).toContain("/* added */");
    expect(css).toContain("  --primary: #3b82f6;");
    expect(css).toContain("  --icon-logo: [binary asset];");
  });

  it("formats CSS with a commented removed block when tokens were removed", () => {
    const before = [colors([makeToken("--legacy", "Legacy", "#f59e0b")])];
    const after = [colors([])];
    const groups = computeTokenDiff(before, after);
    const css = formatDiffCSS(groups);
    expect(css).toContain("/* removed */");
    expect(css).toContain("/*   --legacy: #f59e0b; */");
  });

  it("formats Sass variables with dollar-prefixed names", () => {
    const groups = computeTokenDiff(minimalBefore, minimalAfter);
    const sass = formatDiffSass(groups);
    expect(sass).toContain("// added");
    expect(sass).toContain("$accent: #38bdf8;");
    expect(sass).toContain("// changed");
    expect(sass).toContain("$primary: #3b82f6;");
  });

  it("formats Sass removed variables as comments", () => {
    const before = [colors([makeToken("--legacy", "Legacy", "#f59e0b")])];
    const after = [colors([])];
    const groups = computeTokenDiff(before, after);
    const sass = formatDiffSass(groups);
    expect(sass).toContain("// removed");
    expect(sass).toContain("// $legacy: #f59e0b;");
  });

  it("dispatches by format", () => {
    const groups = computeTokenDiff(minimalBefore, minimalAfter);
    expect(formatDiff(groups, "json")).toBe(formatDiffJSON(groups));
    expect(formatDiff(groups, "css")).toBe(formatDiffCSS(groups));
    expect(formatDiff(groups, "sass")).toBe(formatDiffSass(groups));
  });

  it("maps formats to filenames", () => {
    expect(diffFilename("json")).toBe("revora-token-diff.json");
    expect(diffFilename("css")).toBe("revora-token-diff.css");
    expect(diffFilename("sass")).toBe("revora-token-diff.scss");
  });

  it("handles entries with missing before/after values defensively", () => {
    const groups: TokenDiffGroup[] = [
      {
        id: "colors",
        label: "Colors",
        entries: [
          {
            variable: "--primary",
            name: "Primary",
            status: "changed",
            before: undefined,
            after: "#3b82f6",
            type: "color",
            isBinary: false,
          },
          {
            variable: "--legacy",
            name: "Legacy",
            status: "removed",
            before: undefined,
            after: undefined,
            type: "color",
            isBinary: false,
          },
        ],
      },
    ];
    const json = JSON.parse(formatDiffJSON(groups));
    expect(json.changed["--primary"].before).toBe("");
    expect(json.removed["--legacy"]).toBe("");
    expect(formatDiffCSS(groups)).toContain("  --legacy: ;");
    expect(formatDiffSass(groups)).toContain("// $legacy: ;");
  });
});

describe("TokenDiff component", () => {
  beforeEach(() => {
    mockWriteText.mockClear();
  });

  it("renders heading, summary chips, and export tabs", () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    expect(
      screen.getByRole("heading", { name: /token diff & export/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("3 added")).toBeInTheDocument();
    expect(screen.getByLabelText("11 changed")).toBeInTheDocument();
    expect(screen.getByLabelText("1 removed")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /export format/i })).toBeInTheDocument();
  });

  it("shows added, changed, and removed rows and hides unchanged by default", () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    expect(screen.getByLabelText("Legacy Accent: removed")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/changed/i).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Text Main: unchanged")).not.toBeInTheDocument();
  });

  it("reveals unchanged rows when Show unchanged is toggled", async () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    await userEvent.click(screen.getByRole("button", { name: /show unchanged/i }));
    expect(screen.getByLabelText("Text Main: unchanged")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /hide unchanged/i }));
    expect(screen.queryByLabelText("Text Main: unchanged")).not.toBeInTheDocument();
  });

  it("filters rows by status", async () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    await userEvent.click(screen.getByRole("button", { name: /^removed/i }));
    expect(screen.getByLabelText("Legacy Accent: removed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Primary: changed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^removed/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders binary tokens without raw values", () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    expect(screen.getAllByText("Binary asset").length).toBeGreaterThan(0);
    expect(screen.queryByText("binary:logo.svg")).not.toBeInTheDocument();
  });

  it("renders color swatches only for hex color values", () => {
    const { container } = render(
      <TokenDiff before={minimalBefore} after={minimalAfter} />
    );
    const swatches = container.querySelectorAll(".dt-diff-swatch");
    expect(swatches.length).toBeGreaterThan(0);
  });

  it("renders a dash for added-before and removed-after cells", () => {
    render(<TokenDiff before={minimalBefore} after={minimalAfter} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("collapses and expands a group", async () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    const header = screen.getByRole("button", { name: /^colors/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Primary: changed")).not.toBeInTheDocument();
    await userEvent.click(header);
    expect(screen.getByLabelText("Primary: changed")).toBeInTheDocument();
  });

  it("copies the export preview and shows feedback", async () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    await userEvent.click(screen.getByRole("button", { name: /copy diff as json/i }));
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('"added"'));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy diff as json/i })).toHaveTextContent("Copied")
    );
  });

  it("switches export formats and updates the preview", async () => {
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    const preview = screen.getByLabelText(/diff export preview/i);
    expect(preview).toHaveTextContent('"added"');

    await userEvent.click(screen.getByRole("tab", { name: /css variables/i }));
    expect(screen.getByLabelText(/diff export preview \(css\)/i)).toHaveTextContent(":root {");
    await userEvent.click(screen.getByRole("tab", { name: /sass/i }));
    expect(screen.getByLabelText(/diff export preview \(sass\)/i)).toHaveTextContent("// added");
  });

  it("downloads the diff in the selected format", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />);
    fireEvent.click(screen.getByRole("button", { name: /download diff as json/i }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("shows the no-changes empty state when snapshots match", () => {
    render(<TokenDiff before={minimalAfter} after={minimalAfter} />);
    expect(screen.getByRole("status")).toHaveTextContent(/no token changes/i);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows a filter empty state when no rows match and lets users clear it", async () => {
    const onlyBefore = [colors([makeToken("--primary", "Primary", "#2563eb")])];
    const onlyAfter = [
      colors([
        makeToken("--primary", "Primary", "#2563eb"),
        makeToken("--accent", "Accent", "#38bdf8"),
      ]),
    ];
    render(<TokenDiff before={onlyBefore} after={onlyAfter} />);
    await userEvent.click(screen.getByRole("button", { name: /^removed/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/no tokens match the current filter/i);
    await userEvent.click(screen.getByRole("button", { name: /clearing the status filter/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TokenDiff before={TOKEN_DIFF_BEFORE} after={TOKEN_DIFF_AFTER} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
