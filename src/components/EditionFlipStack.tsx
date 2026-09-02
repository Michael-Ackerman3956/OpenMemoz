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

export interface EditionFlipStackHandle {
  flipToEdition: (targetIndex: number) => void;
}

interface EditionFlipStackProps {
  allEditions: Edition[];
  currentEditionIndex: number;
  activeSectionFilter: string;
  layoutMode: LayoutMode;
  onSelectStory: (story: Story) => void;
  onEditionChangeComplete: (newIndex: number) => void;
}

const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function FlipPage({ children }, ref) {
    return (
      <div ref={ref} className="bg-paper">
        <div className="no-scrollbar h-full overflow-y-auto">{children}</div>
      </div>
    );
  }
);

export const EditionFlipStack = forwardRef<
  EditionFlipStackHandle,
  EditionFlipStackProps
>(function EditionFlipStack(
  {
    allEditions,
    currentEditionIndex,
    activeSectionFilter,
    layoutMode,
    onSelectStory,
    onEditionChangeComplete,
  },
  ref
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const [bookWidth, setBookWidth] = useState(0);
  const [bookHeight, setBookHeight] = useState(0);

  useEffect(() => {
    const measureAndSetDimensions = () => {
      const viewportWidth = window.innerWidth;
      const width = Math.min(viewportWidth - 40, 1120);
      const height = Math.max(width + 100, window.innerHeight - 140);
      setBookWidth(width);
      setBookHeight(height);
    };
    measureAndSetDimensions();
    window.addEventListener("resize", measureAndSetDimensions);
    return () => window.removeEventListener("resize", measureAndSetDimensions);
  }, []);

  useImperativeHandle(ref, () => ({
    flipToEdition: (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= allEditions.length) return;
      if (targetIndex === currentEditionIndex) return;
      if (targetIndex > currentEditionIndex) {
        flipBookRef.current?.pageFlip()?.flipNext();
      } else {
        flipBookRef.current?.pageFlip()?.flipPrev();
      }
    },
  }));

  const handlePageFlip = useCallback(
    (flipEvent: { data: number }) => {
      onEditionChangeComplete(flipEvent.data);
    },
    [onEditionChangeComplete]
  );

  if (allEditions.length === 0 || bookWidth === 0) return null;

  return (
    <div
      className="flipbook-container mx-auto"
      style={{ width: bookWidth, height: bookHeight, maxWidth: "100%" }}
    >
      <HTMLFlipBook
        ref={flipBookRef}
        width={bookWidth}
        height={bookHeight}
        size="fixed"
        minWidth={320}
        maxWidth={1200}
        minHeight={600}
        maxHeight={2000}
        startPage={currentEditionIndex}
        usePortrait={true}
        showCover={false}
        drawShadow
        maxShadowOpacity={0.5}
        flippingTime={800}
        useMouseEvents={false}
        showPageCorners
        disableFlipByClick
        clickEventForward
        mobileScrollSupport
        swipeDistance={0}
        autoSize={false}
        startZIndex={0}
        renderOnlyPageLengthChange={false}
        onFlip={handlePageFlip}
        className=""
        style={{}}
      >
        {allEditions.map((editionEntry) => (
          <FlipPage key={editionEntry.editionDate}>
            <EditionSheet
              edition={editionEntry}
              activeSectionFilter={activeSectionFilter}
              layoutMode={layoutMode}
              onSelectStory={onSelectStory}
            />
          </FlipPage>
        ))}
      </HTMLFlipBook>
    </div>
  );
});
