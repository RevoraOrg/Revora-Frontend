import { TOKEN_GROUPS, type Token, type TokenGroup } from "./tokens";

export type ChangeStatus = "added" | "changed" | "removed" | "unchanged";
export type ExportFormat = "json" | "css" | "sass";

export interface TokenDiffEntry {
  variable: string;
  name: string;
  status: ChangeStatus;
  before?: string;
  after?: string;
  description?: string;
  type: TokenGroup["type"];
  isBinary: boolean;
}

export interface TokenDiffGroup {
  id: string;
  label: string;
  entries: TokenDiffEntry[];
}

export const BINARY_ASSET_LABEL = "[binary asset]";

function indexByGroup(groups: TokenGroup[]): Map<string, Map<string, Token>> {
  const index = new Map<string, Map<string, Token>>();
  for (const group of groups) {
    const tokens = new Map<string, Token>();
    for (const token of group.tokens) tokens.set(token.variable, token);
    index.set(group.id, tokens);
  }
  return index;
}

export function computeTokenDiff(
  before: TokenGroup[],
  after: TokenGroup[]
): TokenDiffGroup[] {
  const beforeIndex = indexByGroup(before);
  const afterIndex = indexByGroup(after);
  const groupIds = Array.from(
    new Set([...beforeIndex.keys(), ...afterIndex.keys()])
  );

  return groupIds
    .map((id) => {
      const beforeGroup = before.find((g) => g.id === id);
      const afterGroup = after.find((g) => g.id === id);
      // Every group id comes from at least one snapshot, so the
      // representative group is always present.
      const group = (afterGroup ?? beforeGroup)!;
      const beforeTokens = beforeIndex.get(id) ?? new Map<string, Token>();
      const afterTokens = afterIndex.get(id) ?? new Map<string, Token>();
      const variables = Array.from(
        new Set([...beforeTokens.keys(), ...afterTokens.keys()])
      );

      const entries: TokenDiffEntry[] = variables.map((variable) => {
        const beforeToken = beforeTokens.get(variable);
        const afterToken = afterTokens.get(variable);
        // Every variable comes from at least one snapshot, so the
        // representative token is always present.
        const current = (afterToken ?? beforeToken)!;

        let status: ChangeStatus = "unchanged";
        if (beforeToken && !afterToken) status = "removed";
        else if (!beforeToken && afterToken) status = "added";
        else if (beforeToken && afterToken && beforeToken.value !== afterToken.value)
          status = "changed";

        return {
          variable,
          name: current.name,
          status,
          before: beforeToken?.value,
          after: afterToken?.value,
          description: afterToken?.description ?? beforeToken?.description,
          type: group.type,
          isBinary: Boolean(afterToken?.isBinary ?? beforeToken?.isBinary),
        };
      });

      return {
        id,
        label: group.label,
        entries,
      };
    })
    .filter((group) => group.entries.length > 0);
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function displayValue(entry: TokenDiffEntry): string {
  if (entry.isBinary) return BINARY_ASSET_LABEL;
  return entry.after ?? entry.before ?? "";
}

export function formatDiffJSON(groups: TokenDiffGroup[]): string {
  const added: Record<string, string> = {};
  const changed: Record<string, { before: string; after: string }> = {};
  const removed: Record<string, string> = {};

  for (const group of groups) {
    for (const entry of group.entries) {
      if (entry.status === "added") {
        added[entry.variable] = displayValue(entry);
      } else if (entry.status === "changed") {
        changed[entry.variable] = {
          before: entry.before ?? "",
          after: displayValue(entry),
        };
      } else if (entry.status === "removed") {
        removed[entry.variable] = entry.before ?? "";
      }
    }
  }

  return JSON.stringify({ added, changed, removed }, null, 2);
}

export function formatDiffCSS(groups: TokenDiffGroup[]): string {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  for (const group of groups) {
    for (const entry of group.entries) {
      if (entry.status === "added") {
        added.push(`  ${entry.variable}: ${displayValue(entry)};`);
      } else if (entry.status === "changed") {
        changed.push(`  ${entry.variable}: ${displayValue(entry)};`);
      } else if (entry.status === "removed") {
        removed.push(`  ${entry.variable}: ${entry.before ?? ""};`);
      }
    }
  }

  const sections: string[] = [];
  const root: string[] = [":root {"];
  if (added.length > 0) root.push("  /* added */", ...added);
  if (changed.length > 0) root.push("  /* changed */", ...changed);
  root.push("}");
  sections.push(root.join("\n"));

  if (removed.length > 0) {
    sections.push(
      ["/* removed */", ...removed.map((line) => `/* ${line} */`)].join("\n")
    );
  }

  return sections.join("\n\n");
}

export function formatDiffSass(groups: TokenDiffGroup[]): string {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  const sassName = (variable: string) => variable.replace(/^--/, "$");

  for (const group of groups) {
    for (const entry of group.entries) {
      if (entry.status === "added") {
        added.push(`${sassName(entry.variable)}: ${displayValue(entry)};`);
      } else if (entry.status === "changed") {
        changed.push(`${sassName(entry.variable)}: ${displayValue(entry)};`);
      } else if (entry.status === "removed") {
        removed.push(`${sassName(entry.variable)}: ${entry.before ?? ""};`);
      }
    }
  }

  const sections: string[] = [];
  if (added.length > 0) sections.push(`// added\n${added.join("\n")}`);
  if (changed.length > 0) sections.push(`// changed\n${changed.join("\n")}`);
  if (removed.length > 0)
    sections.push(`// removed\n${removed.map((line) => `// ${line}`).join("\n")}`);

  return sections.join("\n\n");
}

export function formatDiff(
  groups: TokenDiffGroup[],
  format: ExportFormat
): string {
  switch (format) {
    case "css":
      return formatDiffCSS(groups);
    case "sass":
      return formatDiffSass(groups);
    case "json":
    default:
      return formatDiffJSON(groups);
  }
}

export function diffFilename(format: ExportFormat): string {
  const extension = format === "sass" ? "scss" : format;
  return `revora-token-diff.${extension}`;
}

function overrideValues(
  groups: TokenGroup[],
  overrides: Record<string, string>
): TokenGroup[] {
  return groups.map((group) => ({
    ...group,
    tokens: group.tokens.map((token) =>
      overrides[token.variable] !== undefined
        ? { ...token, value: overrides[token.variable] }
        : token
    ),
  }));
}

function removeTokens(groups: TokenGroup[], variables: string[]): TokenGroup[] {
  return groups.map((group) => ({
    ...group,
    tokens: group.tokens.filter((t) => !variables.includes(t.variable)),
  }));
}

function addTokens(
  groups: TokenGroup[],
  id: string,
  tokens: Token[]
): TokenGroup[] {
  return groups.map((group) =>
    group.id === id ? { ...group, tokens: [...group.tokens, ...tokens] } : group
  );
}

/**
 * The previous saved snapshot. A small number of values differ from the
 * current draft so the diff view has added, changed, and removed examples.
 */
export const TOKEN_DIFF_BEFORE: TokenGroup[] = addTokens(
  removeTokens(
    overrideValues(TOKEN_GROUPS, {
      "--primary": "#2563eb",
      "--primary-hover": "#1d4ed8",
      "--error": "#dc2626",
      "--chart-cat-6-light": "#0e7490",
      "--spacing-2xl": "1.75rem",
      "--spacing-4xl": "4.5rem",
      "--radius-md": "0.375rem",
      "--font-size-5xl": "3.5rem",
      "--font-weight-bold": "800",
      "--shadow-xl": "0 24px 60px rgba(0,0,0,0.45)",
      "--duration-kpi": "2s",
    }),
    ["--ds-error-icon-bg"]
  ),
  "colors",
  [
    {
      name: "Legacy Accent",
      variable: "--legacy-accent",
      value: "#f59e0b",
      description: "Deprecated accent — replaced by the primary scale",
    },
  ]
);

/** The current draft state, including newly added and binary tokens. */
export const TOKEN_DIFF_AFTER: TokenGroup[] = [
  ...TOKEN_GROUPS,
  {
    id: "icons",
    label: "Icons (Binary)",
    type: "motion",
    tokens: [
      {
        name: "Logo Mark",
        variable: "--icon-logo",
        value: "binary:logo.svg",
        description: "Brand logo asset",
        isBinary: true,
      },
      {
        name: "Lock Icon",
        variable: "--icon-lock",
        value: "binary:lock.svg",
        description: "Secure action glyph",
        isBinary: true,
      },
    ],
  },
];
