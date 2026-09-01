"use client";

import { SHOW_ALL_SECTIONS } from "@/lib/viewmodels/useEditionViewModel";

interface SectionFilterProps {
  sections: string[];
  activeSectionFilter: string;
  onSelectSection: (section: string) => void;
}

export function SectionFilter({
  sections,
  activeSectionFilter,
  onSelectSection,
}: SectionFilterProps) {
  const filterOptions = [SHOW_ALL_SECTIONS, ...sections];
  return (
    <nav
      aria-label="Filter stories by section"
      className="flex max-w-full gap-1.5 overflow-x-auto"
    >
      {filterOptions.map((sectionName) => {
        const isActiveFilter = sectionName === activeSectionFilter;
        return (
          <button
            key={sectionName}
            type="button"
            aria-pressed={isActiveFilter}
            onClick={() => onSelectSection(sectionName)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 font-sans text-xs font-medium uppercase tracking-wider transition-colors ${
              isActiveFilter
                ? "border-accent bg-accent text-paper"
                : "border-rule text-muted hover:border-muted hover:text-ink"
            }`}
          >
            {sectionName === SHOW_ALL_SECTIONS ? "All" : sectionName}
          </button>
        );
      })}
    </nav>
  );
}
