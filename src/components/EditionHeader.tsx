"use client";

import { SectionFilter } from "./SectionFilter";

interface EditionHeaderProps {
  sections: string[];
  activeSectionFilter: string;
  onSelectSection: (section: string) => void;
}

export function EditionHeader({
  sections,
  activeSectionFilter,
  onSelectSection,
}: EditionHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4">
        <div className="flex items-baseline gap-3">
          <p className="font-serif text-2xl font-black tracking-tight">
            DailyPress<span className="text-accent">.</span>
          </p>
          <p className="hidden font-sans text-[11px] uppercase tracking-[0.2em] text-muted sm:block">
            An agent-readable newspaper
          </p>
        </div>
        <SectionFilter
          sections={sections}
          activeSectionFilter={activeSectionFilter}
          onSelectSection={onSelectSection}
        />
      </div>
    </header>
  );
}
