/**
 * Real page-fold geometry, derived from StPageFlip's FlipCalculation and
 * turn.js's fold model:
 *
 * The fold is a REFLECTION of the page's rest corner onto the drag point.
 * The crease is the perpendicular bisector of [restCorner, dragPoint].
 * Everything else (clip regions, the folded flap, shadows) falls out of
 * clipping the page rectangle against that crease line.
 */

export interface Point {
  x: number;
  y: number;
}

export type FlipDirection = "next" | "prev";

export interface FoldFrame {
  /** Remaining (not yet peeled) region of the outgoing page */
  frontClipPath: string;
  /** Region where the incoming page is revealed — hosts the drop shadow */
  revealClipPath: string;
  /** Folded-over flap region (reflection of the peeled region) */
  foldClipPath: string;
  /** CSS transform chain that mirrors page content across the crease */
  foldReflectionTransform: string;
  creaseAnchor: Point;
  /** Strip rotation so local +x points away from the crease into the revealed side */
  revealShadowRotationRad: number;
  /** Strip rotation so local +x points away from the crease into the flap side */
  foldShadowRotationRad: number;
  creaseStripLength: number;
  shadowWidth: number;
  shadowOpacity: number;
  isDegenerate: boolean;
}

const DEGENERATE_DISTANCE_PX = 2;

function toClipPathPolygon(polygon: Point[]): string {
  if (polygon.length < 3) return "polygon(0px 0px, 0px 0px, 0px 0px)";
  return `polygon(${polygon
    .map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`)
    .join(", ")})`;
}

/** Sutherland–Hodgman against a single half-plane: keeps signedDistance <= 0 */
function clipPolygonToHalfPlane(
  polygon: Point[],
  signedDistance: (p: Point) => number
): Point[] {
  const clippedPolygon: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const dCurrent = signedDistance(current);
    const dNext = signedDistance(next);
    if (dCurrent <= 0) clippedPolygon.push(current);
    if ((dCurrent < 0 && dNext > 0) || (dCurrent > 0 && dNext < 0)) {
      const t = dCurrent / (dCurrent - dNext);
      clippedPolygon.push({
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t,
      });
    }
  }
  return clippedPolygon;
}

export function computeFoldFrame(
  dragPoint: Point,
  restCorner: Point,
  pageWidth: number,
  pageHeight: number,
  progress: number
): FoldFrame {
  const fullPageClip = `polygon(0px 0px, ${pageWidth}px 0px, ${pageWidth}px ${pageHeight}px, 0px ${pageHeight}px)`;
  const degenerateFrame: FoldFrame = {
    frontClipPath: fullPageClip,
    revealClipPath: "polygon(0px 0px, 0px 0px, 0px 0px)",
    foldClipPath: "polygon(0px 0px, 0px 0px, 0px 0px)",
    foldReflectionTransform: "none",
    creaseAnchor: restCorner,
    revealShadowRotationRad: 0,
    foldShadowRotationRad: 0,
    creaseStripLength: 0,
    shadowWidth: 0,
    shadowOpacity: 0,
    isDegenerate: true,
  };

  const normal = {
    x: dragPoint.x - restCorner.x,
    y: dragPoint.y - restCorner.y,
  };
  const normalLength = Math.hypot(normal.x, normal.y);
  if (normalLength < DEGENERATE_DISTANCE_PX) return degenerateFrame;

  const unitNormal = {
    x: normal.x / normalLength,
    y: normal.y / normalLength,
  };
  const creaseMidpoint = {
    x: (dragPoint.x + restCorner.x) / 2,
    y: (dragPoint.y + restCorner.y) / 2,
  };

  // > 0 on the drag-point (kept front) side, < 0 on the rest-corner (peeled) side
  const signedDistanceFromCrease = (p: Point) =>
    unitNormal.x * (p.x - creaseMidpoint.x) +
    unitNormal.y * (p.y - creaseMidpoint.y);

  const pageRectangle: Point[] = [
    { x: 0, y: 0 },
    { x: pageWidth, y: 0 },
    { x: pageWidth, y: pageHeight },
    { x: 0, y: pageHeight },
  ];

  const peeledRegion = clipPolygonToHalfPlane(
    pageRectangle,
    signedDistanceFromCrease
  );
  const frontRegion = clipPolygonToHalfPlane(pageRectangle, (p) =>
    -signedDistanceFromCrease(p)
  );

  const reflectAcrossCrease = (p: Point): Point => {
    const distance = signedDistanceFromCrease(p);
    return {
      x: p.x - 2 * distance * unitNormal.x,
      y: p.y - 2 * distance * unitNormal.y,
    };
  };
  const foldRegion = peeledRegion.map(reflectAcrossCrease);

  const creaseAngleRad = Math.atan2(unitNormal.x, -unitNormal.y);

  return {
    frontClipPath: toClipPathPolygon(frontRegion),
    revealClipPath: toClipPathPolygon(peeledRegion),
    foldClipPath: toClipPathPolygon(foldRegion),
    foldReflectionTransform:
      `translate(${creaseMidpoint.x.toFixed(2)}px, ${creaseMidpoint.y.toFixed(2)}px) ` +
      `rotate(${creaseAngleRad.toFixed(5)}rad) scaleY(-1) rotate(${(-creaseAngleRad).toFixed(5)}rad) ` +
      `translate(${(-creaseMidpoint.x).toFixed(2)}px, ${(-creaseMidpoint.y).toFixed(2)}px)`,
    creaseAnchor: creaseMidpoint,
    revealShadowRotationRad: Math.atan2(-unitNormal.y, -unitNormal.x),
    foldShadowRotationRad: Math.atan2(unitNormal.y, unitNormal.x),
    creaseStripLength: 2 * Math.hypot(pageWidth, pageHeight),
    // StPageFlip: width grows with progress, opacity fades toward completion
    shadowWidth: Math.min(0.75 * pageWidth * progress, 340),
    shadowOpacity: 0.5 * (1 - progress),
    isDegenerate: false,
  };
}

/* ------------------------------------------------------------------ */
/* Corner trajectory for the automatic flip (turn.js-style bezier arc) */
/* ------------------------------------------------------------------ */

export function restCornerForDirection(
  direction: FlipDirection,
  pageWidth: number,
  pageHeight: number
): Point {
  return direction === "next"
    ? { x: pageWidth, y: pageHeight }
    : { x: 0, y: pageHeight };
}

function quadraticBezierPoint(
  start: Point,
  control: Point,
  end: Point,
  t: number
): Point {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

/** Paper cannot stretch: keep the corner within reach of both spine anchors */
function clampToPaperStiffness(
  point: Point,
  direction: FlipDirection,
  pageWidth: number,
  pageHeight: number
): Point {
  const spineX = direction === "next" ? 0 : pageWidth;
  const constraints: { anchor: Point; radius: number }[] = [
    { anchor: { x: spineX, y: pageHeight }, radius: pageWidth },
    {
      anchor: { x: spineX, y: 0 },
      radius: Math.hypot(pageWidth, pageHeight),
    },
  ];
  let clamped = point;
  for (const { anchor, radius } of constraints) {
    const dx = clamped.x - anchor.x;
    const dy = clamped.y - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      const scale = radius / distance;
      clamped = { x: anchor.x + dx * scale, y: anchor.y + dy * scale };
    }
  }
  return clamped;
}

/**
 * Corner path: from the rest corner, arcing up through the page middle
 * (diagonal crease mid-flight), landing at the mirrored corner so the
 * crease finishes at the spine and the flap exits the page cleanly.
 */
export function computeCornerPathPoint(
  direction: FlipDirection,
  t: number,
  pageWidth: number,
  pageHeight: number
): Point {
  const mirrorX = (x: number) => (direction === "next" ? x : pageWidth - x);
  const start = { x: mirrorX(0.995 * pageWidth), y: 0.99 * pageHeight };
  const control = { x: mirrorX(0.05 * pageWidth), y: 0.45 * pageHeight };
  const end = { x: mirrorX(-0.995 * pageWidth), y: 0.99 * pageHeight };
  return clampToPaperStiffness(
    quadraticBezierPoint(start, control, end, t),
    direction,
    pageWidth,
    pageHeight
  );
}
