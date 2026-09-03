import type { Story } from "./types";

export type LayoutMode = "dynamic" | "simple";

// Dynamic: editorial bento grid (hero + 3-col + section bar + briefs)
export interface DynamicLayout {
  mode: "dynamic";
  heroStory: Story | null;
  leftColumnStories: Story[];
  middleColumnStories: Story[];
  rightColumnStories: Story[];
  briefStripStories: Story[];
}

// Simple: vertical feed (hero card + story list)
export interface SimpleLayout {
  mode: "simple";
  heroStory: Story | null;
  feedStories: Story[];
}

export type EditionLayout = DynamicLayout | SimpleLayout;

export function computeLayout(
  stories: Story[],
  layoutMode: LayoutMode
): EditionLayout {
  if (layoutMode === "simple") return computeSimpleLayout(stories);
  return computeDynamicLayout(stories);
}

/* ------------------------------------------------------------------ */
/* Content-aware height model                                          */
/*                                                                     */
/* Approximates each story card's rendered height in abstract "line   */
/* units" from its actual text, per column type (columns differ in    */
/* width and headline size). Same idea Masonry/Packery use: place     */
/* each item in the currently-shortest column.                        */
/* ------------------------------------------------------------------ */

type ColumnKind = "side" | "middle";

// chars per rendered line, tuned to the real card typography:
// side cols ~296px @ 16px serif headline / 13px body excerpt,
// middle col ~458px @ 19px serif headline / 13px body excerpt.
const HEADLINE_CHARS_PER_LINE: Record<ColumnKind, number> = {
  side: 30,
  middle: 42,
};
const EXCERPT_CHARS_PER_LINE: Record<ColumnKind, number> = {
  side: 44,
  middle: 68,
};
const EXCERPT_MAX_LINES = 3; // cards use line-clamp-3
const HEADLINE_LINE_WEIGHT = 1.6; // serif headline lines are taller
const CARD_CHROME_LINES = 2.2; // section tag + badge row + paddings
// a 16:9 image spans the column width; in line units per column type
const IMAGE_HEIGHT_LINES: Record<ColumnKind, number> = {
  side: 7.5,
  middle: 11.5,
};

function estimateStoryCardHeight(
  story: Story,
  columnKind: ColumnKind
): number {
  const headlineLines = Math.ceil(
    story.headline.length / HEADLINE_CHARS_PER_LINE[columnKind]
  );
  const excerptLines = Math.min(
    EXCERPT_MAX_LINES,
    Math.ceil(story.excerpt.length / EXCERPT_CHARS_PER_LINE[columnKind])
  );
  const imageLines = story.imageUrl ? IMAGE_HEIGHT_LINES[columnKind] : 0;
  return (
    headlineLines * HEADLINE_LINE_WEIGHT +
    excerptLines +
    imageLines +
    CARD_CHROME_LINES
  );
}

/* ------------------------------------------------------------------ */
/* Hero selection                                                      */
/* ------------------------------------------------------------------ */

function scoreHeroCandidate(story: Story, editionOrderIndex: number): number {
  if (story.isHeroPinned) return 100; // agent-pinned hero always wins
  let score = 0;
  if (story.imageUrl) score += 3;
  if (story.provenanceTier === 1) score += 2;
  if (story.excerpt.length >= 160) score += 1;
  if (editionOrderIndex === 0) score += 1;
  return score;
}

function pickHeroStory(stories: Story[]): Story {
  let bestStory = stories[0];
  let bestScore = -1;
  stories.forEach((story, index) => {
    const score = scoreHeroCandidate(story, index);
    if (score > bestScore) {
      bestScore = score;
      bestStory = story;
    }
  });
  return bestStory;
}

/* ------------------------------------------------------------------ */
/* Brief strip: the shortest stories make the best compact briefs      */
/* ------------------------------------------------------------------ */

function splitBriefStripStories(stories: Story[]): {
  columnStories: Story[];
  briefStripStories: Story[];
} {
  if (stories.length < 7) {
    return { columnStories: stories, briefStripStories: [] };
  }
  const briefCount = Math.min(4, stories.length - 6);
  const shortestFirst = [...stories].sort(
    (a, b) =>
      a.headline.length +
      a.excerpt.length -
      (b.headline.length + b.excerpt.length)
  );
  const briefSet = new Set(
    shortestFirst.slice(0, briefCount).map((s) => s.storyIdentifier)
  );
  return {
    columnStories: stories.filter(
      (s) => !briefSet.has(s.storyIdentifier)
    ),
    briefStripStories: stories.filter((s) =>
      briefSet.has(s.storyIdentifier)
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Column packing: masonry shortest-column placement with a same-      */
/* section adjacency penalty, preserving editorial order per column    */
/* ------------------------------------------------------------------ */

const SAME_SECTION_ADJACENCY_PENALTY = 1.2;

interface PackedColumn {
  kind: ColumnKind;
  stories: Story[];
  height: number;
}

function packStoriesIntoColumns(columnStories: Story[]): {
  leftColumnStories: Story[];
  middleColumnStories: Story[];
  rightColumnStories: Story[];
} {
  const columns: PackedColumn[] = [
    { kind: "side", stories: [], height: 0 },
    { kind: "middle", stories: [], height: 0 },
    { kind: "side", stories: [], height: 0 },
  ];

  for (const story of columnStories) {
    let bestColumn = columns[0];
    let bestCost = Number.POSITIVE_INFINITY;
    for (const column of columns) {
      const lastStory = column.stories[column.stories.length - 1];
      const adjacencyPenalty =
        lastStory && lastStory.section === story.section
          ? SAME_SECTION_ADJACENCY_PENALTY
          : 0;
      const cost = column.height + adjacencyPenalty;
      if (cost < bestCost) {
        bestCost = cost;
        bestColumn = column;
      }
    }
    bestColumn.stories.push(story);
    bestColumn.height += estimateStoryCardHeight(story, bestColumn.kind);
  }

  return {
    leftColumnStories: columns[0].stories,
    middleColumnStories: columns[1].stories,
    rightColumnStories: columns[2].stories,
  };
}

/* ------------------------------------------------------------------ */

function computeDynamicLayout(stories: Story[]): DynamicLayout {
  const empty: DynamicLayout = {
    mode: "dynamic",
    heroStory: null,
    leftColumnStories: [],
    middleColumnStories: [],
    rightColumnStories: [],
    briefStripStories: [],
  };

  if (stories.length === 0) return empty;

  const heroStory = pickHeroStory(stories);
  const rest = stories.filter(
    (s) => s.storyIdentifier !== heroStory.storyIdentifier
  );

  if (rest.length <= 2) {
    return { ...empty, heroStory, middleColumnStories: rest };
  }

  const { columnStories, briefStripStories } = splitBriefStripStories(rest);
  return {
    mode: "dynamic",
    heroStory,
    ...packStoriesIntoColumns(columnStories),
    briefStripStories,
  };
}

function computeSimpleLayout(stories: Story[]): SimpleLayout {
  if (stories.length === 0) {
    return { mode: "simple", heroStory: null, feedStories: [] };
  }

  const [heroStory, ...feedStories] = stories;
  return { mode: "simple", heroStory, feedStories };
}
