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

export type VisualStyleIdentifier = "flat" | "glass" | "neu" | "paper";

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
    paletteIdentifier: "slate",
    displayName: "Slate Gray",
    tokens: { paper: "#1A1C20", ink: "#D4D4D8", accent: "#A1A1AA", muted: "#8E8E98", surface: "#222429", card: "#27292F", rule: "#3F3F46", teal: "#A1A1AA", amber: "#D4D4D8" },
  },
  {
    paletteIdentifier: "broadsheet",
    displayName: "Classic Broadsheet",
    tokens: { paper: "#E0E0E0", ink: "#1A1A1A", accent: "#333333", muted: "#666666", surface: "#D4D4D4", card: "#EBEBEB", rule: "#AAAAAA", teal: "#555555", amber: "#444444" },
  },
  {
    paletteIdentifier: "sepia",
    displayName: "Sepia Gazette",
    tokens: { paper: "#F2E8D5", ink: "#4A3728", accent: "#8B4513", muted: "#7A6245", surface: "#EAD9BE", card: "#FAF3E8", rule: "#C9B896", teal: "#6B8E6B", amber: "#B8860B" },
  },
  {
    paletteIdentifier: "ivory",
    displayName: "Ivory Folio",
    tokens: { paper: "#F5F0E8", ink: "#2C2416", accent: "#B45309", muted: "#6B5D4F", surface: "#EDE7DC", card: "#FDFAF5", rule: "#D4CBB8", teal: "#0F766E", amber: "#A16207" },
  },
  {
    paletteIdentifier: "stone",
    displayName: "Cool Stone",
    tokens: { paper: "#F3F4F6", ink: "#111827", accent: "#4338CA", muted: "#4B5563", surface: "#E5E7EB", card: "#FFFFFF", rule: "#D1D5DB", teal: "#0D9488", amber: "#B45309" },
  },
  {
    paletteIdentifier: "ocean",
    displayName: "Deep Ocean",
    tokens: { paper: "#0F1D32", ink: "#CBD5E1", accent: "#0EA5E9", muted: "#7893AD", surface: "#132640", card: "#162B4A", rule: "#1E3A5F", teal: "#38BDF8", amber: "#F59E0B" },
  },
  {
    paletteIdentifier: "charcoal",
    displayName: "Charcoal Desk",
    tokens: { paper: "#1C1917", ink: "#E7E5E4", accent: "#F97316", muted: "#A8A29E", surface: "#292524", card: "#2E2A27", rule: "#44403C", teal: "#2DD4BF", amber: "#FBBF24" },
  },
  {
    paletteIdentifier: "rosewood",
    displayName: "Rosewood",
    tokens: { paper: "#1A0F14", ink: "#E8DDE2", accent: "#E11D48", muted: "#A68B96", surface: "#241520", card: "#2B1A24", rule: "#4A2F3E", teal: "#5EEAD4", amber: "#FCA5A5" },
  },
  {
    paletteIdentifier: "mint",
    displayName: "Mint Press",
    tokens: { paper: "#F0F5F1", ink: "#1A2E1F", accent: "#166534", muted: "#4D6B55", surface: "#E2EDE5", card: "#F8FBF9", rule: "#C6D9CB", teal: "#0F766E", amber: "#A16207" },
  },
  {
    paletteIdentifier: "indigo",
    displayName: "Indigo Night",
    tokens: { paper: "#0C0F1A", ink: "#D4D7E5", accent: "#818CF8", muted: "#8B8FA6", surface: "#131729", card: "#191D33", rule: "#2E3350", teal: "#67E8F9", amber: "#FCD34D" },
  },
  {
    paletteIdentifier: "typewriter",
    displayName: "Typewriter",
    tokens: { paper: "#FFFFFF", ink: "#1A1A1A", accent: "#DC2626", muted: "#525252", surface: "#F5F5F5", card: "#FAFAFA", rule: "#D4D4D4", teal: "#1A1A1A", amber: "#991B1B" },
    fontOverride: { serif: "'Courier New', 'Courier', monospace", body: "'Courier New', 'Courier', monospace" },
  },
  {
    paletteIdentifier: "forest",
    displayName: "Forest Floor",
    tokens: { paper: "#0F1A12", ink: "#D4E4D0", accent: "#4ADE80", muted: "#8AAE85", surface: "#152117", card: "#1B291D", rule: "#2D4A30", teal: "#86EFAC", amber: "#BEF264" },
  },
];

export const VISUAL_STYLES: VisualStyle[] = [
  { styleIdentifier: "flat", displayName: "Flat", description: "Clean, no card effects" },
  { styleIdentifier: "glass", displayName: "Glass", description: "Frosted glass cards" },
  { styleIdentifier: "neu", displayName: "Embossed", description: "Neumorphic raised cards" },
  { styleIdentifier: "paper", displayName: "Paper", description: "Textured paper with grain" },
];

const PALETTE_STORAGE_KEY = "openmemoz_color_palette";
const STYLE_STORAGE_KEY = "openmemoz_visual_style";

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
    if (saved === "flat" || saved === "glass" || saved === "neu" || saved === "paper") return saved;
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
  root.classList.remove("vs-flat", "vs-glass", "vs-neu", "vs-paper");
  root.classList.add(`vs-${styleIdentifier}`);
}

export function findPaletteByIdentifier(paletteIdentifier: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.paletteIdentifier === paletteIdentifier) || COLOR_PALETTES[0];
}
