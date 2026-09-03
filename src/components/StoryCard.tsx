"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  isMiddleColumn?: boolean;
  isFirstInColumn?: boolean;
}

function getStoryThumbnailUrl(story: Story): string | null {
  if (story.imageUrl) return story.imageUrl;
  if (story.youtubeVideoId) return `https://img.youtube.com/vi/${story.youtubeVideoId}/mqdefault.jpg`;
  return null;
}

export function StoryCard({
  story,
  onSelectStory,
  isMiddleColumn,
  isFirstInColumn,
}: StoryCardProps) {
  const thumbnailUrl = getStoryThumbnailUrl(story);

  // First card in middle column: large feature treatment
  // First card in side columns: full-width image on top
  // Other cards with images: small thumbnail on the left
  const isFeatureCard = isMiddleColumn && isFirstInColumn;
  const showTopImage = thumbnailUrl && (isFeatureCard || (isFirstInColumn && !isMiddleColumn));
  const showInlineThumbnail = thumbnailUrl && !showTopImage;

  return (
    <article className={`story-card cursor-pointer border-b border-rule transition-colors hover:bg-card/40 ${
      isFeatureCard ? "py-4" : "py-2.5"
    }`}>
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="block w-full text-left"
      >
        {showTopImage && (
          <div
            className={`mb-2 w-full rounded-sm bg-card bg-cover bg-center ${
              isFeatureCard ? "aspect-[16/10]" : "aspect-[16/9]"
            }`}
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        )}
        <div className={showInlineThumbnail ? "flex gap-3" : ""}>
          {showInlineThumbnail && (
            <div
              className="h-[60px] w-[80px] flex-shrink-0 rounded-sm bg-card bg-cover bg-center"
              style={{ backgroundImage: `url(${thumbnailUrl})` }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
              {story.section}
            </p>
            <h3
              className={`mt-0.5 font-serif font-bold leading-[1.2] ${
                isFeatureCard
                  ? "text-[22px]"
                  : isMiddleColumn
                    ? "text-[19px]"
                    : isFirstInColumn
                      ? "text-[17px]"
                      : "text-base"
              }`}
            >
              {story.isFavourite && <span className="mr-1 text-amber">&#9733;</span>}
              {story.headline}
            </h3>
            <p className={`mt-1 font-body text-[13px] leading-relaxed text-muted ${
              isFeatureCard ? "line-clamp-4" : showInlineThumbnail ? "hidden" : "line-clamp-3"
            }`}>
              {story.excerpt}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
              <ProvenanceBadge provenanceTier={story.provenanceTier} />
              <span>{story.sourceName}</span>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
