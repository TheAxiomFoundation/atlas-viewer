import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function extractHexToken(source: string, tokenName: string): string {
  const match = source.match(new RegExp(`${tokenName}:\\s*'(?<value>#[0-9a-fA-F]{6})'`));

  if (!match?.groups?.value) {
    throw new Error(`Could not find ${tokenName} in theme source`);
  }

  return match.groups.value;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme tokens", () => {
  test("keeps document browser helper text on a passing muted token", () => {
    const themeSource = readFileSync(resolve(import.meta.dir, "theme.css.ts"), "utf8");
    const browserSource = readFileSync(
      resolve(import.meta.dir, "../components/DocumentBrowser.css.ts"),
      "utf8",
    );

    expect(browserSource).toContain("color: vars.color.textMuted");

    const textMuted = extractHexToken(themeSource, "textMuted");
    const bgElevated = extractHexToken(themeSource, "bgElevated");

    expect(textMuted).toBe("#888899");
    expect(contrastRatio(textMuted, bgElevated)).toBeGreaterThanOrEqual(4.5);
  });
});
