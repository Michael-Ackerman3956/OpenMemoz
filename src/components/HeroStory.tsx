"use client";

import type { Story } from "@/lib/types";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface HeroStoryProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function HeroStory({ story, onSelectStory }: HeroStoryProps) {
  const hasImage = Boolean(story.imageUrl);
  const hasVideo = Boolean(story.youtubeVideoId);

  if (hasVideo) {
    return (
      <article
        className="hero-card group cursor-pointer border-b-2 border-rule"
        onClick={() => onSelectStory(story)}
      >
        <div className="grid gap-0 md:grid-cols-[5fr_4fr]">
          <div className="relative aspect-video w-full overflow-hidden bg-card md:aspect-auto md:min-h-[340px]">
            <iframe
              className="pointer-events-none absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${story.youtubeVideoId}?controls=0&mute=1&loop=1&playlist=${story.youtubeVideoId}`}
              title={story.headline}
              allow="accelerometer; autoplay; encrypted-media; gyroscope"
              tabIndex={-1}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-paper/80 via-paper/30 to-transparent md:hidden" />
          </div>
          <div className="flex flex-col justify-center px-5 py-5 md:px-8 md:py-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              {story.section}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-black leading-[1.08] md:text-3xl lg:text-[38px]">
              {story.headline}
            </h2>
            <p className="mt-3 font-body text-[15px] italic leading-relaxed text-muted line-clamp-4">
              {story.excerpt}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted">
              <ProvenanceBadge provenanceTier={story.provenanceTier} />
              <span className="text-ink">{story.sourceName}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (hasImage) {
    return (
      <article
        className="hero-card group relative cursor-pointer overflow-hidden border-b-2 border-rule"
        onClick={() => onSelectStory(story)}
      >
        <div className="grid min-h-[300px] md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col justify-end border-rule p-5 md:border-r md:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              {story.section}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-black leading-[1.08] md:text-4xl lg:text-[42px]">
              {story.headline}
            </h2>
            <p className="mt-3 font-body text-[15px] italic leading-relaxed text-muted line-clamp-4">
              {story.excerpt}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted">
              <ProvenanceBadge provenanceTier={story.provenanceTier} />
              <span className="text-ink">{story.sourceName}</span>
            </div>
          </div>
          <div
            className="hidden min-h-[300px] bg-card bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03] md:block"
            style={{ backgroundImage: `url(${story.imageUrl})` }}
          />
        </div>
      </article>
    );
  }

  return (
    <article
      className="hero-card cursor-pointer border-b-2 border-rule"
      onClick={() => onSelectStory(story)}
    >
      <div className="mx-auto max-w-[820px] px-5 py-10 text-center md:py-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          {story.section}
        </p>
        <h2 className="mt-3 font-serif text-3xl font-black leading-[1.06] md:text-[44px] md:leading-[1.05]">
          {story.headline}
        </h2>
        <p className="mt-4 font-body text-[15px] italic leading-relaxed text-muted">
          {story.excerpt}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] uppercase tracking-wide text-muted">
          <ProvenanceBadge provenanceTier={story.provenanceTier} />
          <span className="text-ink">{story.sourceName}</span>
        </div>
      </div>
    </article>
  );
}
