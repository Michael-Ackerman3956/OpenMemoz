"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  isMiddleColumn?: boolean;
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
}: StoryCardProps) {
  const thumbnailUrl = getStoryThumbnailUrl(story);
  const showInlineThumbnail = thumbnailUrl && !isMiddleColumn;
  const showTopImage = thumbnailUrl && isMiddleColumn;

  return (
    <article className="story-card cursor-pointer border-b border-rule py-2.5 transition-colors hover:bg-card/40">
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="block w-full text-left"
      >
        {showTopImage && (
          <div
            className="mb-1.5 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
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
                isMiddleColumn ? "text-[19px]" : "text-base"
              }`}
            >
              {story.headline}
            </h3>
            {!showInlineThumbnail && (
              <p className="mt-1 font-body text-[13px] leading-relaxed text-muted line-clamp-3">
                {story.excerpt}
              </p>
            )}
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
