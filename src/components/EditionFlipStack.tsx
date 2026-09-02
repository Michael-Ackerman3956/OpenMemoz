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
}

type FlipDirection = "next" | "prev";

const FLIP_DURATION_MILLISECONDS = 800;
const ANIMATION_FRAMES = 60;

function computeClipPathForFlipProgress(
  progress: number,
  direction: FlipDirection
): string {
  const foldDiagonalSkew = 8;

  if (direction === "next") {
    const foldLineX = 100 - progress * 100;
    const topX = Math.max(0, foldLineX - foldDiagonalSkew);
    const bottomX = Math.max(0, foldLineX + foldDiagonalSkew);
    return `polygon(0% 0%, ${topX}% 0%, ${bottomX}% 100%, 0% 100%)`;
  }

  const foldLineX = progress * 100;
  const topX = Math.min(100, foldLineX + foldDiagonalSkew);
  const bottomX = Math.min(100, foldLineX - foldDiagonalSkew);
  return `polygon(${topX}% 0%, 100% 0%, 100% 100%, ${bottomX}% 100%)`;
}

function computeFoldShadowStyle(
  progress: number,
  direction: FlipDirection
): React.CSSProperties {
  const shadowIntensity = Math.sin(progress * Math.PI) * 0.35;
  const foldDiagonalSkew = 8;

  if (direction === "next") {
    const foldLineX = 100 - progress * 100;
    const shadowCenterX = Math.max(0, foldLineX - foldDiagonalSkew / 2);
    return {
      background: `linear-gradient(to right,
        transparent ${shadowCenterX - 6}%,
        rgba(0,0,0,${shadowIntensity * 0.8}) ${shadowCenterX - 2}%,
        rgba(0,0,0,${shadowIntensity}) ${shadowCenterX}%,
        rgba(0,0,0,${shadowIntensity * 0.6}) ${shadowCenterX + 3}%,
        transparent ${shadowCenterX + 8}%)`,
    };
  }

  const foldLineX = progress * 100;
  const shadowCenterX = Math.min(100, foldLineX + foldDiagonalSkew / 2);
  return {
    background: `linear-gradient(to left,
      transparent ${100 - shadowCenterX - 8}%,
      rgba(0,0,0,${shadowIntensity * 0.6}) ${100 - shadowCenterX - 3}%,
      rgba(0,0,0,${shadowIntensity}) ${100 - shadowCenterX}%,
      rgba(0,0,0,${shadowIntensity * 0.8}) ${100 - shadowCenterX + 2}%,
      transparent ${100 - shadowCenterX + 6}%)`,
  };
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
  },
  ref
) {
  const [flipState, setFlipState] = useState<{
    isFlipping: boolean;
    direction: FlipDirection;
    targetIndex: number;
  }>({ isFlipping: false, direction: "next", targetIndex: -1 });

  const [flipProgress, setFlipProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const flipStartTimeRef = useRef(0);

  const animateFlip = useCallback(() => {
    const elapsed = performance.now() - flipStartTimeRef.current;
    const rawProgress = Math.min(1, elapsed / FLIP_DURATION_MILLISECONDS);
    const easedProgress =
      rawProgress < 0.5
        ? 4 * rawProgress * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

    setFlipProgress(easedProgress);

    if (rawProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(animateFlip);
    }
  }, []);

  const startFlipAnimation = useCallback(
    (targetIndex: number) => {
      if (flipState.isFlipping) return;
      if (targetIndex < 0 || targetIndex >= allEditions.length) return;
      if (targetIndex === currentEditionIndex) return;

      const direction: FlipDirection =
        targetIndex > currentEditionIndex ? "next" : "prev";

      setFlipState({ isFlipping: true, direction, targetIndex });
      setFlipProgress(0);
      flipStartTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animateFlip);

      setTimeout(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        onEditionChangeComplete(targetIndex);
        setFlipState({ isFlipping: false, direction: "next", targetIndex: -1 });
        setFlipProgress(0);
      }, FLIP_DURATION_MILLISECONDS + 50);
    },
    [
      flipState.isFlipping,
      allEditions.length,
      currentEditionIndex,
      onEditionChangeComplete,
      animateFlip,
    ]
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    flipToEdition: startFlipAnimation,
  }));

  const currentEdition = allEditions[currentEditionIndex];
  const targetEdition = flipState.isFlipping
    ? allEditions[flipState.targetIndex]
    : null;

  if (!currentEdition) return null;

  const clipPath = flipState.isFlipping
    ? computeClipPathForFlipProgress(flipProgress, flipState.direction)
    : undefined;

  const foldShadowStyle = flipState.isFlipping
    ? computeFoldShadowStyle(flipProgress, flipState.direction)
    : undefined;

  return (
    <div className="relative mx-auto max-w-[1120px] overflow-hidden">
      {targetEdition && (
        <div className="absolute inset-0 z-0">
          <EditionSheet
            edition={targetEdition}
            activeSectionFilter={activeSectionFilter}
            layoutMode={layoutMode}
            onSelectStory={onSelectStory}
          />
          {foldShadowStyle && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={foldShadowStyle}
            />
          )}
        </div>
      )}

      <div
        className="relative z-20 bg-paper"
        style={{
          clipPath: clipPath ?? "none",
          willChange: flipState.isFlipping ? "clip-path" : "auto",
        }}
      >
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
