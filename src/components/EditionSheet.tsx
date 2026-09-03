"use client";

import type { Edition, Story } from "@/lib/types";
import { computeLayout, type LayoutMode } from "@/lib/layoutRuleEngine";
import { formatEditionDate } from "@/lib/formatDate";
import { SHOW_ALL_SECTIONS } from "@/lib/viewmodels/useEditionViewModel";
import { HeroStory } from "./HeroStory";
import { BriefCard } from "./BriefCard";

interface EditionSheetProps {
  edition: Edition;
  activeSectionFilter: string;
  layoutMode: LayoutMode;
  onSelectStory: (story: Story) => void;
}

function SectionDivider({ label, extra }: { label: string; extra?: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0A0908] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink">
      <span>{label}</span>
      {extra && <span className="font-normal text-muted">{extra}</span>}
    </div>
  );
}

function getStoryThumbnailUrl(story: Story): string | null {
  if (story.imageUrl) return story.imageUrl;
  if (story.youtubeVideoId) return `https://img.youtube.com/vi/${story.youtubeVideoId}/maxresdefault.jpg`;
  return null;
}

function SidebarStoryCard({ story, onSelectStory }: { story: Story; onSelectStory: (s: Story) => void }) {
  const thumbnailUrl = getStoryThumbnailUrl(story);
  return (
    <article
      className="cursor-pointer border-b border-rule p-3 transition-colors hover:bg-card/40 last:border-b-0"
      onClick={() => onSelectStory(story)}
    >
      {thumbnailUrl && (
        <div
          className="mb-2 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
      )}
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
        {story.section}
      </p>
      <h3 className="mt-1 font-serif text-[17px] font-bold leading-[1.15]">
        {story.headline}
      </h3>
      <p className="mt-1 font-body text-[12px] leading-relaxed text-muted line-clamp-2">
        {story.excerpt}
      </p>
    </article>
  );
}

function MidRowStoryCard({ story, onSelectStory }: { story: Story; onSelectStory: (s: Story) => void }) {
  const thumbnailUrl = getStoryThumbnailUrl(story);
  const isYouTubeStory = Boolean(story.youtubeVideoId);
  return (
    <article
      className="cursor-pointer border-r border-rule p-4 transition-colors hover:bg-card/40 last:border-r-0"
      onClick={() => onSelectStory(story)}
    >
      {thumbnailUrl && (
        <div
          className="relative mb-2 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        >
          {isYouTubeStory && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-red-600/90 shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
        {story.section}
      </p>
      <h3 className="mt-1 font-serif text-[19px] font-bold leading-[1.12]">
        {story.headline}
      </h3>
      <p className="mt-1.5 font-body text-[13px] leading-relaxed text-muted line-clamp-3">
        {story.excerpt}
      </p>
    </article>
  );
}

function VideoFeatureRow({ story, onSelectStory }: { story: Story; onSelectStory: (s: Story) => void }) {
  return (
    <article className="border-b-2 border-rule">
      <SectionDivider label="Video" extra="Featured" />
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">
        <div className="aspect-video w-full overflow-hidden bg-card">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${story.youtubeVideoId}`}
            title={story.headline}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div
          className="flex cursor-pointer flex-col justify-center border-t border-rule px-5 py-4 transition-colors hover:bg-card/40 md:border-l md:border-t-0"
          onClick={() => onSelectStory(story)}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {story.section}
          </p>
          <h3 className="mt-2 font-serif text-xl font-black leading-[1.1] md:text-2xl">
            {story.headline}
          </h3>
          <p className="mt-2 font-body text-[14px] italic leading-relaxed text-muted line-clamp-4">
            {story.excerpt}
          </p>
        </div>
      </div>
    </article>
  );
}

function BelowFoldStoryCard({ story, onSelectStory }: { story: Story; onSelectStory: (s: Story) => void }) {
  const thumbnailUrl = getStoryThumbnailUrl(story);
  const isYouTubeStory = Boolean(story.youtubeVideoId);
  return (
    <article
      className="cursor-pointer border-b border-r border-rule p-3 transition-colors hover:bg-card/40"
      onClick={() => onSelectStory(story)}
    >
      {thumbnailUrl && (
        <div
          className="relative mb-2 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        >
          {isYouTubeStory && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-8 w-11 items-center justify-center rounded-md bg-red-600/90 shadow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-accent">
        {story.section}
      </p>
      <h3 className="mt-0.5 font-serif text-[15px] font-bold leading-[1.15]">
        {story.headline}
      </h3>
      <p className="mt-1 font-body text-[12px] leading-relaxed text-muted line-clamp-2">
        {story.excerpt}
      </p>
    </article>
  );
}

export function EditionSheet({
  edition,
  activeSectionFilter,
  layoutMode,
  onSelectStory,
}: EditionSheetProps) {
  const sheetStories =
    activeSectionFilter === SHOW_ALL_SECTIONS
      ? edition.stories
      : edition.stories.filter(
          (story) => story.section === activeSectionFilter
        );
  const layout = computeLayout(sheetStories, layoutMode);

  if (!layout.heroStory) {
    return (
      <p className="py-20 text-center font-serif text-lg italic text-muted">
        No stories in this section today.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-10">
      {/* Masthead */}
      <div className="border-b-2 border-double border-rule py-2 text-center">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-muted">
          <span>AI Curated &middot; Personal Edition</span>
          <span>Vol. I &middot; No. {edition.editionNumber}</span>
        </div>
      </div>

      {layout.mode === "dynamic" && (
        <>
          {/* ===== ABOVE THE FOLD ===== */}
          {/* Hero (4/6) + Sidebar (2/6) */}
          <div className="grid grid-cols-1 border-b-2 border-rule lg:grid-cols-[4fr_2fr]">
            <div className="min-w-0">
              <HeroStory story={layout.heroStory} onSelectStory={onSelectStory} />
            </div>
            {layout.sidebarStories.length > 0 && (
              <div className="min-w-0 border-t border-rule lg:border-l lg:border-t-0">
                {layout.sidebarStories.map((story) => (
                  <SidebarStoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={onSelectStory}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section bar */}
          <SectionDivider
            label={`Today’s Edition · ${sheetStories.length} Stories · ${edition.sections.length} Sections`}
            extra={formatEditionDate(edition.editionDate)}
          />

          {/* Mid-row: 2-3 stories in equal columns */}
          {layout.midRowStories.length > 0 && (
            <div
              className="grid grid-cols-1 border-b border-rule sm:grid-cols-2 lg:grid-cols-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(layout.midRowStories.length, 3)}, minmax(0, 1fr))` }}
            >
              {layout.midRowStories.map((story) => (
                <MidRowStoryCard
                  key={story.storyIdentifier}
                  story={story}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          )}

          {/* Brief strip */}
          {layout.briefStripStories.length > 0 && (
            <div className="grid grid-cols-2 gap-px border-b border-rule bg-rule md:grid-cols-4">
              {layout.briefStripStories.map((story) => (
                <BriefCard
                  key={story.storyIdentifier}
                  story={story}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          )}

          {/* ===== VIDEO FEATURE ===== */}
          {layout.videoFeatureStory && (
            <VideoFeatureRow
              story={layout.videoFeatureStory}
              onSelectStory={onSelectStory}
            />
          )}

          {/* ===== BELOW THE FOLD ===== */}
          {layout.belowFoldStories.length > 0 && (
            <>
              <SectionDivider label="More Stories" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {layout.belowFoldStories.map((story) => (
                  <BelowFoldStoryCard
                    key={story.storyIdentifier}
                    story={story}
                    onSelectStory={onSelectStory}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Simple feed — hero + vertical list */}
      {layout.mode === "simple" && (
        <>
          <HeroStory story={layout.heroStory} onSelectStory={onSelectStory} />

          {layout.feedStories.length > 0 && (
            <div className="divide-y divide-rule">
              {layout.feedStories.map((story) => (
                <article key={story.storyIdentifier} className="py-4">
                  {story.youtubeVideoId ? (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                        {story.section}
                      </p>
                      <h3
                        className="mt-1 cursor-pointer font-serif text-lg font-bold leading-snug transition-colors hover:text-accent"
                        onClick={() => onSelectStory(story)}
                      >
                        {story.headline}
                      </h3>
                      <div className="mt-2 aspect-video w-full overflow-hidden rounded">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube-nocookie.com/embed/${story.youtubeVideoId}`}
                          title={story.headline}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <p className="mt-2 font-body text-sm leading-relaxed text-muted line-clamp-2">
                        {story.excerpt}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer transition-colors hover:bg-card/40"
                      onClick={() => onSelectStory(story)}
                    >
                      {story.imageUrl && (
                        <div
                          className="mb-2 aspect-[21/9] w-full rounded-sm bg-card bg-cover bg-center"
                          style={{ backgroundImage: `url(${story.imageUrl})` }}
                        />
                      )}
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">
                        {story.section}
                      </p>
                      <h3 className="mt-1 font-serif text-lg font-bold leading-snug">
                        {story.headline}
                      </h3>
                      <p className="mt-1 font-body text-sm leading-relaxed text-muted line-clamp-2">
                        {story.excerpt}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
