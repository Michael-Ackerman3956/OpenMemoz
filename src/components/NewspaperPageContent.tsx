"use client";

import type { Story } from "@/lib/types";
import { computeLayout } from "@/lib/layoutRuleEngine";

interface NewspaperPageContentProps {
  sectionName: string;
  sectionStories: Story[];
  onSelectStory: (story: Story) => void;
}

function CompactStoryItem({ story, onSelectStory, isLarger }: { story: Story; onSelectStory: (s: Story) => void; isLarger?: boolean }) {
  return (
    <div
      className="cursor-pointer border-b border-rule py-1.5"
      onClick={() => onSelectStory(story)}
    >
      <h3 className={`font-serif font-bold leading-snug ${isLarger ? "text-[15px]" : "text-sm"}`}>
        {story.headline}
      </h3>
      <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
        {story.excerpt}
      </p>
    </div>
  );
}

export function NewspaperPageContent({
  sectionName,
  sectionStories,
  onSelectStory,
}: NewspaperPageContentProps) {
  const layout = computeLayout(sectionStories, "dynamic");
  if (layout.mode !== "dynamic" || !layout.heroStory) return null;

  const allRemainingStories = [
    ...layout.sidebarStories,
    ...layout.midRowStories,
    ...(layout.videoFeatureStory ? [layout.videoFeatureStory] : []),
    ...layout.briefStripStories,
    ...layout.belowFoldColumns.flat(),
  ];

  const leftColumn = allRemainingStories.filter((_, i) => i % 3 === 0);
  const middleColumn = allRemainingStories.filter((_, i) => i % 3 === 1);
  const rightColumn = allRemainingStories.filter((_, i) => i % 3 === 2);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6">
      <div className="mb-2 border-b-2 border-double border-rule pb-1.5">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
          {sectionName}
        </span>
      </div>

      <div
        className="mb-2 cursor-pointer border-b border-rule pb-2"
        onClick={() => onSelectStory(layout.heroStory!)}
      >
        <h2 className="font-serif text-xl font-black leading-[1.08] md:text-2xl">
          {layout.heroStory.headline}
        </h2>
        <p className="mt-1 font-body text-[13px] leading-relaxed text-muted line-clamp-3">
          {layout.heroStory.excerpt}
        </p>
      </div>

      {allRemainingStories.length > 0 && (
        <div className="grid flex-1 grid-cols-1 gap-x-3 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
          <div className="py-1">
            {leftColumn.map((story) => (
              <CompactStoryItem key={story.storyIdentifier} story={story} onSelectStory={onSelectStory} />
            ))}
          </div>
          <div className="hidden bg-rule md:block" />
          <div className="py-1">
            {middleColumn.map((story) => (
              <CompactStoryItem key={story.storyIdentifier} story={story} onSelectStory={onSelectStory} isLarger />
            ))}
          </div>
          <div className="hidden bg-rule md:block" />
          <div className="py-1">
            {rightColumn.map((story) => (
              <CompactStoryItem key={story.storyIdentifier} story={story} onSelectStory={onSelectStory} />
            ))}
          </div>
        </div>
      )}

      {layout.briefStripStories.length > 0 && (
        <div className="mt-auto grid grid-cols-2 gap-px bg-rule pt-px md:grid-cols-4">
          {layout.briefStripStories.map((story) => (
            <div
              key={story.storyIdentifier}
              className="cursor-pointer bg-paper p-2"
              onClick={() => onSelectStory(story)}
            >
              <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
                {story.section}
              </p>
              <h4 className="mt-0.5 font-serif text-[11px] font-bold leading-[1.2]">
                {story.headline}
              </h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
