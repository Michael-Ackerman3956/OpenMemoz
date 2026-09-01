"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface HeroStoryProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function HeroStory({ story, onSelectStory }: HeroStoryProps) {
  const hasHeroImage = Boolean(story.imageUrl);

  return (
    <article
      className="cursor-pointer border-b-2 border-rule"
      onClick={() => onSelectStory(story)}
    >
      <div
        className={
          hasHeroImage
            ? "grid min-h-[280px] md:grid-cols-[3fr_2fr]"
            : "grid"
        }
      >
        <div
          className={`flex flex-col justify-end p-4 md:p-5 ${
            hasHeroImage ? "border-rule md:border-r" : "mx-auto max-w-[820px] text-center"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
            {story.section}
          </p>
          <h2
            className={`mt-1 font-serif font-black leading-[1.08] ${
              hasHeroImage
                ? "text-3xl md:text-4xl lg:text-[36px]"
                : "text-3xl md:text-[44px] md:leading-[1.05]"
            }`}
          >
            {story.headline}
          </h2>
          <p className="mt-1.5 font-body text-[15px] italic leading-relaxed text-muted">
            {story.excerpt}
          </p>
          <div
            className={`mt-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-muted ${
              hasHeroImage ? "" : "justify-center"
            }`}
          >
            <ProvenanceBadge provenanceTier={story.provenanceTier} />
            <span className="text-ink">{story.sourceName}</span>
          </div>
        </div>
        {hasHeroImage && (
          <div
            className="hidden min-h-[280px] bg-card bg-cover bg-center md:block"
            style={{ backgroundImage: `url(${story.imageUrl})` }}
          />
        )}
      </div>
    </article>
  );
}
