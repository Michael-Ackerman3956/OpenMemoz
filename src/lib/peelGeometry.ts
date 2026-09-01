export type PeelDirection = "next" | "prev";

type PolygonPoint = [number, number];

export interface PeelGeometry {
  pageClipPath: string;
  foldClipPath: string;
  foldIsVisible: boolean;
  shadowStrength: number;
}

function toClipPathString(points: PolygonPoint[]): string {
  const vertexList = points
    .map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`)
    .join(", ");
  return `polygon(${vertexList})`;
}

function mirrorHorizontally(points: PolygonPoint[]): PolygonPoint[] {
  return points.map(([x, y]) => [100 - x, y]);
}

// Crease line is x - y = c in percent space; c sweeps 100 -> -100 as the
// top-right corner peels toward the bottom-left corner. The fold polygon is
// the peeled region reflected across the crease: (x, y) -> (y + c, x - c).
export function computePeelGeometry(
  peelAmount: number,
  direction: PeelDirection
): PeelGeometry {
  const clampedPeelAmount = Math.min(1, Math.max(0, peelAmount));
  const c = 100 - 200 * clampedPeelAmount;

  let pagePoints: PolygonPoint[];
  let foldPoints: PolygonPoint[];

  if (c >= 0) {
    pagePoints = [
      [0, 0],
      [c, 0],
      [100, 100 - c],
      [100, 100],
      [0, 100],
    ];
    foldPoints = [
      [c, 0],
      [c, 100 - c],
      [100, 100 - c],
    ];
  } else {
    pagePoints = [
      [0, -c],
      [100 + c, 100],
      [0, 100],
    ];
    foldPoints = [
      [c, -c],
      [c, 100 - c],
      [100 + c, 100 - c],
      [100 + c, 100],
      [0, -c],
    ];
  }

  if (direction === "prev") {
    pagePoints = mirrorHorizontally(pagePoints);
    foldPoints = mirrorHorizontally(foldPoints);
  }

  return {
    pageClipPath: toClipPathString(pagePoints),
    foldClipPath: toClipPathString(foldPoints),
    foldIsVisible: clampedPeelAmount > 0.002 && clampedPeelAmount < 0.998,
    shadowStrength: Math.sin(Math.PI * clampedPeelAmount) * 0.9,
  };
}
