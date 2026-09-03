import type { Story } from "./types";

export type LayoutMode = "dynamic" | "simple";

export interface DynamicLayout {
  mode: "dynamic";
  heroStory: Story | null;
  sidebarStories: Story[];
  midRowStories: Story[];
  briefStripStories: Story[];
  videoFeatureStory: Story | null;
  belowFoldStories: Story[];
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

function computeDynamicLayout(stories: Story[]): DynamicLayout {
  const empty: DynamicLayout = {
    mode: "dynamic",
    heroStory: null,
    sidebarStories: [],
    midRowStories: [],
    briefStripStories: [],
    videoFeatureStory: null,
    belowFoldStories: [],
  };

  if (stories.length === 0) return empty;

  const heroStory = pickHeroStory(stories);
  const rest = stories.filter(
    (s) => s.storyIdentifier !== heroStory.storyIdentifier
  );

  if (rest.length <= 2) {
    return { ...empty, heroStory, midRowStories: rest };
  }

  // Pick first non-hero YouTube story as the video feature
  let videoFeatureStory: Story | null = null;
  const afterVideoFeature: Story[] = [];
  for (const story of rest) {
    if (!videoFeatureStory && story.youtubeVideoId) {
      videoFeatureStory = story;
    } else {
      afterVideoFeature.push(story);
    }
  }

  // Sidebar: 2 stories — prefer stories with images for visual weight
  const sidebarStories: Story[] = [];
  const afterSidebar: Story[] = [];
  for (const story of afterVideoFeature) {
    if (sidebarStories.length < 2 && (story.imageUrl || sidebarStories.length === 0)) {
      sidebarStories.push(story);
    } else {
      afterSidebar.push(story);
    }
  }

  // Mid-row: 2-3 stories — prefer stories with images or longer excerpts
  const midRowStories: Story[] = [];
  const afterMidRow: Story[] = [];
  const midRowTarget = Math.min(3, Math.max(2, Math.floor(afterSidebar.length / 3)));
  for (const story of afterSidebar) {
    if (midRowStories.length < midRowTarget) {
      midRowStories.push(story);
    } else {
      afterMidRow.push(story);
    }
  }

  // Brief strip: 3-4 shortest stories from remaining
  const briefCount = Math.min(4, Math.max(0, afterMidRow.length - 4));
  let briefStripStories: Story[] = [];
  let belowFoldStories: Story[] = [];

  if (briefCount > 0 && afterMidRow.length > 4) {
    const sortedByLength = [...afterMidRow].sort(
      (a, b) =>
        (a.headline.length + a.excerpt.length) -
        (b.headline.length + b.excerpt.length)
    );
    const briefSet = new Set(
      sortedByLength.slice(0, briefCount).map((s) => s.storyIdentifier)
    );
    briefStripStories = afterMidRow.filter((s) => briefSet.has(s.storyIdentifier));
    belowFoldStories = afterMidRow.filter((s) => !briefSet.has(s.storyIdentifier));
  } else {
    belowFoldStories = afterMidRow;
  }

  return {
    mode: "dynamic",
    heroStory,
    sidebarStories,
    midRowStories,
    briefStripStories,
    videoFeatureStory,
    belowFoldStories,
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
