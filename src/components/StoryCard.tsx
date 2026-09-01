"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  isMiddleColumn?: boolean;
}

export function StoryCard({
  story,
  onSelectStory,
  isMiddleColumn,
}: StoryCardProps) {
  return (
    <article className="cursor-pointer border-b border-rule py-2.5 transition-colors hover:bg-card/40">
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="block w-full text-left"
      >
        {story.imageUrl && (
          <div
            className="mb-1.5 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
            style={{ backgroundImage: `url(${story.imageUrl})` }}
          />
        )}
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
        <p className="mt-1 font-body text-[13px] leading-relaxed text-muted line-clamp-3">
          {story.excerpt}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
          <ProvenanceBadge provenanceTier={story.provenanceTier} />
          <span>{story.sourceName}</span>
        </div>
      </button>
    </article>
  );
}
