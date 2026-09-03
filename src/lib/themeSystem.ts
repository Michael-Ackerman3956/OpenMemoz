/**
 * Two-layer theme system: Color Palette × Visual Style.
 * Color palettes swap CSS custom properties (--paper, --ink, etc.).
 * Visual styles add a class that controls card morphism (flat, glass, neu).
 * Both persist independently in localStorage.
 */

export interface ColorPalette {
  paletteIdentifier: string;
  displayName: string;
  tokens: {
    paper: string;
    ink: string;
    accent: string;
    muted: string;
    surface: string;
    card: string;
    rule: string;
    teal: string;
    amber: string;
  };
  fontOverride?: {
    serif?: string;
    body?: string;
    sans?: string;
  };
}

export type VisualStyleIdentifier = "flat" | "glass" | "neu";

export interface VisualStyle {
  styleIdentifier: VisualStyleIdentifier;
  displayName: string;
  description: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    paletteIdentifier: "midnight",
    displayName: "Midnight Press",
    tokens: { paper: "#0D0C0A", ink: "#EDE8DC", accent: "#D0554A", muted: "#9A9484", surface: "#16140F", card: "#1C1A14", rule: "#332E22", teal: "#4FB89A", amber: "#DCA04A" },
  },
  {
    paletteIdentifier: "broadsheet",
    displayName: "Classic Broadsheet",
    tokens: { paper: "#E0E0E0", ink: "#1A1A1A", accent: "#333333", muted: "#666666", surface: "#D4D4D4", card: "#EBEBEB", rule: "#AAAAAA", teal: "#555555", amber: "#444444" },
  },
  {
    paletteIdentifier: "sepia",
    displayName: "Sepia Gazette",
    tokens: { paper: "#F2E8D5", ink: "#4A3728", accent: "#8B4513", muted: "#8B7355", surface: "#EAD9BE", card: "#FAF3E8", rule: "#C9B896", teal: "#6B8E6B", amber: "#B8860B" },
  },
  {
    paletteIdentifier: "arctic",
    displayName: "Arctic White",
    tokens: { paper: "#FAFBFC", ink: "#1F2937", accent: "#3B82F6", muted: "#94A3B8", surface: "#F1F5F9", card: "#FFFFFF", rule: "#E2E8F0", teal: "#14B8A6", amber: "#F59E0B" },
  },
  {
    paletteIdentifier: "sakura",
    displayName: "Sakura",
    tokens: { paper: "#FFF0F3", ink: "#4A2040", accent: "#EC4899", muted: "#DB2777", surface: "#FFF5F7", card: "#FFFBFC", rule: "#FBCFE8", teal: "#14B8A6", amber: "#F472B6" },
  },
  {
    paletteIdentifier: "ocean",
    displayName: "Deep Ocean",
    tokens: { paper: "#0F1D32", ink: "#CBD5E1", accent: "#0EA5E9", muted: "#475569", surface: "#132640", card: "#162B4A", rule: "#1E3A5F", teal: "#38BDF8", amber: "#F59E0B" },
  },
  {
    paletteIdentifier: "sunset",
    displayName: "Sunset Journal",
    tokens: { paper: "#1A0F0A", ink: "#F5DEB3", accent: "#FF6B35", muted: "#B8733D", surface: "#211510", card: "#2A1B12", rule: "#3D2A1A", teal: "#FFA62B", amber: "#FF8C42" },
  },
  {
    paletteIdentifier: "neon",
    displayName: "Neon Cyber",
    tokens: { paper: "#0A0A1A", ink: "#E0E0FF", accent: "#FF006E", muted: "#6366F1", surface: "#10102A", card: "#151533", rule: "#1E1E4A", teal: "#06B6D4", amber: "#FBBF24" },
  },
  {
    paletteIdentifier: "emerald",
    displayName: "Emerald Deco",
    tokens: { paper: "#0A1F1A", ink: "#D4E7D0", accent: "#50C878", muted: "#2D6A4F", surface: "#0D2B22", card: "#112E25", rule: "#2D6A4F", teal: "#6EE7B7", amber: "#A7F3D0" },
  },
  {
    paletteIdentifier: "brutalist",
    displayName: "Brutalist",
    tokens: { paper: "#FFFF00", ink: "#000000", accent: "#000000", muted: "#333333", surface: "#EAEA00", card: "#F5F500", rule: "#000000", teal: "#000000", amber: "#333333" },
    fontOverride: { serif: "'Space Mono', monospace", body: "'Space Mono', monospace" },
  },
  {
    paletteIdentifier: "vapor",
    displayName: "Vaporwave",
    tokens: { paper: "#1A0033", ink: "#E0C3FC", accent: "#FF6EC7", muted: "#7873F5", surface: "#240046", card: "#2D0059", rule: "#3D0066", teal: "#00D4FF", amber: "#F0ABFC" },
  },
  {
    paletteIdentifier: "terminal",
    displayName: "Terminal",
    tokens: { paper: "#0A0F0A", ink: "#33FF33", accent: "#33FF33", muted: "#1A8C1A", surface: "#0D140D", card: "#111A11", rule: "#1A4D1A", teal: "#33FF33", amber: "#66FF66" },
    fontOverride: { serif: "'Fira Code', 'Courier New', monospace", body: "'Fira Code', 'Courier New', monospace" },
  },
];

export const VISUAL_STYLES: VisualStyle[] = [
  { styleIdentifier: "flat", displayName: "Flat", description: "Clean, no card effects" },
  { styleIdentifier: "glass", displayName: "Glass", description: "Frosted glass cards" },
  { styleIdentifier: "neu", displayName: "Embossed", description: "Neumorphic raised cards" },
];

const PALETTE_STORAGE_KEY = "newsroom_color_palette";
const STYLE_STORAGE_KEY = "newsroom_visual_style";

export function loadSavedPaletteIdentifier(): string {
  try {
    return localStorage.getItem(PALETTE_STORAGE_KEY) || "midnight";
  } catch {
    return "midnight";
  }
}

export function savePaletteIdentifier(paletteIdentifier: string): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, paletteIdentifier);
  } catch { /* */ }
}

export function loadSavedVisualStyleIdentifier(): VisualStyleIdentifier {
  try {
    const saved = localStorage.getItem(STYLE_STORAGE_KEY);
    if (saved === "flat" || saved === "glass" || saved === "neu") return saved;
  } catch { /* */ }
  return "flat";
}

export function saveVisualStyleIdentifier(styleIdentifier: VisualStyleIdentifier): void {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, styleIdentifier);
  } catch { /* */ }
}

function hexToRgbTriplet(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function applyPaletteToDocument(palette: ColorPalette): void {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(palette.tokens)) {
    root.style.setProperty(`--color-${token}`, hexToRgbTriplet(value));
  }
  if (palette.fontOverride?.serif) {
    root.style.setProperty("--font-serif-override", palette.fontOverride.serif);
  } else {
    root.style.removeProperty("--font-serif-override");
  }
  if (palette.fontOverride?.body) {
    root.style.setProperty("--font-body-override", palette.fontOverride.body);
  } else {
    root.style.removeProperty("--font-body-override");
  }
}

export function applyVisualStyleToDocument(styleIdentifier: VisualStyleIdentifier): void {
  const root = document.documentElement;
  root.classList.remove("vs-flat", "vs-glass", "vs-neu");
  root.classList.add(`vs-${styleIdentifier}`);
}

export function findPaletteByIdentifier(paletteIdentifier: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.paletteIdentifier === paletteIdentifier) || COLOR_PALETTES[0];
}
