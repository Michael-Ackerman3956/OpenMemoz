"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import HTMLFlipBook from "react-pageflip";
import type { Edition, Story } from "@/lib/types";
import type { LayoutMode } from "@/lib/layoutRuleEngine";
import { EditionSheet } from "./EditionSheet";

export interface EditionFlipBookHandle {
  flipToNextEdition: () => void;
  flipToPreviousEdition: () => void;
}

interface EditionFlipBookProps {
  allEditions: Edition[];
  startEditionIndex: number;
  activeSectionFilter: string;
  layoutMode: LayoutMode;
  onSelectStory: (story: Story) => void;
  onEditionChange: (editionArrayIndex: number) => void;
  onToggleFavourite?: (storyIdentifier: string) => void;
}

const FlipPage = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode }
>(function FlipPage({ children }, ref) {
  return (
    <div ref={ref} className="overflow-hidden bg-paper">
      <div className="no-scrollbar h-full overflow-y-auto">{children}</div>
    </div>
  );
});

export const EditionFlipBook = forwardRef<
  EditionFlipBookHandle,
  EditionFlipBookProps
>(function EditionFlipBook(
  {
    allEditions,
    startEditionIndex,
    activeSectionFilter,
    layoutMode,
    onSelectStory,
    onEditionChange,
    onToggleFavourite,
  },
  ref
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const [bookHeight, setBookHeight] = useState(760);

  useEffect(() => {
    const measure = () =>
      setBookHeight(Math.max(480, Math.min(940, window.innerHeight - 132)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useImperativeHandle(ref, () => ({
    flipToNextEdition: () => flipBookRef.current?.pageFlip()?.flipNext(),
    flipToPreviousEdition: () => flipBookRef.current?.pageFlip()?.flipPrev(),
  }));

  const handlePageFlip = useCallback(
    (flipEvent: { data: number }) => onEditionChange(flipEvent.data),
    [onEditionChange]
  );

  return (
    <div className="mx-auto max-w-[1120px]">
      <HTMLFlipBook
        ref={flipBookRef}
        width={1100}
        height={bookHeight}
        size="stretch"
        minWidth={320}
        maxWidth={1120}
        minHeight={480}
        maxHeight={940}
        startPage={startEditionIndex}
        usePortrait
        showCover={false}
        drawShadow
        maxShadowOpacity={0.55}
        flippingTime={900}
        /* Flips are arrow-driven so vertical scrolling and the
           swipe-to-switch-section gesture keep working inside pages */
        useMouseEvents={false}
        showPageCorners={false}
        disableFlipByClick
        clickEventForward
        mobileScrollSupport
        swipeDistance={0}
        autoSize
        startZIndex={0}
        renderOnlyPageLengthChange={false}
        onFlip={handlePageFlip}
        className=""
        style={{}}
      >
        {allEditions.map((edition) => (
          <FlipPage key={edition.editionDate}>
            <EditionSheet
              edition={edition}
              activeSectionFilter={activeSectionFilter}
              layoutMode={layoutMode}
              onSelectStory={onSelectStory}
              onToggleFavourite={onToggleFavourite}
            />
          </FlipPage>
        ))}
      </HTMLFlipBook>
    </div>
  );
});
