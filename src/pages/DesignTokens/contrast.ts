// WCAG 2.1 relative luminance + contrast ratio helpers

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(hex: string, surface: string): number | null {
  const fg = parseHex(hex);
  const bg = parseHex(surface);
  if (!fg || !bg) return null;
  const L1 = luminance(...fg);
  const L2 = luminance(...bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function wcagGrade(ratio: number | null): "AAA" | "AA" | "AA Large" | "Fail" {
  if (ratio === null) return "Fail";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

// Light and dark reference surfaces
export const LIGHT_SURFACE = "#ffffff";
export const DARK_SURFACE = "#020617";
