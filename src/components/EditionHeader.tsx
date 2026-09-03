"use client";

import { SectionFilter } from "./SectionFilter";
import type { ActiveScreen } from "@/lib/viewmodels/useEditionViewModel";

interface EditionHeaderProps {
  sections: string[];
  activeSectionFilter: string;
  onSelectSection: (section: string) => void;
  activeScreen: ActiveScreen;
  onSetScreen: (screen: ActiveScreen) => void;
  onGoHome?: () => void;
}

const SCREENS: { key: ActiveScreen; label: string }[] = [
  { key: "edition", label: "Edition" },
  { key: "interests", label: "Interests" },
  { key: "settings", label: "Settings" },
];

export function EditionHeader({
  sections,
  activeSectionFilter,
  onSelectSection,
  activeScreen,
  onSetScreen,
  onGoHome,
}: EditionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center border-b-[3px] border-double border-rule bg-[#0A0908] px-5 py-2.5 md:px-7">
      <button
        type="button"
        onClick={() => { onGoHome?.(); onSetScreen("edition"); }}
        className="font-serif text-xl font-black tracking-wide text-white transition-colors hover:text-accent md:text-2xl"
      >
        OpenMemoz<span className="text-accent">.</span>
      </button>
      <span className="ml-3 hidden font-body text-[11px] italic text-muted lg:inline">
        AI-Powered Content Platform
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

      <a
        href="/demo"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-3 flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[12px] font-semibold text-green-400 transition-colors hover:bg-green-500/20"
        title="Open WebMCP tool demo harness"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="1" width="14" height="14" rx="2" />
          <path d="M8 1v14M1 8h14" />
        </svg>
        Demo
      </a>
    </header>
  );
}
