"use client";

import { useEditionViewModel } from "@/lib/viewmodels/useEditionViewModel";
import { formatEditionDate } from "@/lib/formatDate";
import { EditionHeader } from "@/components/EditionHeader";
import { HeroStory } from "@/components/HeroStory";
import { StoryCard } from "@/components/StoryCard";
import { StoryDetail } from "@/components/StoryDetail";

export default function EditionPage() {
  const {
    edition,
    filteredStories,
    activeSectionFilter,
    setActiveSectionFilter,
    selectedStory,
    selectStory,
    clearSelection,
  } = useEditionViewModel();

  if (!edition) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif text-xl italic text-muted">
          Composing today’s edition…
        </p>
      </main>
    );
  }

  const [heroStory, ...remainingStories] = filteredStories;

  return (
    <>
      <EditionHeader
        sections={edition.sections}
        activeSectionFilter={activeSectionFilter}
        onSelectSection={setActiveSectionFilter}
      />
      <main className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-double border-rule py-3 font-sans text-[11px] uppercase tracking-[0.2em] text-muted">
          <span>{formatEditionDate(edition.editionDate)}</span>
          <span>
            Edition No. {edition.editionNumber} · {filteredStories.length} of{" "}
            {edition.storyCount} stories
          </span>
        </div>
        {heroStory ? (
          <>
            <HeroStory story={heroStory} onSelectStory={selectStory} />
            {remainingStories.length > 0 && (
              <section
                aria-label="More stories"
                className="grid gap-x-8 gap-y-10 py-10 sm:grid-cols-2 lg:grid-cols-3"
              >
                {remainingStories.map((story) => (
                  <StoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={selectStory}
                  />
                ))}
              </section>
            )}
          </>
        ) : (
          <p className="py-20 text-center font-serif text-lg italic text-muted">
            No stories in this section today.
          </p>
        )}
      </main>
      <footer className="border-t-4 border-double border-rule">
        <div className="mx-auto max-w-6xl space-y-2 px-5 py-10 font-sans text-xs leading-relaxed text-muted">
          <p>
            <span className="font-serif text-base font-bold text-ink">
              DailyPress<span className="text-accent">.</span>
            </span>{" "}
            — an agent-readable newspaper. This page exposes six WebMCP tools
            via <code>document.modelContext</code>.
          </p>
          <p>
            Sources: Hacker News · Federal Reserve · NOAA · EurekAlert ·
            ScienceDaily · NVD · TechCrunch · NASA · SEC EDGAR
          </p>
          <p>
            Built for the WebMCP Challenge · Apache-2.0 · © 2026 Nestuary
            Wellness Inc.
          </p>
        </div>
      </footer>
      {selectedStory && (
        <StoryDetail story={selectedStory} onClose={clearSelection} />
      )}
    </>
  );
}
