"use client";

import { useCallback, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";
import React from "react";

interface FlipBookProps {
  stories: Story[];
  sections: string[];
  onSelectStory: (story: Story) => void;
}

const FlipPage = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string }
>(function FlipPage({ children, className }, ref) {
  return (
    <div ref={ref} className={`overflow-hidden bg-paper ${className ?? ""}`}>
      {children}
    </div>
  );
});

function SectionPage({
  sectionName,
  sectionStories,
  onSelectStory,
  pageNumber,
  totalPages,
}: {
  sectionName: string;
  sectionStories: Story[];
  onSelectStory: (story: Story) => void;
  pageNumber: number;
  totalPages: number;
}) {
  const [heroStory, ...rest] = sectionStories;
  return (
    <div className="flex h-full flex-col p-5 md:p-8">
      {/* Page header */}
      <div className="mb-3 flex items-center justify-between border-b-2 border-double border-rule pb-2">
        <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-accent">
          {sectionName}
        </span>
        <span className="font-sans text-[9px] uppercase tracking-[0.12em] text-muted">
          Page {pageNumber} of {totalPages}
        </span>
      </div>

      {/* Hero story */}
      {heroStory && (
        <div
          className="mb-3 cursor-pointer border-b border-rule pb-3"
          onClick={() => onSelectStory(heroStory)}
        >
          <h2 className="font-serif text-2xl font-black leading-[1.08] md:text-3xl">
            {heroStory.headline}
          </h2>
          <p className="mt-1.5 font-body text-sm leading-relaxed text-muted">
            {heroStory.excerpt}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-muted">
            <ProvenanceBadge provenanceTier={heroStory.provenanceTier} />
            <span>{heroStory.sourceName}</span>
          </div>
        </div>
      )}

      {/* Remaining stories in 2-col grid */}
      {rest.length > 0 && (
        <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
          {rest.map((story) => (
            <div
              key={story.storyIdentifier}
              className="cursor-pointer border-b border-rule pb-2"
              onClick={() => onSelectStory(story)}
            >
              <h3 className="font-serif text-sm font-bold leading-snug">
                {story.headline}
              </h3>
              <p className="mt-0.5 font-body text-[12px] leading-relaxed text-muted line-clamp-2">
                {story.excerpt}
              </p>
              <div className="mt-0.5 text-[8px] text-muted">
                <ProvenanceBadge provenanceTier={story.provenanceTier} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Page footer hint */}
      <div className="mt-auto pt-2 text-center text-[9px] italic text-muted/60">
        {pageNumber < totalPages
          ? "Drag edge or press → to turn page"
          : "Last page — press ← to go back"}
      </div>
    </div>
  );
}

export function FlipBook({
  stories,
  sections,
  onSelectStory,
}: FlipBookProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const storiesBySection = sections.map((section) => ({
    section,
    stories: stories.filter((story) => story.section === section),
  })).filter((group) => group.stories.length > 0);

  const totalPages = storiesBySection.length;

  const handleFlipPrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleFlipNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const handlePageChange = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  return (
    <div className="mx-auto max-w-[1120px]">
      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-4 py-3">
        <button
          type="button"
          onClick={handleFlipPrev}
          disabled={currentPage === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule text-ink transition-colors hover:bg-card disabled:opacity-30"
        >
          &larr;
        </button>
        <span className="text-sm font-medium text-muted">
          {storiesBySection[currentPage]?.section ?? "—"} &middot; Page{" "}
          {currentPage + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={handleFlipNext}
          disabled={currentPage >= totalPages - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rule text-ink transition-colors hover:bg-card disabled:opacity-30"
        >
          &rarr;
        </button>
      </div>

      {/* FlipBook */}
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
          onFlip={handlePageChange}
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
          {storiesBySection.map((group, index) => (
            <FlipPage key={group.section}>
              <SectionPage
                sectionName={group.section}
                sectionStories={group.stories}
                onSelectStory={onSelectStory}
                pageNumber={index + 1}
                totalPages={totalPages}
              />
            </FlipPage>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}
