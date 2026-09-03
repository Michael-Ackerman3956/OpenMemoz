import type { Story } from "./types";

export type LayoutMode = "dynamic" | "simple";

const SIDEBAR_STORY_COUNT = 2;
const BRIEF_STRIP_COLUMN_COUNT = 4;
const BELOW_FOLD_COLUMN_COUNT = 3;

export interface DynamicLayout {
  mode: "dynamic";
  heroStory: Story | null;
  sidebarStories: Story[];
  midRowStories: Story[];
  briefStripStories: Story[];
  videoFeatureStory: Story | null;
  belowFoldColumns: Story[][];
}

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

function hasThumbnail(story: Story): boolean {
  return Boolean(story.imageUrl || story.youtubeVideoId);
}

function scoreHeroCandidate(story: Story, editionOrderIndex: number): number {
  if (story.isHeroPinned) return 100;
  let score = 0;
  if (story.youtubeVideoId) score += 5;
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

interface StorySplit {
  taken: Story[];
  remaining: Story[];
}

function takeFirstMatching(
  pool: Story[],
  count: number,
  predicate: (story: Story) => boolean
): StorySplit {
  const taken: Story[] = [];
  const remaining: Story[] = [];
  for (const story of pool) {
    if (taken.length < count && predicate(story)) taken.push(story);
    else remaining.push(story);
  }
  return { taken, remaining };
}

// Text-only sidebar cards land near the hero's height; a thumbnail card overshoots it
function pickSidebarStories(pool: Story[]): StorySplit {
  const textOnly = takeFirstMatching(pool, SIDEBAR_STORY_COUNT, (s) => !hasThumbnail(s));
  if (textOnly.taken.length === SIDEBAR_STORY_COUNT) return textOnly;
  const topUp = takeFirstMatching(
    textOnly.remaining,
    SIDEBAR_STORY_COUNT - textOnly.taken.length,
    () => true
  );
  return { taken: [...textOnly.taken, ...topUp.taken], remaining: topUp.remaining };
}

// Uniform rows only: mixing thumbnail and text cards leaves dead space under the short ones
function pickMidRowStories(pool: Story[]): StorySplit {
  const target = Math.min(3, pool.length);
  const withThumbnails = takeFirstMatching(pool, target, hasThumbnail);
  if (withThumbnails.taken.length === target) return withThumbnails;
  const textOnly = takeFirstMatching(pool, target, (s) => !hasThumbnail(s));
  if (textOnly.taken.length === target) return textOnly;
  return takeFirstMatching(pool, target, () => true);
}

function scoreBriefCandidate(story: Story): number {
  const thumbnailPenalty = hasThumbnail(story) ? 10000 : 0;
  return thumbnailPenalty + story.headline.length + story.excerpt.length;
}

// Full rows only; a partial row leaves empty cells in the strip grid
function pickBriefStripStories(pool: Story[]): StorySplit {
  const briefRows = pool.length >= 16 ? 2 : pool.length >= 8 ? 1 : 0;
  const briefCount = briefRows * BRIEF_STRIP_COLUMN_COUNT;
  if (briefCount === 0) return { taken: [], remaining: pool };

  const briefIdentifiers = new Set(
    [...pool]
      .sort((a, b) => scoreBriefCandidate(a) - scoreBriefCandidate(b))
      .slice(0, briefCount)
      .map((s) => s.storyIdentifier)
  );
  return {
    taken: pool.filter((s) => briefIdentifiers.has(s.storyIdentifier)),
    remaining: pool.filter((s) => !briefIdentifiers.has(s.storyIdentifier)),
  };
}

function estimateBelowFoldCardHeight(story: Story): number {
  const thumbnailHeight = hasThumbnail(story) ? 190 : 0;
  const headlineLines = Math.ceil(story.headline.length / 34);
  const excerptLineCap = hasThumbnail(story) ? 3 : 4;
  const excerptLines = Math.min(excerptLineCap, Math.ceil(story.excerpt.length / 52));
  return thumbnailHeight + headlineLines * 20 + excerptLines * 21 + 44;
}

function distributeIntoBalancedColumns(stories: Story[]): Story[][] {
  if (stories.length === 0) return [];
  const columnCount = Math.min(BELOW_FOLD_COLUMN_COUNT, stories.length);
  const columns: Story[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights = new Array<number>(columnCount).fill(0);
  for (const story of stories) {
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestColumnIndex].push(story);
    columnHeights[shortestColumnIndex] += estimateBelowFoldCardHeight(story);
  }
  return columns;
}

function computeDynamicLayout(stories: Story[]): DynamicLayout {
  const empty: DynamicLayout = {
    mode: "dynamic",
    heroStory: null,
    sidebarStories: [],
    midRowStories: [],
    briefStripStories: [],
    videoFeatureStory: null,
    belowFoldColumns: [],
  };

  if (stories.length === 0) return empty;

  const heroStory = pickHeroStory(stories);
  const rest = stories.filter(
    (s) => s.storyIdentifier !== heroStory.storyIdentifier
  );

  if (rest.length <= 2) {
    return { ...empty, heroStory, midRowStories: rest };
  }

  const videoFeature = takeFirstMatching(rest, 1, (s) => Boolean(s.youtubeVideoId));
  const sidebar = pickSidebarStories(videoFeature.remaining);
  const midRow = pickMidRowStories(sidebar.remaining);
  const briefStrip = pickBriefStripStories(midRow.remaining);

  // Thumbnails first so they land at the top of each column
  const belowFoldOrdered = [
    ...briefStrip.remaining.filter(hasThumbnail),
    ...briefStrip.remaining.filter((s) => !hasThumbnail(s)),
  ];

  return {
    mode: "dynamic",
    heroStory,
    sidebarStories: sidebar.taken,
    midRowStories: midRow.taken,
    briefStripStories: briefStrip.taken,
    videoFeatureStory: videoFeature.taken[0] ?? null,
    belowFoldColumns: distributeIntoBalancedColumns(belowFoldOrdered),
  };
}

function computeSimpleLayout(stories: Story[]): SimpleLayout {
  if (stories.length === 0) {
    return { mode: "simple", heroStory: null, feedStories: [] };
  }

  const heroStory = pickHeroStory(stories);
  const feedStories = stories.filter(
    (s) => s.storyIdentifier !== heroStory.storyIdentifier
  );
  return { mode: "simple", heroStory, feedStories };
}
