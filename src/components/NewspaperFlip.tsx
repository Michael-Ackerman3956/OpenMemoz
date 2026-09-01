"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Story } from "@/lib/types";
import { computeLayout } from "@/lib/layoutRuleEngine";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface NewspaperFlipProps {
  stories: Story[];
  sections: string[];
  onSelectStory: (story: Story) => void;
  onPageChange?: (page: number, total: number, sectionName: string) => void;
}

function PageContent({
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
            (col, colIdx) => {
              if (col === null)
                return <div key={`vr-${colIdx}`} className="hidden bg-rule md:block" />;
              const isMiddle = colIdx === 2;
              return (
                <div key={colIdx} className="py-1">
                  {col.map((story) => (
                    <div
                      key={story.storyIdentifier}
                      className="cursor-pointer border-b border-rule py-1.5"
                      onClick={() => onSelectStory(story)}
                    >
                      <h3
                        className={`font-serif font-bold leading-snug ${
                          isMiddle ? "text-[15px]" : "text-sm"
                        }`}
                      >
                        {story.headline}
                      </h3>
                      <p className="mt-0.5 font-body text-[11px] leading-relaxed text-muted line-clamp-2">
                        {story.excerpt}
                      </p>
                      <div className="mt-0.5 text-[8px]">
                        <ProvenanceBadge provenanceTier={story.provenanceTier} />
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

export function NewspaperFlip({
  stories,
  sections,
  onSelectStory,
  onPageChange,
}: NewspaperFlipProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [flipState, setFlipState] = useState<"idle" | "flipping-next" | "flipping-prev">("idle");
  const [dragX, setDragX] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const storiesBySection = useMemo(
    () =>
      sections
        .map((section) => ({
          section,
          stories: stories.filter((s) => s.section === section),
        }))
        .filter((group) => group.stories.length > 0),
    [stories, sections]
  );

  const totalPages = storiesBySection.length;
  const canGoNext = currentPage < totalPages - 1;
  const canGoPrev = currentPage > 0;

  useEffect(() => {
    if (onPageChange && storiesBySection[currentPage]) {
      onPageChange(currentPage, totalPages, storiesBySection[currentPage].section);
    }
  }, [currentPage, totalPages, storiesBySection, onPageChange]);

  const flipToNext = useCallback(() => {
    if (!canGoNext || flipState !== "idle") return;
    setFlipState("flipping-next");
    setTimeout(() => {
      setCurrentPage((p) => p + 1);
      setFlipState("idle");
      setDragX(0);
    }, 500);
  }, [canGoNext, flipState]);

  const flipToPrev = useCallback(() => {
    if (!canGoPrev || flipState !== "idle") return;
    setFlipState("flipping-prev");
    setTimeout(() => {
      setCurrentPage((p) => p - 1);
      setFlipState("idle");
      setDragX(0);
    }, 500);
  }, [canGoPrev, flipState]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    setDragX(0);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - dragStartX.current;
    setDragX(delta);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragX < -80 && canGoNext) {
      flipToNext();
    } else if (dragX > 80 && canGoPrev) {
      flipToPrev();
    } else {
      setDragX(0);
    }
  }, [dragX, canGoNext, canGoPrev, flipToNext, flipToPrev]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flipToNext();
      if (e.key === "ArrowLeft") flipToPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipToNext, flipToPrev]);

  const getFlipAngle = () => {
    if (flipState === "flipping-next") return -180;
    if (flipState === "flipping-prev") return 0;
    if (dragX !== 0) {
      const clampedDrag = Math.max(-200, Math.min(200, dragX));
      return (clampedDrag / 200) * -90;
    }
    return 0;
  };

  const flipAngle = getFlipAngle();

  return (
    <div className="mx-auto max-w-[1120px]">
      <div
        ref={containerRef}
        className="relative mx-auto select-none overflow-hidden"
        style={{ perspective: "2000px", height: "700px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Layer 1: Next page (behind) */}
        {canGoNext && storiesBySection[currentPage + 1] && (
          <div className="absolute inset-0 rounded border border-rule bg-paper">
            <PageContent
              sectionName={storiesBySection[currentPage + 1].section}
              sectionStories={storiesBySection[currentPage + 1].stories}
              onSelectStory={onSelectStory}
            />
          </div>
        )}

        {/* Layer 2: Previous page (behind, for backward flip) */}
        {canGoPrev && flipState === "flipping-prev" && storiesBySection[currentPage - 1] && (
          <div className="absolute inset-0 rounded border border-rule bg-paper">
            <PageContent
              sectionName={storiesBySection[currentPage - 1].section}
              sectionStories={storiesBySection[currentPage - 1].stories}
              onSelectStory={onSelectStory}
            />
          </div>
        )}

        {/* Layer 3: Current page (top, flips) */}
        <div
          className="absolute inset-0 rounded border border-rule bg-paper shadow-xl"
          style={{
            transformOrigin: "left center",
            transform: `rotateY(${flipAngle}deg)`,
            transition: flipState !== "idle" ? "transform 0.5s ease-in-out" : "none",
            backfaceVisibility: "hidden",
            zIndex: 10,
          }}
        >
          <PageContent
            sectionName={storiesBySection[currentPage]?.section ?? ""}
            sectionStories={storiesBySection[currentPage]?.stories ?? []}
            onSelectStory={onSelectStory}
          />

          {/* Page curl shadow */}
          {(flipAngle !== 0 || flipState !== "idle") && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-16"
              style={{
                background: `linear-gradient(to left, rgba(0,0,0,${
                  Math.abs(flipAngle) / 360
                }), transparent)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Swipe hint */}
      <p className="mt-2 text-center text-[10px] italic text-muted/50">
        Swipe or drag to flip &middot; Arrow keys &larr; &rarr;
      </p>
    </div>
  );
}
