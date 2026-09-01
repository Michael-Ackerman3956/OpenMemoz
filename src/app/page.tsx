"use client";

import { useCallback, useRef, useState } from "react";
import {
  useEditionViewModel,
  SHOW_ALL_SECTIONS,
} from "@/lib/viewmodels/useEditionViewModel";
import { formatEditionDate } from "@/lib/formatDate";
import { EditionHeader } from "@/components/EditionHeader";
import { StoryDetail } from "@/components/StoryDetail";
import { InterestsScreen } from "@/components/InterestsScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { MobileTabBar } from "@/components/MobileTabBar";
import {
  EditionFlipBook,
  type EditionFlipBookHandle,
} from "@/components/EditionFlipBook";

export default function EditionPage() {
  const [sectionSlide, setSectionSlide] = useState<
    "none" | "left" | "right"
  >("none");
  const touchStartRef = useRef({ x: 0, y: 0 });
  const flipBookRef = useRef<EditionFlipBookHandle>(null);

  const {
    edition,
    allEditions,
    filteredStories,
    activeSectionFilter,
    setActiveSectionFilter,
    layoutMode,
    setLayoutMode,
    activeScreen,
    setActiveScreen,
    selectedStory,
    selectStory,
    clearSelection,
    goToEditionIndex,
    editionIndex,
    currentEditionIdx,
  } = useEditionViewModel();

  const swipeToSection = useCallback(
    (direction: "left" | "right") => {
      if (!edition) return;
      const sections = [SHOW_ALL_SECTIONS, ...edition.sections];
      const idx = sections.indexOf(activeSectionFilter);
      const nextIdx =
        direction === "left"
          ? Math.min(idx + 1, sections.length - 1)
          : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      setSectionSlide(direction === "left" ? "left" : "right");
      setTimeout(() => {
        setActiveSectionFilter(sections[nextIdx]);
        setTimeout(() => setSectionSlide("none"), 50);
      }, 200);
    },
    [edition, activeSectionFilter, setActiveSectionFilter]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipeToSection(dx < 0 ? "left" : "right");
      }
    },
    [swipeToSection]
  );

  const handleDateNav = (direction: "prev" | "next") => {
    if (direction === "next") flipBookRef.current?.flipToNextEdition();
    else flipBookRef.current?.flipToPreviousEdition();
  };

  if (!edition) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif text-xl italic text-muted">
          Composing today&rsquo;s edition&hellip;
        </p>
      </main>
    );
  }

  return (
    <>
      <EditionHeader
        sections={edition.sections}
        activeSectionFilter={activeSectionFilter}
        onSelectSection={setActiveSectionFilter}
        activeScreen={activeScreen}
        onSetScreen={setActiveScreen}
      />

      {/* Date nav bar */}
      {activeScreen === "edition" && (
        <div className="flex items-center justify-center gap-3 border-b border-rule bg-surface px-5 py-2">
          <button
            type="button"
            onClick={() => handleDateNav("prev")}
            disabled={currentEditionIdx <= 0 || Boolean(selectedStory)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-rule text-sm text-ink transition-colors hover:bg-card disabled:opacity-30"
          >
            &larr;
          </button>
          <span className="text-[13px] font-bold text-ink">
            {formatEditionDate(edition.editionDate)} &middot; Edition No.{" "}
            {edition.editionNumber}
          </span>
          <button
            type="button"
            onClick={() => handleDateNav("next")}
            disabled={
              currentEditionIdx >= editionIndex.length - 1 ||
              Boolean(selectedStory)
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-rule text-sm text-ink transition-colors hover:bg-card disabled:opacity-30"
          >
            &rarr;
          </button>
          <span className="text-[10px] text-muted">
            {filteredStories.length} stories
          </span>
        </div>
      )}

      {/* Screen routing */}
      {activeScreen === "interests" && <InterestsScreen />}
      {activeScreen === "settings" && (
        <SettingsScreen layoutMode={layoutMode} setLayoutMode={setLayoutMode} />
      )}
      {activeScreen === "edition" && (
        <>
          {selectedStory ? (
            <StoryDetail
              story={selectedStory}
              allStories={edition.stories}
              onClose={clearSelection}
              onSelectStory={selectStory}
            />
          ) : (
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`pb-24 pt-3 transition-all duration-300 md:pb-6 ${
                sectionSlide === "left"
                  ? "-translate-x-full opacity-0"
                  : sectionSlide === "right"
                    ? "translate-x-full opacity-0"
                    : "translate-x-0 opacity-100"
              }`}
            >
              <EditionFlipBook
                ref={flipBookRef}
                allEditions={allEditions}
                startEditionIndex={currentEditionIdx}
                activeSectionFilter={activeSectionFilter}
                layoutMode={layoutMode}
                onSelectStory={selectStory}
                onEditionChange={goToEditionIndex}
              />

              <footer className="mx-auto mt-6 max-w-[1120px] border-t-[3px] border-double border-rule">
                <div className="space-y-2 px-5 py-8 font-sans text-xs leading-relaxed text-muted">
                  <p>
                    <span className="font-serif text-base font-bold text-ink">
                      Newsroom<span className="text-accent">.</span>
                    </span>{" "}
                    &mdash; an agent-readable newspaper. Exposes six WebMCP
                    tools via <code>document.modelContext</code>.
                  </p>
                  <p>
                    Sources: Hacker News &middot; Federal Reserve &middot; NOAA
                    &middot; EurekAlert &middot; ScienceDaily &middot; NVD
                    &middot; TechCrunch &middot; NASA &middot; SEC EDGAR
                  </p>
                  <p>
                    Built for the WebMCP Challenge &middot; Apache-2.0 &middot;
                    &copy; 2026 Nestuary Wellness Inc.
                  </p>
                </div>
              </footer>
            </div>
          )}
        </>
      )}

      <MobileTabBar
        activeScreen={activeScreen}
        onSetScreen={setActiveScreen}
      />
    </>
  );
}
