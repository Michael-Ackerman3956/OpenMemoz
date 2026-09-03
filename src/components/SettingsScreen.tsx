"use client";

import type { LayoutMode } from "@/lib/layoutRuleEngine";
import type { VisualStyleIdentifier } from "@/lib/themeSystem";
import { COLOR_PALETTES, VISUAL_STYLES } from "@/lib/themeSystem";

const LAYOUT_MODES: { key: LayoutMode; label: string }[] = [
  { key: "dynamic", label: "Dynamic" },
  { key: "simple", label: "Simple" },
];

function ToggleSwitch({ defaultOn = false }: { defaultOn?: boolean }) {
  return (
    <div
      className={`relative h-[22px] w-[42px] cursor-pointer rounded-full transition-colors ${
        defaultOn ? "bg-accent" : "bg-rule"
      }`}
    >
      <div
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          defaultOn ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </div>
  );
}

function SettingRow({
  label,
  right,
}: {
  label: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-rule px-4 py-3.5 text-sm font-medium last:border-b-0">
      <label>{label}</label>
      {right}
    </div>
  );
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
        {title}
      </h3>
      <div className="rounded-xl border border-rule bg-card">{children}</div>
    </div>
  );
}

function ThemePreviewCard({ activeVisualStyle }: { activeVisualStyle: VisualStyleIdentifier }) {
  const cardClass =
    activeVisualStyle === "glass"
      ? "rounded-lg border border-ink/15 bg-card/50 backdrop-blur-sm"
      : activeVisualStyle === "neu"
        ? "rounded-lg bg-paper"
        : "rounded-lg border border-rule bg-card";

  const cardShadow =
    activeVisualStyle === "neu"
      ? "4px 4px 8px rgba(0,0,0,0.3), -4px -4px 8px rgba(255,255,255,0.04)"
      : activeVisualStyle === "glass"
        ? "0 4px 16px rgba(0,0,0,0.1)"
        : "none";

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-paper p-4">
      {/* Mini masthead */}
      <div className="mb-3 text-center">
        <h4 className="font-serif text-lg font-bold text-ink">Newsroom.</h4>
        <p className="text-[9px] text-muted">Wednesday, September 3, 2026</p>
      </div>
      <div className="mb-3 h-px bg-rule" />

      {/* Mini hero */}
      <div
        className={`mb-3 p-3 ${cardClass}`}
        style={{ boxShadow: cardShadow }}
      >
        <p className="text-[8px] font-bold uppercase tracking-widest text-accent">Science</p>
        <h5 className="mt-0.5 font-serif text-[13px] font-bold leading-tight text-ink">
          NASA&apos;s Roman Space Telescope Enters Final Testing
        </h5>
        <p className="mt-1 text-[10px] leading-snug text-muted">
          The telescope has entered its final integration phase with unprecedented capabilities...
        </p>
      </div>

      {/* Mini story grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { section: "Tech", headline: "WebMCP Advances Toward Standard" },
          { section: "Finance", headline: "Labor Market Holds Balance" },
          { section: "World", headline: "Trade Routes Shift Southeast" },
        ].map((story) => (
          <div
            key={story.section}
            className={`p-2 ${cardClass}`}
            style={{ boxShadow: cardShadow }}
          >
            <p className="text-[7px] font-bold uppercase tracking-wider text-accent">{story.section}</p>
            <p className="mt-0.5 font-serif text-[9px] font-semibold leading-tight text-ink">{story.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualStylePreview({ styleIdentifier }: { styleIdentifier: VisualStyleIdentifier }) {
  if (styleIdentifier === "flat") {
    return (
      <>
        <div className="h-3 w-full rounded-sm border border-rule bg-card" />
        <div className="h-2.5 w-full rounded-sm border border-rule bg-card" />
        <div className="h-2.5 w-full rounded-sm border border-rule bg-card" />
      </>
    );
  }
  if (styleIdentifier === "glass") {
    return (
      <div className="relative">
        <div className="absolute inset-0 rounded-md bg-gradient-to-br from-accent/20 to-teal/20" />
        <div className="relative flex flex-col gap-1">
          <div className="h-3 w-full rounded-md border border-ink/15 bg-card/50 backdrop-blur-sm" />
          <div className="h-2.5 w-full rounded-md border border-ink/15 bg-card/50 backdrop-blur-sm" />
          <div className="h-2.5 w-full rounded-md border border-ink/15 bg-card/50 backdrop-blur-sm" />
        </div>
      </div>
    );
  }
  // neu
  return (
    <>
      <div className="h-3 w-full rounded-md bg-paper" style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.04)" }} />
      <div className="h-2.5 w-full rounded-md bg-paper" style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.04)" }} />
      <div className="h-2.5 w-full rounded-md bg-paper" style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.04)" }} />
    </>
  );
}

interface SettingsScreenProps {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  activePaletteIdentifier: string;
  setActivePaletteIdentifier: (paletteIdentifier: string) => void;
  activeVisualStyle: VisualStyleIdentifier;
  setActiveVisualStyle: (style: VisualStyleIdentifier) => void;
}

export function SettingsScreen({
  layoutMode,
  setLayoutMode,
  activePaletteIdentifier,
  setActivePaletteIdentifier,
  activeVisualStyle,
  setActiveVisualStyle,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto max-w-[580px] px-6 py-8">
      <h2 className="mb-6 text-center font-serif text-3xl font-bold">
        Settings
      </h2>

      {/* Live theme preview */}
      <div className="mb-5">
        <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
          Preview
        </h3>
        <ThemePreviewCard activeVisualStyle={activeVisualStyle} />
      </div>

      <SettingGroup title="Color Palette">
        <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
          {COLOR_PALETTES.map((palette) => (
            <button
              key={palette.paletteIdentifier}
              type="button"
              onClick={() => setActivePaletteIdentifier(palette.paletteIdentifier)}
              className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
                activePaletteIdentifier === palette.paletteIdentifier
                  ? "bg-accent/20 ring-2 ring-accent"
                  : "hover:bg-surface"
              }`}
            >
              <div className="flex gap-0.5">
                <div
                  className="h-5 w-5 rounded-l-md"
                  style={{ backgroundColor: palette.tokens.paper }}
                />
                <div
                  className="h-5 w-5"
                  style={{ backgroundColor: palette.tokens.accent }}
                />
                <div
                  className="h-5 w-5 rounded-r-md"
                  style={{ backgroundColor: palette.tokens.ink }}
                />
              </div>
              <span className="text-[10px] font-semibold leading-tight text-center">
                {palette.displayName}
              </span>
            </button>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup title="Visual Style">
        <div className="flex gap-2 p-3">
          {VISUAL_STYLES.map((style) => (
            <button
              key={style.styleIdentifier}
              type="button"
              onClick={() => setActiveVisualStyle(style.styleIdentifier)}
              className={`flex-1 rounded-lg px-3 py-3 text-center transition-colors ${
                activeVisualStyle === style.styleIdentifier
                  ? "bg-accent/20 ring-2 ring-accent"
                  : "bg-surface hover:bg-rule"
              }`}
            >
              <div className="mx-auto mb-2 flex flex-col gap-1 w-[52px]">
                <VisualStylePreview styleIdentifier={style.styleIdentifier} />
              </div>
              <span className="block text-[13px] font-semibold">{style.displayName}</span>
              <span className="block text-[10px] text-muted">{style.description}</span>
            </button>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup title="Appearance">
        <SettingRow
          label="Layout"
          right={
            <div className="flex rounded-lg border border-rule bg-surface p-0.5">
              {LAYOUT_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayoutMode(key)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                    layoutMode === key
                      ? "bg-white/15 text-ink shadow"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          label="Reduce Motion"
          right={<ToggleSwitch />}
        />
        <SettingRow
          label="Page-Flip Sound"
          right={<ToggleSwitch defaultOn />}
        />
      </SettingGroup>

      <SettingGroup title="Delivery">
        <SettingRow
          label="Push Notifications"
          right={<ToggleSwitch defaultOn />}
        />
        <SettingRow
          label="Morning Email Edition"
          right={<ToggleSwitch />}
        />
        <SettingRow
          label="Delivery Time"
          right={<span className="text-[13px] text-muted">6:00 AM</span>}
        />
      </SettingGroup>

      <SettingGroup title="About">
        <SettingRow
          label="Version"
          right={<span className="text-[13px] text-muted">1.0.0 (PWA)</span>}
        />
        <SettingRow
          label="Licence"
          right={<span className="text-[13px] text-muted">Apache-2.0</span>}
        />
      </SettingGroup>
    </div>
  );
}
