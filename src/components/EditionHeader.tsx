"use client";

import { SectionFilter } from "./SectionFilter";
import type { LayoutMode } from "@/lib/layoutRuleEngine";
import type { ActiveScreen } from "@/lib/viewmodels/useEditionViewModel";

interface EditionHeaderProps {
  sections: string[];
  activeSectionFilter: string;
  onSelectSection: (section: string) => void;
  layoutMode: LayoutMode;
  onSetLayoutMode: (mode: LayoutMode) => void;
  activeScreen: ActiveScreen;
  onSetScreen: (screen: ActiveScreen) => void;
}

const SCREENS: { key: ActiveScreen; label: string }[] = [
  { key: "edition", label: "Edition" },
  { key: "interests", label: "Interests" },
  { key: "settings", label: "Settings" },
];

const LAYOUT_MODES: { key: LayoutMode; label: string }[] = [
  { key: "dynamic", label: "Dynamic" },
  { key: "simple", label: "Simple" },
];

export function EditionHeader({
  sections,
  activeSectionFilter,
  onSelectSection,
  layoutMode,
  onSetLayoutMode,
  activeScreen,
  onSetScreen,
}: EditionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center border-b-[3px] border-double border-rule bg-[#0A0908] px-5 py-2.5 md:px-7">
      <h1 className="font-serif text-xl font-black tracking-wide text-white md:text-2xl">
        Newsroom<span className="text-accent">.</span>
      </h1>
      <span className="ml-3 hidden font-body text-[11px] italic text-muted lg:inline">
        An Agent-Readable Newspaper
      </span>
      <span className="flex-1" />

      {/* Section filter dropdown — only on edition screen */}
      {activeScreen === "edition" && (
        <SectionFilter
          sections={sections}
          activeSectionFilter={activeSectionFilter}
          onSelectSection={onSelectSection}
        />
      )}

      {/* Layout mode toggle — only on edition screen, desktop only */}
      {activeScreen === "edition" && (
        <div className="ml-2 hidden rounded-lg border border-white/15 bg-white/8 p-0.5 md:flex">
          {LAYOUT_MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSetLayoutMode(key)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                layoutMode === key
                  ? "bg-white/15 text-white shadow"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Screen segment control — desktop only */}
      <div className="ml-3 hidden rounded-lg border border-white/15 bg-white/8 p-0.5 md:flex">
        {SCREENS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSetScreen(key)}
            className={`whitespace-nowrap rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeScreen === key
                ? "bg-white/15 text-white shadow"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
