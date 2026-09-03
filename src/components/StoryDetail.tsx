"use client";

import { useEffect } from "react";
import type { Story } from "@/lib/types";
import { formatShortDate } from "@/lib/formatDate";
import { getRelatedStories } from "@/lib/recommendationEngine";

interface StoryDetailProps {
  story: Story;
  allStories: Story[];
  onClose: () => void;
  onSelectStory: (story: Story) => void;
}

export function StoryDetail({
  story,
  allStories,
  onClose,
  onSelectStory,
}: StoryDetailProps) {
  const relatedStories = getRelatedStories(story, allStories, 3);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [story.storyIdentifier]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={onClose}
        className="mb-6 flex items-center gap-2 font-sans text-base font-bold text-ink transition-colors hover:text-accent"
      >
        <span className="text-xl">&larr;</span> Back to edition
      </button>

      <article>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          {story.section}
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
          {story.headline}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-sans text-xs text-muted">
          <time dateTime={story.publishedAt}>
            Published {formatShortDate(story.publishedAt)}
          </time>
        </div>

        {story.youtubeVideoId ? (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${story.youtubeVideoId}`}
              title={story.headline}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          story.imageUrl && (
            <div
              className="mt-6 aspect-video w-full rounded bg-card bg-cover bg-center"
              style={{ backgroundImage: `url(${story.imageUrl})` }}
            />
          )
        )}

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
          {((story.citations && story.citations.length > 0) || story.sourceUrl) && (
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-muted">
                References
              </dt>
              <dd className="mt-1">
                <ol className="list-decimal space-y-1 pl-5">
                  {story.sourceUrl && (
                    <li>
                      <a
                        href={story.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-teal hover:underline"
                      >
                        {story.sourceName || story.sourceUrl}
                      </a>
                    </li>
                  )}
                  {story.citations?.map((citationUrl) => (
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

        {story.sourceUrl && (
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-accent hover:underline"
          >
            View original source &nearr;
          </a>
        )}
      </article>

      {/* Related stories */}
      {relatedStories.length > 0 && (
        <section className="mt-10 border-t border-rule pt-6">
          <h3 className="font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
            Related Stories
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {relatedStories.map((related) => (
              <button
                key={related.storyIdentifier}
                type="button"
                onClick={() => onSelectStory(related)}
                className="group rounded border border-rule p-3 text-left transition-colors hover:border-muted hover:bg-card/40"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-accent">
                  {related.section}
                </p>
                <h4 className="mt-1 font-serif text-sm font-bold leading-snug transition-colors group-hover:text-accent">
                  {related.headline}
                </h4>
                <p className="mt-1 text-[9px] text-muted">
                  {related.sourceName}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
