"use client";

import type { Edition, Story } from "@/lib/types";
import { computeLayout, type LayoutMode } from "@/lib/layoutRuleEngine";
import { formatEditionDate } from "@/lib/formatDate";
import { SHOW_ALL_SECTIONS } from "@/lib/viewmodels/useEditionViewModel";
import { HeroStory } from "./HeroStory";
import { StoryCard } from "./StoryCard";
import { BriefCard } from "./BriefCard";

interface EditionSheetProps {
  edition: Edition;
  activeSectionFilter: string;
  layoutMode: LayoutMode;
  onSelectStory: (story: Story) => void;
}

/** One edition rendered as a full newspaper sheet (bento or simple feed). */
export function EditionSheet({
  edition,
  activeSectionFilter,
  layoutMode,
  onSelectStory,
}: EditionSheetProps) {
  const sheetStories =
    activeSectionFilter === SHOW_ALL_SECTIONS
      ? edition.stories
      : edition.stories.filter(
          (story) => story.section === activeSectionFilter
        );
  const layout = computeLayout(sheetStories, layoutMode);

  if (!layout.heroStory) {
    return (
      <p className="py-20 text-center font-serif text-lg italic text-muted">
        No stories in this section today.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-10">
      {/* Masthead */}
      <div className="border-b-2 border-double border-rule py-2 text-center">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-muted">
          <span>AI Curated &middot; Personal Edition</span>
          <span>Vol. I &middot; No. {edition.editionNumber}</span>
        </div>
      </div>

      <HeroStory story={layout.heroStory} onSelectStory={onSelectStory} />

      {/* Section bar */}
      <div className="flex items-center justify-between bg-[#0A0908] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
        <span>
          Today&rsquo;s Edition &middot; {sheetStories.length} Stories &middot;{" "}
          {edition.sections.length} Sections
        </span>
        <span className="font-normal text-muted">
          {formatEditionDate(edition.editionDate)}
        </span>
      </div>

      {layout.mode === "dynamic" && (
        <>
          {(layout.leftColumnStories.length > 0 ||
            layout.middleColumnStories.length > 0 ||
            layout.rightColumnStories.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1px_minmax(0,3fr)_1px_minmax(0,2fr)]">
              <div className="min-w-0 overflow-hidden px-3 py-3">
                {layout.leftColumnStories.map((story, index) => (
                  <StoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={onSelectStory}
                    isFirstInColumn={index === 0}
                  />
                ))}
              </div>
              <div className="hidden bg-rule md:block" />
              <div className="min-w-0 overflow-hidden px-3 py-3">
                {layout.middleColumnStories.map((story, index) => (
                  <StoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={onSelectStory}
                    isMiddleColumn
                    isFirstInColumn={index === 0}
                  />
                ))}
              </div>
              <div className="hidden bg-rule md:block" />
              <div className="min-w-0 overflow-hidden px-3 py-3">
                {layout.rightColumnStories.map((story, index) => (
                  <StoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={onSelectStory}
                    isFirstInColumn={index === 0}
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
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          )}
        </>
      )}

      {layout.mode === "simple" && layout.feedStories.length > 0 && (
        <div className="divide-y divide-rule">
          {layout.feedStories.map((story) => (
            <article
              key={story.storyIdentifier}
              className="cursor-pointer py-4 transition-colors hover:bg-card/40"
              onClick={() => onSelectStory(story)}
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
                    className="hidden h-[72px] w-[110px] shrink-0 rounded-sm bg-card bg-cover bg-center sm:block"
                    style={{ backgroundImage: `url(${story.imageUrl})` }}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
