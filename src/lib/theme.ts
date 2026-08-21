const STYLE_ELEMENT_ID = 'notrieai-dynamic-theme';

export type ThemeColors = {
  background: string;
  foreground: string;
  primary: string;
  primary_foreground: string;
  secondary: string;
  secondary_foreground: string;
  accent: string;
  accent_foreground: string;
};

const VAR_MAP: Record<keyof ThemeColors, string> = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primary_foreground: '--primary-foreground',
  secondary: '--secondary',
  secondary_foreground: '--secondary-foreground',
  accent: '--accent',
  accent_foreground: '--accent-foreground',
};

function toCssDeclarations(colors: Partial<ThemeColors>): string {
  return (Object.keys(VAR_MAP) as (keyof ThemeColors)[])
    .filter((key) => Boolean(colors[key]))
    .map((key) => `${VAR_MAP[key]}: ${colors[key]};`)
    .join(' ');
}

/**
 * Injects a <style> tag with `:root { ... }` and `.dark { ... }` blocks
 * that override the base theme variables from index.css. Runs after the
 * stylesheet in source order, so it wins the cascade without needing
 * `!important` or inline styles (which would incorrectly apply to both
 * light and dark mode at once).
 */
export function applyTheme(light?: Partial<ThemeColors> | null, dark?: Partial<ThemeColors> | null) {
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }

  const lightCss = light ? `:root { ${toCssDeclarations(light)} }` : '';
  const darkCss = dark ? `.dark { ${toCssDeclarations(dark)} }` : '';
  styleEl.textContent = `${lightCss}\n${darkCss}`;
}

/** Parses the JSON-encoded theme_light/theme_dark values from the
 * /api/settings/public response and applies them. Safe to call with
 * missing/malformed values - it just skips what it can't parse. */
export function applyThemeFromSettings(settings: Record<string, string> | undefined) {
  if (!settings) return;
  let light: Partial<ThemeColors> | null = null;
  let dark: Partial<ThemeColors> | null = null;
  try {
    if (settings.theme_light) light = JSON.parse(settings.theme_light);
  } catch {
    // ignore malformed stored theme
  }
  try {
    if (settings.theme_dark) dark = JSON.parse(settings.theme_dark);
  } catch {
    // ignore malformed stored theme
  }
  if (light || dark) applyTheme(light, dark);
}
