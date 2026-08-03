/**
 * RTL (Right-to-Left) utility helpers.
 *
 * These utilities provide a consistent API for detecting and responding to
 * RTL language contexts across the application. They are used by the
 * WizardStepper, AppShell, and other direction-sensitive components.
 *
 * ## Design principles
 *
 * 1. **CSS logical properties are the primary mechanism** — most RTL mirroring
 *    happens automatically through `margin-inline-start`, `inset-inline-end`,
 *    etc. These utilities handle the cases CSS can't.
 *
 * 2. **Numeric labels stay LTR** — per Unicode TR-9 and TR-53, numeric
 *    sequences (step numbers, percentages, counts) must retain their LTR
 *    order even in RTL contexts. Use `dir="ltr"` + `unicode-bidi: isolate`
 *    on every numeric element.
 *
 * 3. **Document order is NEVER reversed** — RTL mirroring is purely visual.
 *    The DOM order of wizard steps, tab lists, and other sequential elements
 *    matches the logical reading order for all languages. CSS (`flex-direction`,
 *    `direction`) handles the visual reversal.
 *
 * 4. **Gradients need explicit RTL overrides** — CSS gradients use `to right`
 *    or `to left` which are physical, not logical. Always provide a matching
 *    `[dir="rtl"]` rule that mirrors the gradient angle.
 */

/**
 * Returns `true` if the document's `<html>` element has `dir="rtl"`.
 * Defaults to `false` for SSR environments where `document` is unavailable.
 */
export function isRtl(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("dir") === "rtl";
}

/**
 * Returns the CSS `direction` value for consumption in inline styles
 * or CSS-in-JS: `"rtl"` or `"ltr"`.
 */
export function direction(): "rtl" | "ltr" {
  return isRtl() ? "rtl" : "ltr";
}

/**
 * Returns the inline-start value for a directional CSS property.
 * In LTR this is `"left"`; in RTL this is `"right"`.
 *
 * Prefer CSS logical properties (`inset-inline-start`, `margin-inline-start`)
 * over this function in production code. Use this only when computing
 * imperative styles (e.g., positioning tooltips via `getBoundingClientRect`).
 */
export function inlineStart(): "left" | "right" {
  return isRtl() ? "right" : "left";
}

/**
 * Returns the inline-end value for a directional CSS property.
 * In LTR this is `"right"`; in RTL this is `"left"`.
 *
 * @see {@link inlineStart} for usage guidance.
 */
export function inlineEnd(): "left" | "right" {
  return isRtl() ? "left" : "right";
}

/**
 * Mirrors a gradient angle for RTL contexts.
 *
 * Given a CSS gradient direction like `"to right"`, returns the mirrored
 * equivalent `"to left"`. This is useful for progress bars, connector
 * lines, and other gradient-based visual flows that must mirror under RTL.
 *
 * @param gradientDir - A CSS gradient direction keyword (e.g., `"to right"`)
 * @returns The mirrored direction for RTL, or the original for LTR
 */
export function mirrorGradient(gradientDir: string): string {
  const mirrors: Record<string, string> = {
    "to right": "to left",
    "to left": "to right",
    "to top right": "to top left",
    "to top left": "to top right",
    "to bottom right": "to bottom left",
    "to bottom left": "to bottom right",
  };
  if (!isRtl()) return gradientDir;
  return mirrors[gradientDir] ?? gradientDir;
}

/**
 * Formats a step count for screen-reader announcement.
 *
 * The format is always LTR-numeric: "Step 2 of 5".
 * This function isolates the numeric parts so they are never reordered
 * by bidirectional text algorithms, even in RTL contexts.
 *
 * @param current - 1-based current step number
 * @param total - Total number of steps
 */
export function formatStepCount(current: number, total: number): string {
  // Use Unicode bidi isolation markers (LRI / PDI)
  return `Step \u2066${current}\u2069 of \u2066${total}\u2069`;
}
