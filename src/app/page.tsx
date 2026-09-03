"use client";

import { useCallback, useRef, useState } from "react";
import {
  useEditionViewModel,
  SHOW_ALL_SECTIONS,
} from "@/lib/viewmodels/useEditionViewModel";
import { formatEditionDate } from "@/lib/formatDate";
import { EditionHeader } from "@/components/EditionHeader";
import {
  EditionFlipStack,
  type EditionFlipStackHandle,
} from "@/components/EditionFlipStack";
import { StoryDetail } from "@/components/StoryDetail";
import { InterestsScreen } from "@/components/InterestsScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { MobileTabBar } from "@/components/MobileTabBar";

export default function EditionPage() {
  const [sectionSlide, setSectionSlide] = useState<
    "none" | "left" | "right"
  >("none");
  const touchStartRef = useRef({ x: 0, y: 0 });
  const flipStackRef = useRef<EditionFlipStackHandle>(null);

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
    activePaletteIdentifier,
    setActivePaletteIdentifier,
    activeVisualStyle,
    setActiveVisualStyle,
    toggleFavouriteForStory,
  } = useEditionViewModel();

  const handleDateNavigation = useCallback(
    (direction: "prev" | "next") => {
      const targetIndex =
        direction === "prev" ? currentEditionIdx - 1 : currentEditionIdx + 1;
      flipStackRef.current?.flipToEdition(targetIndex);
    },
    [currentEditionIdx]
  );

  const swipeToSection = useCallback(
    (direction: "left" | "right") => {
      if (!edition) return;
      const sections = [SHOW_ALL_SECTIONS, ...edition.sections];
      const currentSectionIndex = sections.indexOf(activeSectionFilter);
      const nextSectionIndex =
        direction === "left"
          ? Math.min(currentSectionIndex + 1, sections.length - 1)
          : Math.max(currentSectionIndex - 1, 0);
      if (nextSectionIndex === currentSectionIndex) return;
      setSectionSlide(direction === "left" ? "left" : "right");
      setTimeout(() => {
        setActiveSectionFilter(sections[nextSectionIndex]);
        setTimeout(() => setSectionSlide("none"), 50);
      }, 200);
    },
    [edition, activeSectionFilter, setActiveSectionFilter]
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const deltaX = event.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = event.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        swipeToSection(deltaX < 0 ? "left" : "right");
      }
    },
    [swipeToSection]
  );

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
        onGoHome={clearSelection}
      />

      {activeScreen === "edition" && (
        <div className="flex items-center justify-center gap-3 border-b border-rule bg-surface px-5 py-2">
          <button
            type="button"
            onClick={() => handleDateNavigation("prev")}
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
            onClick={() => handleDateNavigation("next")}
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

      {activeScreen === "interests" && <InterestsScreen />}
      {activeScreen === "settings" && (
        <SettingsScreen
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          activePaletteIdentifier={activePaletteIdentifier}
          setActivePaletteIdentifier={setActivePaletteIdentifier}
          activeVisualStyle={activeVisualStyle}
          setActiveVisualStyle={setActiveVisualStyle}
        />
      )}
      {activeScreen === "edition" && (
        <>
          {selectedStory ? (
            <StoryDetail
              story={selectedStory}
              allStories={edition.stories}
              onClose={clearSelection}
              onSelectStory={selectStory}
              onToggleFavourite={toggleFavouriteForStory}
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
              <EditionFlipStack
                ref={flipStackRef}
                allEditions={allEditions}
                currentEditionIndex={currentEditionIdx}
                activeSectionFilter={activeSectionFilter}
                layoutMode={layoutMode}
                onSelectStory={selectStory}
                onEditionChangeComplete={goToEditionIndex}
                onToggleFavourite={toggleFavouriteForStory}
              />

              <footer className="mx-auto mt-6 max-w-[1120px] border-t border-rule">
                <p className="px-5 py-5 text-center font-sans text-[11px] text-muted">
                  <span className="font-serif text-sm font-bold text-ink">
                    OpenMemoz<span className="text-accent">.</span>
                  </span>{" "}
                  &mdash; User-Agent Generated Content &middot; Apache-2.0 &middot;
                  &copy; 2026 Nestuary Wellness Inc.
                </p>
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
