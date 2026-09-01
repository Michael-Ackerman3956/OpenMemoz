"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface HeroStoryProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function HeroStory({ story, onSelectStory }: HeroStoryProps) {
  return (
    <article
      className="cursor-pointer border-b-2 border-rule"
      onClick={() => onSelectStory(story)}
    >
      <div className="grid min-h-[280px] md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col justify-end border-rule p-4 md:border-r md:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
            {story.section}
          </p>
          <h2 className="mt-1 font-serif text-3xl font-black leading-[1.08] md:text-4xl lg:text-[36px]">
            {story.headline}
          </h2>
          <p className="mt-1.5 font-body text-[15px] italic leading-relaxed text-muted">
            {story.excerpt}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-muted">
            <ProvenanceBadge provenanceTier={story.provenanceTier} />
            <span className="text-ink">{story.sourceName}</span>
          </div>
        </div>
        <div
          className="hidden min-h-[280px] bg-card bg-cover bg-center md:block"
          style={
            story.imageUrl
              ? { backgroundImage: `url(${story.imageUrl})` }
              : undefined
          }
        />
      </div>
    </article>
  );
}
