"use client";

import type { Story } from "@/lib/types";
import { StoryOverflowMenu } from "./StoryOverflowMenu";

interface BriefCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
  onToggleFavourite?: (storyIdentifier: string) => void;
}

export function BriefCard({ story, onSelectStory, onToggleFavourite }: BriefCardProps) {
  return (
    <article
      className="relative cursor-pointer bg-paper px-2.5 py-2 transition-colors hover:bg-card/60"
      onClick={() => onSelectStory(story)}
    >
      <div className="absolute right-0.5 top-0.5 z-10 rounded-md bg-paper/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <StoryOverflowMenu story={story} onToggleFavourite={onToggleFavourite} compact />
      </div>
      <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
        {story.section}
      </p>
      <h4 className="mt-0.5 pr-6 font-serif text-[13px] font-bold leading-[1.15]">
        {story.headline}
      </h4>
    </article>
  );
}
