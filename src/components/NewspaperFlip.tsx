"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Story } from "@/lib/types";
import {
  computePeelGeometry,
  type PeelDirection,
} from "@/lib/peelGeometry";
import { NewspaperPageContent } from "./NewspaperPageContent";

interface NewspaperFlipProps {
  stories: Story[];
  sections: string[];
  onSelectStory: (story: Story) => void;
  onPageChange?: (page: number, total: number, sectionName: string) => void;
}

const DRAG_START_DISTANCE_PX = 10;
const DRAG_TRAVEL_FRACTION = 0.72;
const COMMIT_THRESHOLD = 0.32;
const FLICK_VELOCITY_PX_PER_MS = 0.55;

const PAPER_TEXTURE =
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 3px)";
const FOLD_GRADIENT_NEXT =
  "linear-gradient(225deg, #322b1c 0%, #221e15 30%, #1b1812 55%, #100e0a 100%)";
const FOLD_GRADIENT_PREV =
  "linear-gradient(135deg, #322b1c 0%, #221e15 30%, #1b1812 55%, #100e0a 100%)";

interface PointerDragState {
  pointerId: number;
  startX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  hasDragged: boolean;
}

export function NewspaperFlip({
  stories,
  sections,
  onSelectStory,
  onPageChange,
}: NewspaperFlipProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activePeelDirection, setActivePeelDirection] =
    useState<PeelDirection | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentPageLayerRef = useRef<HTMLDivElement>(null);
  const previousPageLayerRef = useRef<HTMLDivElement>(null);
  const foldWrapperRef = useRef<HTMLDivElement>(null);
  const foldSurfaceRef = useRef<HTMLDivElement>(null);

  const peelProgressRef = useRef(0);
  const peelDirectionRef = useRef<PeelDirection | null>(null);
  const autoFlipRef = useRef(false);
  const animationFrameRef = useRef(0);
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const suppressClickRef = useRef(false);

  const storiesBySection = useMemo(
    () =>
      sections
        .map((section) => ({
          section,
          stories: stories.filter((story) => story.section === section),
        }))
        .filter((group) => group.stories.length > 0),
    [stories, sections]
  );

  const totalPages = storiesBySection.length;
  const canGoNext = currentPageIndex < totalPages - 1;
  const canGoPrev = currentPageIndex > 0;

  useEffect(() => {
    if (totalPages > 0 && currentPageIndex >= totalPages) {
      setCurrentPageIndex(0);
    }
  }, [currentPageIndex, totalPages]);

  useEffect(() => {
    if (onPageChange && storiesBySection[currentPageIndex]) {
      onPageChange(
        currentPageIndex,
        totalPages,
        storiesBySection[currentPageIndex].section
      );
    }
  }, [currentPageIndex, totalPages, storiesBySection, onPageChange]);

  const applyPeelStyles = useCallback(
    (peelAmount: number, direction: PeelDirection) => {
      const peelingLayer =
        direction === "next"
          ? currentPageLayerRef.current
          : previousPageLayerRef.current;
      const foldWrapper = foldWrapperRef.current;
      const foldSurface = foldSurfaceRef.current;
      if (!peelingLayer || !foldWrapper || !foldSurface) return;

      const geometry = computePeelGeometry(peelAmount, direction);
      peelingLayer.style.clipPath = geometry.pageClipPath;
      foldSurface.style.clipPath = geometry.foldClipPath;
      foldWrapper.style.opacity = geometry.foldIsVisible ? "1" : "0";
      const shadowOffsetX = direction === "next" ? -7 : 7;
      const shadowAlpha = (0.5 * geometry.shadowStrength).toFixed(3);
      foldWrapper.style.filter = `drop-shadow(${shadowOffsetX}px 9px 13px rgba(0,0,0,${shadowAlpha}))`;
    },
    []
  );

  const clearPeelStyles = useCallback(() => {
    for (const layerNode of [
      currentPageLayerRef.current,
      previousPageLayerRef.current,
    ]) {
      if (layerNode) layerNode.style.clipPath = "";
    }
  }, []);

  const runPeelTween = useCallback(
    (target: number, direction: PeelDirection, onArrive: () => void) => {
      cancelAnimationFrame(animationFrameRef.current);
      const from = peelProgressRef.current;
      const startTime = performance.now();
      const duration = Math.max(180, 420 * Math.abs(target - from));

      const step = (now: number) => {
        const linearK = Math.min(1, (now - startTime) / duration);
        const easedK = 1 - Math.pow(1 - linearK, 3);
        peelProgressRef.current = from + (target - from) * easedK;
        applyPeelStyles(peelProgressRef.current, direction);
        if (linearK < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          onArrive();
        }
      };
      animationFrameRef.current = requestAnimationFrame(step);
    },
    [applyPeelStyles]
  );

  const settlePeel = useCallback(
    (direction: PeelDirection, shouldCommit: boolean) => {
      const target =
        direction === "next" ? (shouldCommit ? 1 : 0) : shouldCommit ? 0 : 1;
      runPeelTween(target, direction, () => {
        if (shouldCommit) {
          setCurrentPageIndex(
            (pageIndex) => pageIndex + (direction === "next" ? 1 : -1)
          );
        }
        peelDirectionRef.current = null;
        peelProgressRef.current = 0;
        setActivePeelDirection(null);
      });
    },
    [runPeelTween]
  );

  const beginPeel = useCallback(
    (direction: PeelDirection, initialProgress: number) => {
      peelProgressRef.current = initialProgress;
      peelDirectionRef.current = direction;
      setActivePeelDirection(direction);
    },
    []
  );

  useLayoutEffect(() => {
    if (activePeelDirection === null) {
      clearPeelStyles();
      return;
    }
    applyPeelStyles(peelProgressRef.current, activePeelDirection);
    if (autoFlipRef.current) {
      autoFlipRef.current = false;
      settlePeel(activePeelDirection, true);
    }
  }, [activePeelDirection, applyPeelStyles, clearPeelStyles, settlePeel]);

  const flipToNextPage = useCallback(() => {
    if (peelDirectionRef.current !== null || !canGoNext) return;
    autoFlipRef.current = true;
    beginPeel("next", 0);
  }, [canGoNext, beginPeel]);

  const flipToPreviousPage = useCallback(() => {
    if (peelDirectionRef.current !== null || !canGoPrev) return;
    autoFlipRef.current = true;
    beginPeel("prev", 1);
  }, [canGoPrev, beginPeel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement)?.tagName;
      if (targetTag === "INPUT" || targetTag === "TEXTAREA") return;
      if (event.key === "ArrowRight") flipToNextPage();
      if (event.key === "ArrowLeft") flipToPreviousPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipToNextPage, flipToPreviousPage]);

  useEffect(() => () => cancelAnimationFrame(animationFrameRef.current), []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      hasDragged: false,
    };
    suppressClickRef.current = false;
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const dragState = pointerDragRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const elapsedMs = event.timeStamp - dragState.lastTime;
      if (elapsedMs > 0) {
        dragState.velocity = (event.clientX - dragState.lastX) / elapsedMs;
      }
      dragState.lastX = event.clientX;
      dragState.lastTime = event.timeStamp;

      const deltaX = event.clientX - dragState.startX;

      if (!dragState.hasDragged) {
        if (Math.abs(deltaX) < DRAG_START_DISTANCE_PX) return;
        if (peelDirectionRef.current !== null) return;
        const direction: PeelDirection = deltaX < 0 ? "next" : "prev";
        if (direction === "next" && !canGoNext) return;
        if (direction === "prev" && !canGoPrev) return;
        dragState.hasDragged = true;
        suppressClickRef.current = true;
        containerRef.current?.setPointerCapture(event.pointerId);
        beginPeel(direction, direction === "next" ? 0 : 1);
        return;
      }

      const direction = peelDirectionRef.current;
      if (direction === null) return;
      const containerWidth = containerRef.current?.clientWidth ?? 1;
      const travel = Math.abs(deltaX) - DRAG_START_DISTANCE_PX;
      const dragFraction = Math.min(
        1,
        Math.max(0, travel / (containerWidth * DRAG_TRAVEL_FRACTION))
      );
      const progress = direction === "next" ? dragFraction : 1 - dragFraction;
      peelProgressRef.current = progress;
      applyPeelStyles(progress, direction);
    },
    [canGoNext, canGoPrev, beginPeel, applyPeelStyles]
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent) => {
      const dragState = pointerDragRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      pointerDragRef.current = null;

      const direction = peelDirectionRef.current;
      if (!dragState.hasDragged || direction === null) return;

      const progress = peelProgressRef.current;
      let shouldCommit: boolean;
      if (direction === "next") {
        shouldCommit =
          progress > COMMIT_THRESHOLD ||
          dragState.velocity < -FLICK_VELOCITY_PX_PER_MS;
        if (dragState.velocity > FLICK_VELOCITY_PX_PER_MS)
          shouldCommit = false;
      } else {
        shouldCommit =
          progress < 1 - COMMIT_THRESHOLD ||
          dragState.velocity > FLICK_VELOCITY_PX_PER_MS;
        if (dragState.velocity < -FLICK_VELOCITY_PX_PER_MS)
          shouldCommit = false;
      }
      settlePeel(direction, shouldCommit);
    },
    [settlePeel]
  );

  const handlePointerCancel = useCallback(() => {
    pointerDragRef.current = null;
    const direction = peelDirectionRef.current;
    if (direction !== null) settlePeel(direction, false);
  }, [settlePeel]);

  const handleClickCapture = useCallback((event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  if (totalPages === 0) {
    return (
      <p className="py-20 text-center font-serif text-lg italic text-muted">
        No stories in this section today.
      </p>
    );
  }

  const safePageIndex = Math.min(currentPageIndex, totalPages - 1);
  const previousSectionGroup = storiesBySection[safePageIndex - 1];
  const currentSectionGroup = storiesBySection[safePageIndex];
  const nextSectionGroup = storiesBySection[safePageIndex + 1];

  return (
    <div className="mx-auto max-w-[1120px] pt-4">
      <div className="relative" style={{ height: "clamp(480px, 74vh, 780px)" }}>
        {canGoNext && (
          <div
            aria-hidden
            className="absolute inset-y-1 -right-1.5 w-3 rounded-r-md border border-rule bg-card"
          />
        )}
        {canGoPrev && (
          <div
            aria-hidden
            className="absolute inset-y-1 -left-1.5 w-3 rounded-l-md border border-rule bg-card"
          />
        )}

        <div
          ref={containerRef}
          role="region"
          aria-roledescription="newspaper page"
          aria-label={`${currentSectionGroup?.section ?? ""} — page ${
            safePageIndex + 1
          } of ${totalPages}`}
          className="absolute inset-0 cursor-grab select-none overflow-hidden rounded border border-rule bg-paper active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
        >
          {nextSectionGroup && (
            <div
              key={nextSectionGroup.section}
              className="absolute inset-0 bg-paper"
              style={{ zIndex: 1, backgroundImage: PAPER_TEXTURE }}
            >
              <NewspaperPageContent
                sectionName={nextSectionGroup.section}
                sectionStories={nextSectionGroup.stories}
                onSelectStory={onSelectStory}
              />
            </div>
          )}

          {currentSectionGroup && (
            <div
              key={currentSectionGroup.section}
              ref={currentPageLayerRef}
              className="absolute inset-0 bg-paper"
              style={{
                zIndex: 3,
                backgroundImage: PAPER_TEXTURE,
                willChange: "clip-path",
              }}
            >
              <NewspaperPageContent
                sectionName={currentSectionGroup.section}
                sectionStories={currentSectionGroup.stories}
                onSelectStory={onSelectStory}
              />
            </div>
          )}

          {previousSectionGroup && (
            <div
              key={previousSectionGroup.section}
              ref={previousPageLayerRef}
              className="absolute inset-0 bg-paper"
              style={{
                zIndex: 4,
                visibility:
                  activePeelDirection === "prev" ? "visible" : "hidden",
                backgroundImage: PAPER_TEXTURE,
                willChange: "clip-path",
              }}
            >
              <NewspaperPageContent
                sectionName={previousSectionGroup.section}
                sectionStories={previousSectionGroup.stories}
                onSelectStory={onSelectStory}
              />
            </div>
          )}

          {activePeelDirection !== null && (
            <div
              ref={foldWrapperRef}
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 6, opacity: 0 }}
            >
              <div
                ref={foldSurfaceRef}
                className="absolute inset-0"
                style={{
                  backgroundImage: `${PAPER_TEXTURE}, ${
                    activePeelDirection === "next"
                      ? FOLD_GRADIENT_NEXT
                      : FOLD_GRADIENT_PREV
                  }`,
                }}
              />
            </div>
          )}

          {activePeelDirection === null && canGoNext && (
            <div
              aria-hidden
              className="absolute right-0 top-0"
              style={{
                zIndex: 5,
                width: 34,
                height: 34,
                clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                background:
                  "linear-gradient(225deg, #2b261b 0%, #1a1710 45%, rgba(0,0,0,0) 46%)",
              }}
            />
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] italic text-muted/50">
        Drag a corner to turn the page &middot; Arrow keys &larr; &rarr;
      </p>
    </div>
  );
}
