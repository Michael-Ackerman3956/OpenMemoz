"use client";

import {
  forwardRef,
  useCallback,
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
}

type FlipDirection = "next" | "prev";

const FLIP_DURATION_MILLISECONDS = 700;

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
  const [flipState, setFlipState] = useState<{
    isFlipping: boolean;
    direction: FlipDirection;
    targetIndex: number;
  }>({ isFlipping: false, direction: "next", targetIndex: -1 });

  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFlipAnimation = useCallback(
    (targetIndex: number) => {
      if (flipState.isFlipping) return;
      if (targetIndex < 0 || targetIndex >= allEditions.length) return;
      if (targetIndex === currentEditionIndex) return;

      const direction: FlipDirection =
        targetIndex > currentEditionIndex ? "next" : "prev";

      setFlipState({ isFlipping: true, direction, targetIndex });

      flipTimeoutRef.current = setTimeout(() => {
        onEditionChangeComplete(targetIndex);
        setFlipState({ isFlipping: false, direction: "next", targetIndex: -1 });
        flipTimeoutRef.current = null;
      }, FLIP_DURATION_MILLISECONDS);
    },
    [
      flipState.isFlipping,
      allEditions.length,
      currentEditionIndex,
      onEditionChangeComplete,
    ]
  );

  useImperativeHandle(ref, () => ({
    flipToEdition: startFlipAnimation,
  }));

  const currentEdition = allEditions[currentEditionIndex];
  const targetEdition = flipState.isFlipping
    ? allEditions[flipState.targetIndex]
    : null;

  if (!currentEdition) return null;

  const flipRotation =
    flipState.direction === "next" ? "-rotateY(90deg)" : "rotateY(90deg)";

  return (
    <div
      className="relative mx-auto max-w-[1120px]"
      style={{ perspective: "2000px" }}
    >
      {targetEdition && (
        <div className="absolute inset-0 z-0">
          <EditionSheet
            edition={targetEdition}
            activeSectionFilter={activeSectionFilter}
            layoutMode={layoutMode}
            onSelectStory={onSelectStory}
          />
        </div>
      )}

      <div
        className="relative z-10"
        style={{
          transformOrigin:
            flipState.direction === "next" ? "left center" : "right center",
          transform: flipState.isFlipping ? flipRotation : "none",
          transition: flipState.isFlipping
            ? `transform ${FLIP_DURATION_MILLISECONDS}ms cubic-bezier(0.4, 0.0, 0.2, 1)`
            : "none",
          backfaceVisibility: "hidden",
        }}
      >
        {flipState.isFlipping && (
          <div
            className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent via-black/10 to-black/30"
            style={{
              opacity: 1,
              transition: `opacity ${FLIP_DURATION_MILLISECONDS}ms ease`,
            }}
          />
        )}
        <EditionSheet
          edition={currentEdition}
          activeSectionFilter={activeSectionFilter}
          layoutMode={layoutMode}
          onSelectStory={onSelectStory}
        />
      </div>
    </div>
  );
});
