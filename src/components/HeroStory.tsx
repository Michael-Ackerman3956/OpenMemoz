"use client";

import type { Story } from "@/lib/types";
import { formatShortDate } from "@/lib/formatDate";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface HeroStoryProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function HeroStory({ story, onSelectStory }: HeroStoryProps) {
  return (
    <article className="border-b border-rule">
      <button
        type="button"
        onClick={() => onSelectStory(story)}
        className="group block w-full py-10 text-left md:py-14"
      >
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          {story.section}
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight transition-colors group-hover:text-accent md:text-5xl lg:text-6xl">
          {story.headline}
        </h1>
        <p className="mt-5 max-w-2xl font-body text-lg leading-relaxed text-muted">
          {story.excerpt}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 font-sans text-xs text-muted">
          <ProvenanceBadge provenanceTier={story.provenanceTier} />
          <span className="text-ink">{story.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={story.publishedAt}>
            {formatShortDate(story.publishedAt)}
          </time>
        </div>
      </button>
    </article>
  );
}
