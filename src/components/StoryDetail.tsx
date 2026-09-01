"use client";

import { useEffect } from "react";
import type { Story } from "@/lib/types";
import { formatShortDate } from "@/lib/formatDate";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface StoryDetailProps {
  story: Story;
  onClose: () => void;
}

export function StoryDetail({ story, onClose }: StoryDetailProps) {
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-detail-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <article className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-rule bg-surface p-6 md:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close story"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-rule font-sans text-muted transition-colors hover:border-muted hover:text-ink"
        >
          ×
        </button>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          {story.section}
        </p>
        <h2
          id="story-detail-headline"
          className="mt-3 pr-8 font-serif text-3xl font-bold leading-tight md:text-4xl"
        >
          {story.headline}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-sans text-xs text-muted">
          <ProvenanceBadge provenanceTier={story.provenanceTier} />
          <span className="text-ink">{story.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={story.publishedAt}>
            Published {formatShortDate(story.publishedAt)}
          </time>
        </div>
        <p className="mt-6 border-t border-rule pt-6 font-body text-lg leading-relaxed text-ink/90">
          {story.excerpt}
        </p>
        <dl className="mt-8 space-y-4 border-t border-rule pt-6 font-sans text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-muted">
              Licence basis
            </dt>
            <dd className="mt-1">{story.licenceBasis}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-muted">
              Fetched
            </dt>
            <dd className="mt-1">
              <time dateTime={story.fetchedAt}>
                {formatShortDate(story.fetchedAt)}
              </time>
            </dd>
          </div>
          {story.citations && story.citations.length > 0 && (
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-muted">
                Citations
              </dt>
              <dd className="mt-1">
                <ol className="list-decimal space-y-1 pl-5">
                  {story.citations.map((citationUrl) => (
                    <li key={citationUrl}>
                      <a
                        href={citationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-teal hover:underline"
                      >
                        {citationUrl}
                      </a>
                    </li>
                  ))}
                </ol>
              </dd>
            </div>
          )}
        </dl>
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent hover:underline"
        >
          Read at {story.sourceName} ↗
        </a>
      </article>
    </div>
  );
}
