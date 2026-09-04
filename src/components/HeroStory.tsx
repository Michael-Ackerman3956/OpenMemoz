"use client";

import type { Story } from "@/lib/types";
import { StoryOverflowMenu } from "./StoryOverflowMenu";

interface HeroStoryProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  onToggleFavourite?: (storyIdentifier: string) => void;
  onDeleteStory?: (storyIdentifier: string) => void;
}

export function StoryByline({ story, className = "" }: { story: Story; className?: string }) {
  return (
    <p className={`text-[9px] uppercase tracking-[0.08em] text-muted ${className}`}>
      {story.sourceName}
    </p>
  );
}

export function HeroStory({ story, onSelectStory, onToggleFavourite, onDeleteStory }: HeroStoryProps) {
  const hasImage = Boolean(story.imageUrl);
  const hasVideo = Boolean(story.youtubeVideoId);

  if (hasVideo) {
    return (
      <article
        className="hero-card group relative cursor-pointer border-b-2 border-rule"
        onClick={() => onSelectStory(story)}
      >
        <div className="absolute right-2 top-2 z-10 rounded-md bg-paper/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <StoryOverflowMenu story={story} onToggleFavourite={onToggleFavourite} onDeleteStory={onDeleteStory} compact />
        </div>
        <div className="grid h-full gap-0 md:grid-cols-[5fr_4fr]">
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
          <div className="flex flex-col justify-center px-4 py-4 md:px-6 md:py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              {story.section}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-black leading-[1.08] md:text-3xl lg:text-[38px]">
              {story.headline}
            </h2>
            <p className="mt-3 font-body text-[15px] italic leading-normal text-muted line-clamp-5">
              {story.excerpt}
            </p>
            <StoryByline story={story} className="mt-3" />
          </div>
        </div>
      </article>
    );
  }

  if (hasImage) {
    return (
      <article
        className="hero-card group relative h-full cursor-pointer overflow-hidden border-b-2 border-rule"
        onClick={() => onSelectStory(story)}
      >
        <div className="absolute right-2 top-2 z-10 rounded-md bg-paper/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <StoryOverflowMenu story={story} onToggleFavourite={onToggleFavourite} onDeleteStory={onDeleteStory} compact />
        </div>
        <div className="grid h-full min-h-[300px] md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col border-rule p-4 md:border-r md:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              {story.section}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-black leading-[1.08] md:text-4xl lg:text-[42px]">
              {story.headline}
            </h2>
            <p className="mt-3 font-body text-[15px] italic leading-normal text-muted line-clamp-6">
              {story.excerpt}
            </p>
            <StoryByline story={story} className="mt-auto pt-3" />
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
      className="hero-card relative flex h-full cursor-pointer flex-col justify-center border-b-2 border-rule"
      onClick={() => onSelectStory(story)}
    >
      <div className="absolute right-2 top-2 z-10 rounded-md bg-paper/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <StoryOverflowMenu story={story} onToggleFavourite={onToggleFavourite} onDeleteStory={onDeleteStory} compact />
      </div>
      <div className="mx-auto max-w-[820px] px-5 py-8 text-center md:py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          {story.section}
        </p>
        <h2 className="mt-3 font-serif text-3xl font-black leading-[1.06] md:text-[44px] md:leading-[1.05]">
          {story.headline}
        </h2>
        <p className="mt-4 font-body text-[15px] italic leading-normal text-muted">
          {story.excerpt}
        </p>
        <StoryByline story={story} className="mt-3" />
      </div>
    </article>
  );
}
