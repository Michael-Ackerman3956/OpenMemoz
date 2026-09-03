"use client";

import { useCallback, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import type { Story } from "@/lib/types";
import { computeLayout } from "@/lib/layoutRuleEngine";
import React from "react";

interface FlipBookProps {
  stories: Story[];
  sections: string[];
  onSelectStory: (story: Story) => void;
  onPageChange?: (page: number, total: number, sectionName: string) => void;
}

const FlipPage = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(function FlipPage({ children }, ref) {
  return (
    <div ref={ref} className="overflow-hidden bg-paper">
      {children}
    </div>
  );
});

function SectionPage({
  sectionName,
  sectionStories,
  onSelectStory,
}: {
  sectionName: string;
  sectionStories: Story[];
  onSelectStory: (story: Story) => void;
}) {
  const layout = computeLayout(sectionStories, "dynamic");

  if (layout.mode !== "dynamic" || !layout.heroStory) return null;

  const allRemainingStories = [
    ...layout.sidebarStories,
    ...layout.midRowStories,
    ...(layout.videoFeatureStory ? [layout.videoFeatureStory] : []),
    ...layout.belowFoldStories,
  ];

  const leftColumn = allRemainingStories.filter((_, i) => i % 3 === 0);
  const middleColumn = allRemainingStories.filter((_, i) => i % 3 === 1);
  const rightColumn = allRemainingStories.filter((_, i) => i % 3 === 2);

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
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
              <div
                key={story.storyIdentifier}
                className="cursor-pointer border-b border-rule py-1.5"
                onClick={() => onSelectStory(story)}
              >
                <h3 className="font-serif text-sm font-bold leading-snug">
                  {story.headline}
                </h3>
                <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
                  {story.excerpt}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden bg-rule md:block" />
          <div className="py-1">
            {middleColumn.map((story) => (
              <div
                key={story.storyIdentifier}
                className="cursor-pointer border-b border-rule py-1.5"
                onClick={() => onSelectStory(story)}
              >
                <h3 className="font-serif text-[15px] font-bold leading-snug">
                  {story.headline}
                </h3>
                <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
                  {story.excerpt}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden bg-rule md:block" />
          <div className="py-1">
            {rightColumn.map((story) => (
              <div
                key={story.storyIdentifier}
                className="cursor-pointer border-b border-rule py-1.5"
                onClick={() => onSelectStory(story)}
              >
                <h3 className="font-serif text-sm font-bold leading-snug">
                  {story.headline}
                </h3>
                <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
                  {story.excerpt}
                </p>
              </div>
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

export function FlipBook({
  stories,
  sections,
  onSelectStory,
  onPageChange,
}: FlipBookProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const storiesBySection = sections
    .map((section) => ({
      section,
      stories: stories.filter((story) => story.section === section),
    }))
    .filter((group) => group.stories.length > 0);

  const totalPages = storiesBySection.length;

  const handleFlipPrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleFlipNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const handlePageFlip = useCallback(
    (e: any) => {
      const page = e.data;
      setCurrentPage(page);
      if (onPageChange && storiesBySection[page]) {
        onPageChange(page, totalPages, storiesBySection[page].section);
      }
    },
    [onPageChange, storiesBySection, totalPages]
  );

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="flex justify-center">
        <HTMLFlipBook
          ref={flipBookRef}
          width={550}
          height={700}
          size="stretch"
          minWidth={300}
          maxWidth={1100}
          minHeight={400}
          maxHeight={900}
          showCover={false}
          mobileScrollSupport={false}
          onFlip={handlePageFlip}
          className="shadow-2xl"
          style={{}}
          startPage={0}
          drawShadow
          flippingTime={600}
          usePortrait={true}
          startZIndex={0}
          autoSize
          maxShadowOpacity={0.5}
          showPageCorners
          disableFlipByClick={false}
          useMouseEvents
          swipeDistance={30}
          clickEventForward
          renderOnlyPageLengthChange={false}
        >
          {storiesBySection.map((group) => (
            <FlipPage key={group.section}>
              <SectionPage
                sectionName={group.section}
                sectionStories={group.stories}
                onSelectStory={onSelectStory}
              />
            </FlipPage>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}

export { type FlipBookProps };
