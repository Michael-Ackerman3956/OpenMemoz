"use client";

import type { Story } from "@/lib/types";
import { StoryOverflowMenu } from "./StoryOverflowMenu";

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  onToggleFavourite?: (storyIdentifier: string) => void;
  onDeleteStory?: (storyIdentifier: string) => void;
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
  onToggleFavourite,
  onDeleteStory,
  isMiddleColumn,
  isFirstInColumn,
}: StoryCardProps) {
  const thumbnailUrl = getStoryThumbnailUrl(story);

  const isFeatureCard = isMiddleColumn && isFirstInColumn;
  const isYouTubeStory = Boolean(story.youtubeVideoId);
  const showTopImage = thumbnailUrl && (isFeatureCard || isFirstInColumn || isYouTubeStory);
  const showInlineThumbnail = thumbnailUrl && !showTopImage;

  return (
    <article className={`story-card relative cursor-pointer overflow-hidden border-b border-rule transition-colors hover:bg-card/40 ${
      isFeatureCard ? "py-4" : "py-2.5"
    }`}>
      <div className="absolute right-1 top-1 z-10 rounded-md bg-paper/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <StoryOverflowMenu story={story} onToggleFavourite={onToggleFavourite} onDeleteStory={onDeleteStory} compact />
      </div>
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="block w-full text-left"
      >
        {showTopImage && (
          <div
            className={`relative mb-2 w-full rounded-sm bg-card bg-cover bg-center ${
              isFeatureCard ? "aspect-[16/10]" : "aspect-[16/9]"
            }`}
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          >
            {isYouTubeStory && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-red-600/90 shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            )}
          </div>
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
              className={`mt-0.5 break-words font-serif font-bold leading-[1.2] ${
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
            {story.youtubeVideoId && (
              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
                <span>YouTube</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </article>
  );
}
