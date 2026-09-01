"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  computeCornerPathPoint,
  computeFoldFrame,
  restCornerForDirection,
  type FlipDirection,
  type FoldFrame,
} from "@/lib/foldGeometry";

interface EditionPeelProps {
  /** Changes (e.g. edition date) trigger the peel from old to new children */
  peelKey: string;
  direction: FlipDirection;
  children: ReactNode;
}

interface PeelTransitionState {
  outgoingContent: ReactNode;
  direction: FlipDirection;
}

const FLIP_DURATION_MS = 950;
const PAPER_TEXTURE =
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 3px)";
const FLAP_BACKSIDE_GRADIENT =
  "linear-gradient(120deg, #292317 0%, #1d1912 45%, #131009 100%)";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function EditionPeel({ peelKey, direction, children }: EditionPeelProps) {
  const [peelTransition, setPeelTransition] =
    useState<PeelTransitionState | null>(null);
  const [stageHeight, setStageHeight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const frontLayerRef = useRef<HTMLDivElement>(null);
  const revealShadowWrapperRef = useRef<HTMLDivElement>(null);
  const revealShadowStripRef = useRef<HTMLDivElement>(null);
  const foldWrapperRef = useRef<HTMLDivElement>(null);
  const foldMirroredContentRef = useRef<HTMLDivElement>(null);
  const foldShadowStripRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef(0);

  const previousKeyRef = useRef(peelKey);
  const previousChildrenRef = useRef(children);

  // Render-phase capture: when the key flips, snapshot the outgoing content
  if (peelKey !== previousKeyRef.current) {
    previousKeyRef.current = peelKey;
    setPeelTransition({
      outgoingContent: previousChildrenRef.current,
      direction,
    });
  }
  useEffect(() => {
    previousChildrenRef.current = children;
  });

  useLayoutEffect(() => {
    if (!peelTransition) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const container = containerRef.current;
    if (!container || prefersReducedMotion) {
      setPeelTransition(null);
      return;
    }

    window.scrollTo(0, 0);
    const containerRect = container.getBoundingClientRect();
    const pageWidth = containerRect.width;
    const pageHeight = Math.max(
      320,
      window.innerHeight - Math.max(0, containerRect.top)
    );
    if (pageWidth < 10) {
      setPeelTransition(null);
      return;
    }
    setStageHeight(pageHeight);

    const flipDirection = peelTransition.direction;
    const restCorner = restCornerForDirection(
      flipDirection,
      pageWidth,
      pageHeight
    );

    const applyFoldFrame = (frame: FoldFrame, progress: number) => {
      const frontLayer = frontLayerRef.current;
      const revealWrapper = revealShadowWrapperRef.current;
      const revealStrip = revealShadowStripRef.current;
      const foldWrapper = foldWrapperRef.current;
      const foldMirroredContent = foldMirroredContentRef.current;
      const foldStrip = foldShadowStripRef.current;
      if (
        !frontLayer ||
        !revealWrapper ||
        !revealStrip ||
        !foldWrapper ||
        !foldMirroredContent ||
        !foldStrip
      )
        return;

      frontLayer.style.clipPath = frame.frontClipPath;

      if (frame.isDegenerate) {
        foldWrapper.style.opacity = "0";
        revealWrapper.style.opacity = "0";
        return;
      }

      foldWrapper.style.opacity = "1";
      foldWrapper.style.clipPath = frame.foldClipPath;
      foldMirroredContent.style.transform = frame.foldReflectionTransform;

      const anchor = frame.creaseAnchor;
      const halfStrip = frame.creaseStripLength / 2;

      revealWrapper.style.opacity = "1";
      revealWrapper.style.clipPath = frame.revealClipPath;
      revealStrip.style.transform =
        `translate(${anchor.x}px, ${anchor.y}px) ` +
        `rotate(${frame.revealShadowRotationRad}rad) translate(0px, ${-halfStrip}px)`;
      revealStrip.style.width = `${frame.shadowWidth}px`;
      revealStrip.style.height = `${frame.creaseStripLength}px`;
      revealStrip.style.background = `linear-gradient(to right, rgba(0,0,0,${frame.shadowOpacity.toFixed(
        3
      )}), rgba(0,0,0,0))`;

      // turn.js white crease highlight + StPageFlip dark-dip-dark curvature band
      foldStrip.style.transform =
        `translate(${anchor.x}px, ${anchor.y}px) ` +
        `rotate(${frame.foldShadowRotationRad}rad) translate(0px, ${-halfStrip}px)`;
      foldStrip.style.width = `${Math.max(
        24,
        0.75 * frame.shadowWidth
      )}px`;
      foldStrip.style.height = `${frame.creaseStripLength}px`;
      foldStrip.style.background =
        `linear-gradient(to right, rgba(255,255,255,${(
          0.2 *
          (1 - progress)
        ).toFixed(3)}) 0%, rgba(0,0,0,${frame.shadowOpacity.toFixed(
          3
        )}) 6%, rgba(0,0,0,0.05) 16%, rgba(0,0,0,${(
          frame.shadowOpacity * 0.7
        ).toFixed(3)}) 36%, rgba(0,0,0,0) 100%)`;
    };

    const startTime = performance.now();
    const step = (now: number) => {
      const linearProgress = Math.min(
        1,
        (now - startTime) / FLIP_DURATION_MS
      );
      const easedProgress = easeInOutCubic(linearProgress);
      const cornerPoint = computeCornerPathPoint(
        flipDirection,
        easedProgress,
        pageWidth,
        pageHeight
      );
      applyFoldFrame(
        computeFoldFrame(
          cornerPoint,
          restCorner,
          pageWidth,
          pageHeight,
          easedProgress
        ),
        easedProgress
      );
      if (linearProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setPeelTransition(null);
        setStageHeight(null);
      }
    };

    applyFoldFrame(
      computeFoldFrame(
        computeCornerPathPoint(flipDirection, 0, pageWidth, pageHeight),
        restCorner,
        pageWidth,
        pageHeight,
        0
      ),
      0
    );
    animationFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [peelTransition]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={
        peelTransition && stageHeight
          ? { height: stageHeight, overflow: "hidden" }
          : undefined
      }
    >
      {/* Incoming edition — stays mounted in normal flow, no remount on finish */}
      <div>{children}</div>

      {peelTransition && (
        <>
          {/* Drop shadow on the revealed (incoming) region */}
          <div
            ref={revealShadowWrapperRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 2, opacity: 0 }}
          >
            <div
              ref={revealShadowStripRef}
              className="absolute left-0 top-0"
              style={{ transformOrigin: "0 0" }}
            />
          </div>

          {/* Outgoing page, clipped to what has not peeled yet */}
          <div
            ref={frontLayerRef}
            className="absolute inset-0 overflow-hidden bg-paper"
            style={{
              zIndex: 3,
              backgroundImage: PAPER_TEXTURE,
              willChange: "clip-path",
            }}
          >
            {peelTransition.outgoingContent}
          </div>

          {/* Folded-over flap: paper backside + mirrored ink show-through */}
          <div
            ref={foldWrapperRef}
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ zIndex: 4, opacity: 0, willChange: "clip-path" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `${PAPER_TEXTURE}, ${FLAP_BACKSIDE_GRADIENT}`,
              }}
            />
            <div
              ref={foldMirroredContentRef}
              className="absolute inset-0 opacity-[0.16]"
              style={{ willChange: "transform" }}
            >
              {peelTransition.outgoingContent}
            </div>
            <div
              ref={foldShadowStripRef}
              className="absolute left-0 top-0"
              style={{ transformOrigin: "0 0" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
