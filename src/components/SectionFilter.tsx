"use client";

import { useRef, useState, useEffect } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const displayLabel =
    activeSectionFilter === SHOW_ALL_SECTIONS ? "ALL" : activeSectionFilter;

  const filterOptions = [SHOW_ALL_SECTIONS, ...sections];

  return (
    <div ref={wrapperRef} className="relative z-60">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-white/15"
      >
        {displayLabel}
        <span className="text-[10px] text-muted">&#9662;</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] min-w-[160px] rounded-xl border border-white/8 bg-surface/95 p-2 shadow-xl backdrop-blur-xl">
          {filterOptions.map((sectionName) => {
            const isActive = sectionName === activeSectionFilter;
            return (
              <button
                key={sectionName}
                type="button"
                onClick={() => {
                  onSelectSection(sectionName);
                  setIsOpen(false);
                }}
                className={`block w-full rounded-lg px-3.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-white/5 ${
                  isActive ? "font-bold text-accent" : "text-muted"
                }`}
              >
                {sectionName === SHOW_ALL_SECTIONS ? "ALL" : sectionName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
