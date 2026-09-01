"use client";

import type { Story } from "@/lib/types";
import { computeLayout } from "@/lib/layoutRuleEngine";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface NewspaperPageContentProps {
  sectionName: string;
  sectionStories: Story[];
  onSelectStory: (story: Story) => void;
}

export function NewspaperPageContent({
  sectionName,
  sectionStories,
  onSelectStory,
}: NewspaperPageContentProps) {
  const layout = computeLayout(sectionStories, "dynamic");
  if (layout.mode !== "dynamic" || !layout.heroStory) return null;

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
        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
          <ProvenanceBadge provenanceTier={layout.heroStory.provenanceTier} />
          <span>{layout.heroStory.sourceName}</span>
        </div>
      </div>

      {(layout.leftColumnStories.length > 0 ||
        layout.middleColumnStories.length > 0 ||
        layout.rightColumnStories.length > 0) && (
        <div className="grid flex-1 grid-cols-1 gap-x-3 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
          {[layout.leftColumnStories, null, layout.middleColumnStories, null, layout.rightColumnStories].map(
            (column, columnIndex) => {
              if (column === null)
                return (
                  <div
                    key={`vr-${columnIndex}`}
                    className="hidden bg-rule md:block"
                  />
                );
              const isMiddleColumn = columnIndex === 2;
              return (
                <div key={columnIndex} className="py-1">
                  {column.map((story) => (
                    <div
                      key={story.storyIdentifier}
                      className="cursor-pointer border-b border-rule py-1.5"
                      onClick={() => onSelectStory(story)}
                    >
                      <h3
                        className={`font-serif font-bold leading-snug ${
                          isMiddleColumn ? "text-[15px]" : "text-sm"
                        }`}
                      >
                        {story.headline}
                      </h3>
                      <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
                        {story.excerpt}
                      </p>
                      <div className="mt-0.5 text-[8px]">
                        <ProvenanceBadge
                          provenanceTier={story.provenanceTier}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
          )}
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
