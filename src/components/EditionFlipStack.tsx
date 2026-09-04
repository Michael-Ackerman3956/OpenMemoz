"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
  onToggleFavourite?: (storyIdentifier: string) => void;
  onDeleteStory?: (storyIdentifier: string) => void;
}

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
    onToggleFavourite,
    onDeleteStory,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageFlipRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const onEditionChangeRef = useRef(onEditionChangeComplete);
  onEditionChangeRef.current = onEditionChangeComplete;

  useEffect(() => {
    if (!containerRef.current || allEditions.length === 0) return;

    let destroyed = false;

    import("page-flip").then(({ PageFlip }) => {
      if (destroyed || !containerRef.current) return;

      const viewportWidth = window.innerWidth;
      const pageWidth = Math.min(viewportWidth - 40, 1120);
      const pageHeight = Math.max(pageWidth + 100, window.innerHeight - 140);

      const flipInstance = new PageFlip(containerRef.current, {
        width: pageWidth,
        height: pageHeight,
        size: "fixed",
        minWidth: 320,
        maxWidth: 1200,
        minHeight: 600,
        maxHeight: 2000,
        usePortrait: true,
        showCover: false,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        flippingTime: 800,
        useMouseEvents: true,
        showPageCorners: true,
        disableFlipByClick: true,
        clickEventForward: true,
        mobileScrollSupport: true,
        swipeDistance: 50,
        autoSize: false,
        startZIndex: 0,
        startPage: currentEditionIndex,
      });

      const pageElements = containerRef.current.querySelectorAll(
        ".flipbook-page"
      );
      if (pageElements.length > 0) {
        flipInstance.loadFromHTML(
          Array.from(pageElements) as HTMLElement[]
        );
      }

      flipInstance.on("flip", (event: { data: number }) => {
        onEditionChangeRef.current(event.data);
      });

      pageFlipRef.current = flipInstance;
      setIsReady(true);
    });

    return () => {
      destroyed = true;
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
        pageFlipRef.current = null;
        setIsReady(false);
      }
    };
  }, [allEditions.length]);

  useEffect(() => {
    if (!pageFlipRef.current || !isReady) return;
    const handleResize = () => {
      pageFlipRef.current?.update();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isReady]);

  useImperativeHandle(ref, () => ({
    flipToEdition: (targetIndex: number) => {
      if (!pageFlipRef.current) return;
      if (targetIndex < 0 || targetIndex >= allEditions.length) return;
      if (pageFlipRef.current.getState() !== "read") return;

      const currentPage = pageFlipRef.current.getCurrentPageIndex();
      if (targetIndex === currentPage) return;

      const delta = targetIndex - currentPage;
      if (delta === 1 || delta === -1) {
        const settings = pageFlipRef.current.getSettings();
        settings.disableFlipByClick = false;
        try {
          if (delta === 1) pageFlipRef.current.flipNext();
          else pageFlipRef.current.flipPrev();
        } finally {
          settings.disableFlipByClick = true;
        }
      } else {
        pageFlipRef.current.turnToPage(targetIndex);
      }
    },
  }));

  const handleStorySelect = useCallback(
    (story: Story) => onSelectStory(story),
    [onSelectStory]
  );

  if (allEditions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="flipbook-container mx-auto"
    >
      {allEditions.map((editionEntry) => (
        <div key={editionEntry.editionDate} className="flipbook-page bg-paper">
          <div className="no-scrollbar h-full overflow-y-auto">
            <EditionSheet
              edition={editionEntry}
              activeSectionFilter={activeSectionFilter}
              layoutMode={layoutMode}
              onSelectStory={handleStorySelect}
              onToggleFavourite={onToggleFavourite}
              onDeleteStory={onDeleteStory}
            />
          </div>
        </div>
      ))}
    </div>
  );
});
