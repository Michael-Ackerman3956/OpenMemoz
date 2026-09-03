"use client";

import { useState, useRef, useEffect } from "react";
import type { Story } from "@/lib/types";

interface StoryOverflowMenuProps {
  story: Story;
  onToggleFavourite?: (storyIdentifier: string) => void;
  compact?: boolean;
}

function formatStoryAsMarkdown(story: Story): string {
  const lines = [
    `# ${story.headline}`,
    "",
    story.excerpt,
    "",
    `**Source:** ${story.sourceName}`,
  ];
  if (story.sourceUrl) lines.push(`**URL:** ${story.sourceUrl}`);
  if (story.youtubeVideoId) lines.push(`**Video:** https://www.youtube.com/watch?v=${story.youtubeVideoId}`);
  lines.push(`**Section:** ${story.section}`);
  lines.push(`**Provenance:** Tier ${story.provenanceTier}`);
  return lines.join("\n");
}

export function StoryOverflowMenu({ story, onToggleFavourite, compact }: StoryOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleCopyStory() {
    const markdown = formatStoryAsMarkdown(story);
    navigator.clipboard.writeText(markdown).then(() => {
      setCopyFeedback("Copied!");
      setTimeout(() => { setCopyFeedback(null); setIsOpen(false); }, 1200);
    });
  }

  function handleShareStory() {
    const shareUrl = `${window.location.origin}/#story=${story.storyIdentifier}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyFeedback("Link copied!");
      setTimeout(() => { setCopyFeedback(null); setIsOpen(false); }, 1200);
    });
  }

  function handleDownloadStory() {
    const json = JSON.stringify(story, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${story.storyIdentifier}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center justify-center rounded-md transition-colors hover:bg-ink/10 ${
          compact ? "h-7 w-7 text-sm" : "h-8 w-8 text-base"
        } text-muted hover:text-ink`}
        aria-label="Story actions"
      >
        &#8943;
      </button>

      {isOpen && (
        <div className={`absolute z-50 min-w-[160px] rounded-lg border border-rule bg-card shadow-lg ${
          compact ? "right-0 top-8" : "right-0 top-9"
        }`}>
          {copyFeedback ? (
            <div className="px-4 py-3 text-center text-sm font-semibold text-accent">
              {copyFeedback}
            </div>
          ) : (
            <>
              {onToggleFavourite && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavourite(story.storyIdentifier); setIsOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5"
                >
                  <span className={story.isFavourite ? "text-amber" : "text-muted"}>
                    {story.isFavourite ? "★" : "☆"}
                  </span>
                  {story.isFavourite ? "Unfavourite" : "Favourite"}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCopyStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5"
              >
                <span className="text-muted">&#128203;</span>
                Copy as Markdown
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleShareStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5"
              >
                <span className="text-muted">&#128279;</span>
                Copy Link
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownloadStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5"
              >
                <span className="text-muted">&#8615;</span>
                Download JSON
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
