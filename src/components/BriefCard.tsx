"use client";

import type { Story } from "@/lib/types";

interface BriefCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

export function BriefCard({ story, onSelectStory }: BriefCardProps) {
  return (
    <article
      className="cursor-pointer bg-paper px-2.5 py-2 transition-colors hover:bg-card/60"
      onClick={() => onSelectStory(story)}
    >
      <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
        {story.section}
      </p>
      <h4 className="mt-0.5 font-serif text-[13px] font-bold leading-[1.15]">
        {story.headline}
      </h4>
    </article>
  );
}
