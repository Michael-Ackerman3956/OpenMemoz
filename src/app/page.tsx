"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useEditionViewModel,
  SHOW_ALL_SECTIONS,
} from "@/lib/viewmodels/useEditionViewModel";
import { computeLayout } from "@/lib/layoutRuleEngine";
import { formatEditionDate } from "@/lib/formatDate";
import { EditionHeader } from "@/components/EditionHeader";
import { HeroStory } from "@/components/HeroStory";
import { StoryCard } from "@/components/StoryCard";
import { BriefCard } from "@/components/BriefCard";
import { StoryDetail } from "@/components/StoryDetail";
import { InterestsScreen } from "@/components/InterestsScreen";
import { SettingsScreen } from "@/components/SettingsScreen";
import { MobileTabBar } from "@/components/MobileTabBar";

export default function EditionPage() {
  const [dateFlipDirection, setDateFlipDirection] = useState<
    "none" | "next" | "prev"
  >("none");
  const [sectionSlide, setSectionSlide] = useState<
    "none" | "left" | "right"
  >("none");
  const touchStartRef = useRef({ x: 0, y: 0 });

  const {
    edition,
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
    navigateEdition,
    editionIndex,
    currentEditionIdx,
  } = useEditionViewModel();

  const allSections = edition
    ? [SHOW_ALL_SECTIONS, ...edition.sections]
    : [SHOW_ALL_SECTIONS];
  const currentSectionIdx = allSections.indexOf(activeSectionFilter);

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
    setDateFlipDirection(direction);
    setTimeout(() => {
      navigateEdition(direction);
      setTimeout(() => setDateFlipDirection("none"), 50);
    }, 300);
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

  const layout = computeLayout(filteredStories, layoutMode);

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
            disabled={currentEditionIdx <= 0}
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
            disabled={currentEditionIdx >= editionIndex.length - 1}
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
              className={`transition-all duration-300 ${
                dateFlipDirection === "next" || sectionSlide === "left"
                  ? "-translate-x-full opacity-0"
                  : dateFlipDirection === "prev" || sectionSlide === "right"
                    ? "translate-x-full opacity-0"
                    : "translate-x-0 opacity-100"
              }`}
            >
              <main className="mx-auto max-w-[1120px] px-5 pb-24 md:pb-5">
                {layout.heroStory ? (
                  <>
                    {/* Masthead */}
                    <div className="border-b-2 border-double border-rule py-2 text-center">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-muted">
                        <span>AI Curated &middot; Personal Edition</span>
                        <span>
                          Vol. I &middot; No. {edition.editionNumber}
                        </span>
                      </div>
                    </div>

                    {/* Hero */}
                    <HeroStory
                      story={layout.heroStory}
                      onSelectStory={selectStory}
                    />

                    {/* Section bar */}
                    <div className="flex items-center justify-between bg-[#0A0908] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
                      <span>
                        Today&rsquo;s Edition &middot;{" "}
                        {filteredStories.length} Stories &middot;{" "}
                        {edition.sections.length} Sections
                      </span>
                      <span className="font-normal text-muted">
                        {formatEditionDate(edition.editionDate)}
                      </span>
                    </div>

                    {/* Dynamic: bento grid / Simple: feed */}
                    {layout.mode === "dynamic" && (
                      <>
                        {(layout.leftColumnStories.length > 0 ||
                          layout.middleColumnStories.length > 0 ||
                          layout.rightColumnStories.length > 0) && (
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_1px_3fr_1px_2fr]">
                            <div className="px-3 py-3">
                              {layout.leftColumnStories.map((story) => (
                                <StoryCard
                                  key={story.storyIdentifier}
                                  story={story}
                                  onSelectStory={selectStory}
                                />
                              ))}
                            </div>
                            <div className="hidden bg-rule md:block" />
                            <div className="px-3 py-3">
                              {layout.middleColumnStories.map((story) => (
                                <StoryCard
                                  key={story.storyIdentifier}
                                  story={story}
                                  onSelectStory={selectStory}
                                  isMiddleColumn
                                />
                              ))}
                            </div>
                            <div className="hidden bg-rule md:block" />
                            <div className="px-3 py-3">
                              {layout.rightColumnStories.map((story) => (
                                <StoryCard
                                  key={story.storyIdentifier}
                                  story={story}
                                  onSelectStory={selectStory}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {layout.briefStripStories.length > 0 && (
                          <div className="mt-px grid grid-cols-2 gap-px bg-rule md:grid-cols-4">
                            {layout.briefStripStories.map((story) => (
                              <BriefCard
                                key={story.storyIdentifier}
                                story={story}
                                onSelectStory={selectStory}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {layout.mode === "simple" &&
                      layout.feedStories.length > 0 && (
                        <div className="divide-y divide-rule">
                          {layout.feedStories.map((story) => (
                            <article
                              key={story.storyIdentifier}
                              className="cursor-pointer py-4 transition-colors hover:bg-card/40"
                              onClick={() => selectStory(story)}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                                    {story.section}
                                  </p>
                                  <h3 className="mt-1 font-serif text-lg font-bold leading-snug">
                                    {story.headline}
                                  </h3>
                                  <p className="mt-1 font-body text-sm leading-relaxed text-muted line-clamp-2">
                                    {story.excerpt}
                                  </p>
                                  <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted">
                                    <span
                                      className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold ${
                                        story.provenanceTier === 1
                                          ? "border-teal/40 bg-teal/10 text-teal"
                                          : "border-amber/40 bg-amber/10 text-amber"
                                      }`}
                                    >
                                      {story.provenanceTier === 1
                                        ? story.sourceName + " ↗"
                                        : "✦ AI · " + story.sourceName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                  </>
                ) : (
                  <p className="py-20 text-center font-serif text-lg italic text-muted">
                    No stories in this section today.
                  </p>
                )}
              </main>

              <footer className="mt-px border-t-[3px] border-double border-rule pb-24 md:pb-0">
                <div className="mx-auto max-w-[1120px] space-y-2 px-5 py-10 font-sans text-xs leading-relaxed text-muted">
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
