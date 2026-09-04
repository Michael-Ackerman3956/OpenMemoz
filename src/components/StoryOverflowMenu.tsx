"use client";

import { useState, useRef, useEffect } from "react";
import type { Story } from "@/lib/types";

interface StoryOverflowMenuProps {
  story: Story;
  onToggleFavourite?: (storyIdentifier: string) => void;
  onDeleteStory?: (storyIdentifier: string) => void;
  compact?: boolean;
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function MoreIcon({ compact }: { compact?: boolean }) {
  return (
    <svg width={compact ? "16" : "18"} height={compact ? "16" : "18"} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="12" cy="19" r="1.5"/>
    </svg>
  );
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

export function StoryOverflowMenu({ story, onToggleFavourite, onDeleteStory, compact }: StoryOverflowMenuProps) {
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

  function showFeedback(msg: string) {
    setCopyFeedback(msg);
    setTimeout(() => { setCopyFeedback(null); setIsOpen(false); }, 1200);
  }

  function handleCopyStory() {
    navigator.clipboard.writeText(formatStoryAsMarkdown(story)).then(() => showFeedback("Copied!"));
  }

  function handleShareStory() {
    const shareData = {
      title: story.headline,
      text: story.excerpt,
      url: story.youtubeVideoId
        ? `https://www.youtube.com/watch?v=${story.youtubeVideoId}`
        : story.sourceUrl || window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      setIsOpen(false);
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => showFeedback("Link copied!"));
    }
  }

  function handleCopyLink() {
    const shareUrl = `${window.location.origin}/#story=${story.storyIdentifier}`;
    navigator.clipboard.writeText(shareUrl).then(() => showFeedback("Link copied!"));
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
    <div ref={menuRef} className="relative flex items-center gap-0.5">
      {story.isFavourite && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none" className="flex-shrink-0">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
        </svg>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center justify-center rounded-md transition-all ${
          compact ? "h-7 w-7" : "h-8 w-8"
        } text-muted/60 hover:text-ink hover:bg-ink/10`}
        aria-label="Story actions"
      >
        <MoreIcon compact={compact} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 min-w-[170px] rounded-lg border border-rule bg-card/95 backdrop-blur-sm shadow-xl ${
          compact ? "right-0 top-8" : "right-0 top-9"
        }`}>
          {copyFeedback ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {copyFeedback}
            </div>
          ) : (
            <>
              {onToggleFavourite && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavourite(story.storyIdentifier); setIsOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5 first:rounded-t-lg"
                >
                  <StarIcon filled={!!story.isFavourite} />
                  {story.isFavourite ? "Unfavourite" : "Favourite"}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleShareStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5"
              >
                <ShareIcon />
                Share
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCopyStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5"
              >
                <CopyIcon />
                Copy as Markdown
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5"
              >
                <LinkIcon />
                Copy Link
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownloadStory(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-ink/5"
              >
                <DownloadIcon />
                Download JSON
              </button>
              {onDeleteStory && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteStory(story.storyIdentifier); setIsOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-b-lg border-t border-rule px-4 py-2.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <TrashIcon />
                  Delete Story
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
