"use client";

import React from "react";
import type { Edition, Story } from "@/lib/types";
import { computeLayout, type LayoutMode } from "@/lib/layoutRuleEngine";
import { formatEditionDate } from "@/lib/formatDate";
import { SHOW_ALL_SECTIONS } from "@/lib/viewmodels/useEditionViewModel";
import { HeroStory, StoryByline } from "./HeroStory";
import { BriefCard } from "./BriefCard";

interface EditionSheetProps {
  edition: Edition;
  activeSectionFilter: string;
  layoutMode: LayoutMode;
  onSelectStory: (story: Story) => void;
}

interface StoryCardProps {
  story: Story;
  onSelectStory: (story: Story) => void;
}

function SectionDivider({ label, extra }: { label: string; extra?: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0A0908] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink">
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

function StoryThumbnail({ story, playButtonSize }: { story: Story; playButtonSize: "sm" | "md" }) {
  const thumbnailUrl = getStoryThumbnailUrl(story);
  if (!thumbnailUrl) return null;
  const playButtonClass =
    playButtonSize === "md" ? "h-9 w-12 rounded-lg shadow-lg" : "h-8 w-11 rounded-md shadow";
  const playIconSize = playButtonSize === "md" ? 16 : 14;
  return (
    <div
      className="relative mb-2 aspect-[16/9] w-full rounded-sm bg-card bg-cover bg-center"
      style={{ backgroundImage: `url(${thumbnailUrl})` }}
    >
      {story.youtubeVideoId && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`flex items-center justify-center bg-red-600/90 ${playButtonClass}`}>
            <svg width={playIconSize} height={playIconSize} viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTag({ section }: { section: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent">{section}</p>
  );
}

function SidebarStoryCard({ story, onSelectStory }: StoryCardProps) {
  const hasThumbnail = Boolean(getStoryThumbnailUrl(story));
  return (
    <article
      className="flex flex-1 cursor-pointer flex-col border-b border-rule px-3 py-2.5 transition-colors hover:bg-card/40 last:border-b-0"
      onClick={() => onSelectStory(story)}
    >
      <StoryThumbnail story={story} playButtonSize="sm" />
      <SectionTag section={story.section} />
      <h3 className="mt-1 font-serif text-[18px] font-bold leading-[1.12]">
        {story.headline}
      </h3>
      <p className={`mt-1 font-body text-[14px] leading-normal text-muted ${hasThumbnail ? "line-clamp-3" : "line-clamp-6"}`}>
        {story.excerpt}
      </p>
      <StoryByline story={story} className="mt-auto pt-2" />
    </article>
  );
}

function MidRowStoryCard({ story, onSelectStory }: StoryCardProps) {
  const hasThumbnail = Boolean(getStoryThumbnailUrl(story));
  return (
    <article
      className="flex cursor-pointer flex-col border-b border-rule px-3 py-2.5 transition-colors hover:bg-card/40 md:border-b-0 md:border-r md:last:border-r-0"
      onClick={() => onSelectStory(story)}
    >
      <StoryThumbnail story={story} playButtonSize="md" />
      <SectionTag section={story.section} />
      <h3 className="mt-1 font-serif text-[20px] font-bold leading-[1.12]">
        {story.headline}
      </h3>
      <p className={`mt-1.5 font-body text-[14px] leading-normal text-muted ${hasThumbnail ? "line-clamp-4" : "line-clamp-[8]"}`}>
        {story.excerpt}
      </p>
      <StoryByline story={story} className="mt-auto pt-2" />
    </article>
  );
}

function VideoFeatureRow({ story, onSelectStory }: StoryCardProps) {
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
          className="flex cursor-pointer flex-col justify-center border-t border-rule px-4 py-3 transition-colors hover:bg-card/40 md:border-l md:border-t-0"
          onClick={() => onSelectStory(story)}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {story.section}
          </p>
          <h3 className="mt-1.5 font-serif text-xl font-black leading-[1.1] md:text-2xl">
            {story.headline}
          </h3>
          <p className="mt-2 font-body text-[14px] italic leading-normal text-muted line-clamp-6">
            {story.excerpt}
          </p>
          <StoryByline story={story} className="mt-3" />
        </div>
      </div>
    </article>
  );
}

function BelowFoldStoryCard({ story, onSelectStory }: StoryCardProps) {
  const hasThumbnail = Boolean(getStoryThumbnailUrl(story));
  return (
    <article
      className="cursor-pointer border-b border-rule px-3 py-2.5 transition-colors hover:bg-card/40 lg:last:border-b-0"
      onClick={() => onSelectStory(story)}
    >
      <StoryThumbnail story={story} playButtonSize="sm" />
      <SectionTag section={story.section} />
      <h3 className="mt-0.5 font-serif text-[18px] font-bold leading-[1.12]">
        {story.headline}
      </h3>
      <p className={`mt-1 font-body text-[14px] leading-normal text-muted ${hasThumbnail ? "line-clamp-3" : "line-clamp-4"}`}>
        {story.excerpt}
      </p>
    </article>
  );
}

function SimpleFeedStory({ story, onSelectStory }: StoryCardProps) {
  if (story.youtubeVideoId) {
    return (
      <article className="py-3">
        <SectionTag section={story.section} />
        <h3
          className="mt-1 cursor-pointer font-serif text-xl font-bold leading-[1.15] transition-colors hover:text-accent"
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
        <p className="mt-2 font-body text-[15px] leading-normal text-muted line-clamp-3">
          {story.excerpt}
        </p>
      </article>
    );
  }

  return (
    <article
      className="cursor-pointer py-3 transition-colors hover:bg-card/40"
      onClick={() => onSelectStory(story)}
    >
      {story.imageUrl && (
        <div
          className="mb-2 aspect-[21/9] w-full rounded-sm bg-card bg-cover bg-center"
          style={{ backgroundImage: `url(${story.imageUrl})` }}
        />
      )}
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        {story.section}
      </p>
      <h3 className="mt-1 font-serif text-lg font-bold leading-[1.15]">
        {story.headline}
      </h3>
      <p className="mt-1 font-body text-sm leading-normal text-muted">
        {story.excerpt}
      </p>
      <StoryByline story={story} className="mt-1.5" />
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
            <div className="min-w-0 lg:[&>article]:border-b-0">
              <HeroStory story={layout.heroStory} onSelectStory={onSelectStory} />
            </div>
            {layout.sidebarStories.length > 0 && (
              <div className="flex min-w-0 flex-col border-t border-rule lg:border-l lg:border-t-0">
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
              className={`grid grid-cols-1 border-b border-rule ${
                layout.midRowStories.length >= 3
                  ? "md:grid-cols-3"
                  : layout.midRowStories.length === 2
                    ? "sm:grid-cols-2"
                    : ""
              }`}
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

          {/* ===== BELOW THE FOLD — 3 height-balanced columns ===== */}
          {layout.belowFoldColumns.length > 0 && (
            <>
              <SectionDivider label="More Stories" />
              <div
                className={`grid grid-cols-1 ${
                  layout.belowFoldColumns.length >= 3
                    ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]"
                    : layout.belowFoldColumns.length === 2
                      ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]"
                      : ""
                }`}
              >
                {layout.belowFoldColumns.map((columnStories, columnIndex) => (
                  <React.Fragment key={columnIndex}>
                    {columnIndex > 0 && <div className="hidden bg-rule lg:block" />}
                    <div className="min-w-0 self-start">
                      {columnStories.map((story) => (
                        <BelowFoldStoryCard
                          key={story.storyIdentifier}
                          story={story}
                          onSelectStory={onSelectStory}
                        />
                      ))}
                    </div>
                  </React.Fragment>
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
                <SimpleFeedStory
                  key={story.storyIdentifier}
                  story={story}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
