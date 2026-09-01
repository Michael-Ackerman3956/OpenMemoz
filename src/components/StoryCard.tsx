"use client";

import type { Story } from "@/lib/types";
import { formatShortDate } from "@/lib/formatDate";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function StoryCard({ story, onSelectStory }: StoryCardProps) {
  return (
    <article className="border-t border-rule">
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="group flex h-full w-full flex-col pt-5 text-left"
      >
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
          {story.section}
        </p>
        <h2 className="mt-2.5 font-serif text-xl font-bold leading-snug transition-colors group-hover:text-accent">
          {story.headline}
        </h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-muted line-clamp-3">
          {story.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-4 font-sans text-[11px] text-muted">
          <ProvenanceBadge provenanceTier={story.provenanceTier} />
          <span>{story.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={story.publishedAt}>
            {formatShortDate(story.publishedAt)}
          </time>
        </div>
      </button>
    </article>
  );
}
