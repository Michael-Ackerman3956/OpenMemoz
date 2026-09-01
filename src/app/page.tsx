"use client";

import { useEditionViewModel } from "@/lib/viewmodels/useEditionViewModel";
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
import { NewspaperFlip } from "@/components/NewspaperFlip";
import { useState, useCallback } from "react";

export default function EditionPage() {
  const [flipPageInfo, setFlipPageInfo] = useState({
    page: 0,
    total: 0,
    section: "",
  });

  const handleFlipPageChange = useCallback(
    (page: number, total: number, section: string) => {
      setFlipPageInfo({ page, total, section });
    },
    []
  );

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
        layoutMode={layoutMode}
        onSetLayoutMode={setLayoutMode}
        activeScreen={activeScreen}
        onSetScreen={setActiveScreen}
      />

      {/* Date nav bar — edition screen only */}
      {activeScreen === "edition" && (
        <div className="flex items-center justify-center gap-3 border-b border-rule bg-surface px-5 py-2">
          <button
            type="button"
            onClick={() => navigateEdition("prev")}
            disabled={currentEditionIdx <= 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-rule text-sm text-ink transition-colors hover:bg-card disabled:opacity-30"
          >
            &larr;
          </button>
          <span className="cursor-pointer text-[13px] font-bold text-ink underline decoration-rule underline-offset-2">
            {formatEditionDate(edition.editionDate)} &middot; Edition No.{" "}
            {edition.editionNumber}
          </span>
          <button
            type="button"
            onClick={() => navigateEdition("next")}
            disabled={currentEditionIdx >= editionIndex.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-rule text-sm text-ink transition-colors hover:bg-card disabled:opacity-30"
          >
            &rarr;
          </button>
          {layoutMode === "dynamic" && flipPageInfo.total > 0 && (
            <span className="ml-2 text-[11px] text-muted">
              {flipPageInfo.section} &middot; {flipPageInfo.page + 1}/
              {flipPageInfo.total}
            </span>
          )}
        </div>
      )}

      {/* Screen routing */}
      {activeScreen === "interests" && <InterestsScreen />}
      {activeScreen === "settings" && <SettingsScreen />}
      {activeScreen === "edition" && (
        <>
          {/* Push navigation: story detail replaces edition content */}
          {selectedStory ? (
            <StoryDetail
              story={selectedStory}
              allStories={edition.stories}
              onClose={clearSelection}
              onSelectStory={selectStory}
            />
          ) : (
            <>
              <main className="mx-auto max-w-[1120px] px-5 pb-24 md:pb-5">
                {layoutMode === "dynamic" ? (
                  <NewspaperFlip
                    stories={filteredStories}
                    sections={edition.sections}
                    onSelectStory={selectStory}
                    onPageChange={handleFlipPageChange}
                  />
                ) : layout.heroStory ? (
                  <>
                    <HeroStory
                      story={layout.heroStory}
                      onSelectStory={selectStory}
                    />

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
                                {story.imageUrl && (
                                  <div
                                    className="h-20 w-20 flex-shrink-0 rounded-lg bg-card bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url(${story.imageUrl})`,
                                    }}
                                  />
                                )}
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
            </>
          )}
        </>
      )}

      {/* Mobile bottom tab bar */}
      <MobileTabBar
        activeScreen={activeScreen}
        onSetScreen={setActiveScreen}
      />
    </>
  );
}
