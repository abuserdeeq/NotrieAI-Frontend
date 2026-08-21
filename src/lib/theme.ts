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
  const declarations = (Object.keys(VAR_MAP) as (keyof ThemeColors)[])
    .filter((key) => Boolean(colors[key]))
    .map((key) => `${VAR_MAP[key]}: ${colors[key]};`);

  // Keep the editor simple (8 semantic colors) while making the whole UI
  // follow the same palette: cards, borders, inputs, sidebar, ring and charts
  // all inherit from the selected semantic colors.
  if (colors.background) {
    declarations.push('--card: var(--background);', '--popover: var(--background);');
  }
  if (colors.secondary) {
    declarations.push(
      '--border: var(--secondary);',
      '--card-border: var(--secondary);',
      '--popover-border: var(--secondary);',
      '--input: var(--secondary);',
      '--muted: var(--secondary);',
      '--sidebar-accent: var(--secondary);',
    );
  }
  if (colors.secondary_foreground) {
    declarations.push(
      '--card-foreground: var(--secondary-foreground);',
      '--popover-foreground: var(--secondary-foreground);',
      '--muted-foreground: var(--secondary-foreground);',
    );
  }
  if (colors.primary) {
    declarations.push('--sidebar: var(--primary);', '--chart-1: var(--primary);');
  }
  if (colors.primary_foreground) {
    declarations.push(
      '--sidebar-foreground: var(--primary-foreground);',
      '--sidebar-primary-foreground: var(--primary-foreground);',
    );
  }
  if (colors.accent) {
    declarations.push(
      '--ring: var(--accent);',
      '--sidebar-primary: var(--accent);',
      '--chart-2: var(--accent);',
      '--chart-3: var(--accent);',
    );
  }
  if (colors.accent_foreground) {
    declarations.push('--sidebar-accent-foreground: var(--accent-foreground);');
  }

  return declarations.join(' ');
}

/** Applies one global admin-selected color palette to the whole app. */
export function applyTheme(theme?: Partial<ThemeColors> | null) {
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }

  // Passing null/undefined removes all dynamic overrides and restores the
  // original palette defined in index.css.
  styleEl.textContent = theme ? `:root { ${toCssDeclarations(theme)} }` : '';
}

/** Parses the JSON-encoded theme_light value from public settings. */
export function applyThemeFromSettings(settings: Record<string, string> | undefined) {
  if (!settings) return;
  try {
    if (settings.theme_light) {
      applyTheme(JSON.parse(settings.theme_light));
    } else {
      applyTheme(null);
    }
  } catch {
    // If the stored theme is malformed, keep the built-in palette.
    applyTheme(null);
  }
}
