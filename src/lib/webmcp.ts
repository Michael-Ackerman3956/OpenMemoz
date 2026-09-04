import { Edition, Story } from "./types";
import { APPROVED_SOURCES, BANNED_DOMAINS, validateSourceUrl } from "./curatedSources";
import {
  loadAutoCurationConfig,
  saveAutoCurationConfig,
  startAutoCurationScheduler,
  stopAutoCurationScheduler,
  getAutoCurationStatus,
  runAutoCurationOnce,
  buildEmptyEditionForDateWithEditionNumber,
  type AutoCurationConfig,
} from "./autoCurationScheduler";
import { getTodayAsEditionDateString } from "./formatDate";
import { loadUserInterestsFromLocalStorage, saveUserInterestsToLocalStorage, AVAILABLE_TOPICS } from "@/components/InterestsScreen";
import { buildReadingBehaviorSummary } from "./readingTracker";
import {
  saveAgentMemoryEntry,
  loadAllAgentMemories,
  deleteAgentMemoryEntry,
} from "./agentMemory";
import {
  COLOR_PALETTES,
  VISUAL_STYLES,
  findPaletteByIdentifier,
  applyPaletteToDocument,
  applyVisualStyleToDocument,
  savePaletteIdentifier,
  saveVisualStyleIdentifier,
  loadSavedPaletteIdentifier,
  loadSavedVisualStyleIdentifier,
} from "./themeSystem";
import type { VisualStyleIdentifier } from "./themeSystem";

interface WebMCPToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: WebMCPToolDefinition,
        options?: { signal: AbortSignal }
      ) => Promise<void>;
    };
  }
}

export function registerAllWebMCPTools(
  edition: Edition,
  allEditions: Edition[],
  getCurrentSectionFilter: () => string,
  setCurrentSectionFilter: (section: string) => void,
  onEditionMutated: (updatedEdition: Edition, editionArrayIndex: number) => void,
  onNewEditionCreatedByAgent: (newEdition: Edition) => number,
  abortSignal: AbortSignal
): void {
  // Chrome 150+ uses document.modelContext; Chrome 146–149 used navigator.modelContext
  const modelContext = document.modelContext ?? (navigator as unknown as { modelContext?: typeof document.modelContext }).modelContext;
  if (typeof modelContext?.registerTool !== "function") return;

  const options = { signal: abortSignal };

  // Extract YouTube video ID from a URL or pass-through if already an ID
  function extractYoutubeVideoId(input: string): string {
    const urlPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of urlPatterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    return input;
  }

  // Resolve an edition by date, defaulting to the current one.
  // Returns the edition and its index in allEditions.
  function resolveEditionByDate(editionDate?: unknown): { targetEdition: Edition; targetIndex: number } | { error: { code: string; message: string } } {
    if (!editionDate || (editionDate as string) === edition.editionDate) {
      const currentIndex = allEditions.findIndex((e) => e.editionDate === edition.editionDate);
      return { targetEdition: edition, targetIndex: currentIndex >= 0 ? currentIndex : 0 };
    }
    const targetIndex = allEditions.findIndex((e) => e.editionDate === (editionDate as string));
    if (targetIndex === -1) {
      return {
        error: {
          code: "EDITION_NOT_FOUND",
          message: `No edition found for date "${editionDate}". Available dates: ${allEditions.map((e) => e.editionDate).join(", ")}`,
        },
      };
    }
    return { targetEdition: allEditions[targetIndex], targetIndex };
  }

  function createEmptyEditionForDateWithNextEditionNumber(targetDateString: string): Edition {
    const maximumExistingEditionNumber = allEditions.reduce(
      (maximum, existingEdition) => Math.max(maximum, existingEdition.editionNumber),
      0
    );
    return buildEmptyEditionForDateWithEditionNumber(targetDateString, maximumExistingEditionNumber + 1);
  }

  // Add-type tools only: an omitted date means today, and a date with no edition yet
  // gets an empty edition created on demand (the page navigates to it). Every other
  // tool keeps resolveEditionByDate so a typo'd date can never spawn an edition.
  function resolveOrCreateEditionByDateDefaultingToToday(editionDate?: unknown): { targetEdition: Edition; targetIndex: number } | { error: { code: string; message: string } } {
    const targetDateString = typeof editionDate === "string" && editionDate ? editionDate : getTodayAsEditionDateString();
    const existingResolution = resolveEditionByDate(targetDateString);
    if (!("error" in existingResolution)) return existingResolution;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateString)) {
      return { error: { code: "INVALID_DATE", message: `"${targetDateString}" is not a valid edition date. Use YYYY-MM-DD format.` } };
    }
    const newEdition = createEmptyEditionForDateWithNextEditionNumber(targetDateString);
    const newEditionIndex = onNewEditionCreatedByAgent(newEdition);
    return { targetEdition: newEdition, targetIndex: newEditionIndex };
  }

  void Promise.all([
    // 1. get_edition
    modelContext.registerTool(
      {
        name: "openmemoz.get_edition",
        title: "Get Edition Overview",
        description:
          "Get today's newspaper edition overview: date, edition number, sections, " +
          "story count, and a list of story headlines with their provenance tier. " +
          "Tier 1 stories are from the source's own text and may be quoted directly. " +
          "Tier 2 stories are AI-synthesized summaries and must not be presented as quotes.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          editionDate: edition.editionDate,
          editionNumber: edition.editionNumber,
          storyCount: edition.storyCount,
          sections: edition.sections,
          stories: edition.stories.map((story) => ({
            storyIdentifier: story.storyIdentifier,
            headline: story.headline,
            section: story.section,
            provenanceTier: story.provenanceTier,
            sourceName: story.sourceName,
          })),
        }),
      },
      options
    ),

    // 2. list_editions — lets agent discover available dates
    modelContext.registerTool(
      {
        name: "openmemoz.list_editions",
        title: "List Available Editions",
        description:
          "List all available edition dates. Use this to discover which dates can be " +
          "targeted when removing or updating stories with the editionDate parameter. " +
          "Adding a story to a date with no edition yet creates that edition automatically.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          currentEditionDate: edition.editionDate,
          editions: allEditions.map((e) => ({
            editionDate: e.editionDate,
            editionNumber: e.editionNumber,
            storyCount: e.storyCount,
            sections: e.sections,
          })),
          totalEditions: allEditions.length,
        }),
      },
      options
    ),

    // 3. search_stories
    modelContext.registerTool(
      {
        name: "openmemoz.search_stories",
        title: "Search Stories",
        description:
          "Search today's edition by keyword. If no results are found, use " +
          "openmemoz.discover_youtube_content, openmemoz.discover_bluesky_trending, or openmemoz.discover_web_content " +
          "to find content from external sources, then add it with openmemoz.add_story. " +
          "Use a returned storyIdentifier with openmemoz.get_story for full details.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Words to match in headline or excerpt",
            },
            section: {
              type: "string",
              description: "Optional section name to narrow results",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: ({ query, section }) => {
          const queryLower = (query as string).toLowerCase();
          const matchingStories = edition.stories.filter((story) => {
            const matchesQuery =
              story.headline.toLowerCase().includes(queryLower) ||
              story.excerpt.toLowerCase().includes(queryLower);
            const matchesSection = section
              ? story.section.toLowerCase() ===
                (section as string).toLowerCase()
              : true;
            return matchesQuery && matchesSection;
          });
          const results = matchingStories.map((story) => ({
            storyIdentifier: story.storyIdentifier,
            headline: story.headline,
            section: story.section,
            provenanceTier: story.provenanceTier,
            sourceName: story.sourceName,
            excerpt: story.excerpt,
          }));
          return {
            resultCount: results.length,
            results,
            ...(results.length === 0 && {
              suggestion: "No stories found locally. Try openmemoz.discover_youtube_content, openmemoz.discover_bluesky_trending, or openmemoz.discover_web_content to find content from external sources, then add with openmemoz.add_story.",
            }),
          };
        },
      },
      options
    ),

    // 3. get_story
    modelContext.registerTool(
      {
        name: "openmemoz.get_story",
        title: "Get Story Detail",
        description:
          "Get a single story in full detail, including its licence basis, " +
          "source attribution, and citations if AI-synthesized. " +
          "Use the storyIdentifier from openmemoz.get_edition or openmemoz.search_stories.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The story's unique identifier",
            },
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: ({ storyIdentifier }) => {
          const story = edition.stories.find(
            (s) => s.storyIdentifier === storyIdentifier
          );
          if (!story) {
            return {
              error: {
                code: "NOT_FOUND",
                message:
                  "No story found with that identifier. Use openmemoz.get_edition to list available stories.",
              },
            };
          }
          return story;
        },
      },
      options
    ),

    // 4. get_reading_context
    modelContext.registerTool(
      {
        name: "openmemoz.get_reading_context",
        title: "Get Reading Context",
        description:
          "Returns what the reader is currently looking at on the page: " +
          "the active section filter, number of visible stories, and current view state.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const currentFilter = getCurrentSectionFilter();
          const visibleCount =
            currentFilter === "ALL"
              ? edition.storyCount
              : edition.stories.filter(
                  (s) =>
                    s.section.toLowerCase() === currentFilter.toLowerCase()
                ).length;
          return {
            currentView: "edition",
            activeSectionFilter: currentFilter,
            visibleStoryCount: visibleCount,
            totalStoryCount: edition.storyCount,
            availableSections: edition.sections,
          };
        },
      },
      options
    ),

    // 5. set_section_filter
    modelContext.registerTool(
      {
        name: "openmemoz.set_section_filter",
        title: "Filter by Section",
        description:
          "Filter the newspaper to show only stories from a specific section, " +
          "or pass 'ALL' to show everything. The page updates immediately.",
        inputSchema: {
          type: "object",
          properties: {
            section: {
              type: "string",
              description:
                "Section name to filter by (e.g. 'Tech', 'Science', 'Finance'), or 'ALL' to reset",
            },
          },
          required: ["section"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ section }) => {
          const sectionStr = (section as string).toUpperCase();
          const validSections = ["ALL", ...edition.sections.map((s) => s.toUpperCase())];
          if (!validSections.includes(sectionStr)) {
            return {
              error: {
                code: "INVALID_INPUT",
                message: `Section "${section}" not found. Available: ${["ALL", ...edition.sections].join(", ")}`,
              },
            };
          }
          const normalizedSection =
            sectionStr === "ALL"
              ? "ALL"
              : edition.sections.find(
                  (s) => s.toUpperCase() === sectionStr
                ) ?? "ALL";
          setCurrentSectionFilter(normalizedSection);
          const visibleCount =
            normalizedSection === "ALL"
              ? edition.storyCount
              : edition.stories.filter((s) => s.section === normalizedSection)
                  .length;
          return {
            activeSectionFilter: normalizedSection,
            visibleStoryCount: visibleCount,
          };
        },
      },
      options
    ),

    // 6. explain_connections
    modelContext.registerTool(
      {
        name: "openmemoz.explain_connections",
        title: "Explain Story Connections",
        description:
          "Explains how today's stories relate to each other thematically. " +
          "Returns story pairs that share topics, actors, or implications.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const connections: Array<{
            storyIdentifierA: string;
            storyIdentifierB: string;
            relationship: string;
          }> = [];

          for (let i = 0; i < edition.stories.length; i++) {
            for (let j = i + 1; j < edition.stories.length; j++) {
              const storyA = edition.stories[i];
              const storyB = edition.stories[j];
              if (storyA.section === storyB.section) {
                connections.push({
                  storyIdentifierA: storyA.storyIdentifier,
                  storyIdentifierB: storyB.storyIdentifier,
                  relationship: `Both in ${storyA.section} section`,
                });
              }
            }
          }

          return {
            editionDate: edition.editionDate,
            connectionCount: connections.length,
            connections,
            allStories: edition.stories.map((s) => ({
              storyIdentifier: s.storyIdentifier,
              headline: s.headline,
              section: s.section,
            })),
          };
        },
      },
      options
    ),

    // 7. get_youtube_video
    modelContext.registerTool(
      {
        name: "openmemoz.get_youtube_video",
        title: "Get YouTube Video Info",
        description:
          "Fetch metadata and transcript for any public YouTube video. " +
          "Returns title, channel, thumbnails, embed URL, and the full " +
          "auto-generated transcript with timestamps. No API key required for " +
          "transcript. Optionally pass a Gemini API key to unlock full video " +
          "analysis (audio + visual frames) — the key is used for one request " +
          "and never stored.",
        inputSchema: {
          type: "object",
          properties: {
            videoUrl: {
              type: "string",
              description:
                "YouTube URL (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)",
            },
          },
          required: ["videoUrl"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async ({ videoUrl }) => {
          try {
            const response = await fetch(
              `/api/youtube/metadata?url=${encodeURIComponent(videoUrl as string)}`
            );
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({}));
              return {
                error: {
                  code: "FETCH_FAILED",
                  message:
                    (errorBody as { error?: string }).error ??
                    `Server returned ${response.status}`,
                },
              };
            }
            return await response.json();
          } catch (fetchError) {
            return {
              error: {
                code: "NETWORK_ERROR",
                message:
                  fetchError instanceof Error
                    ? fetchError.message
                    : "Failed to reach metadata endpoint",
              },
            };
          }
        },
      },
      options
    ),

    // 8. add_story — supports images, video, and cross-date targeting
    modelContext.registerTool(
      {
        name: "openmemoz.add_story",
        title: "Add Story",
        description:
          "Add a new story to an edition. Omit editionDate to target TODAY's edition — " +
          "if no edition exists for that date yet, one is created automatically with the " +
          "next edition number and the page navigates to it. Pass editionDate to add to a " +
          "specific date instead. The page updates IMMEDIATELY after each " +
          "call — the reader sees the story appear in real-time. Call this multiple " +
          "times in sequence to build an edition incrementally (each story appears " +
          "as it's added). You are the search engine — browse the web, find " +
          "interesting content, and write ORIGINAL articles in your own words. " +
          "For YouTube videos, pass the full URL as youtubeVideoId. For vague " +
          "requests like 'add stories for tomorrow', use discover tools first " +
          "(discover_youtube_content, discover_bluesky_trending, discover_mastodon_trending, discover_web_content) " +
          "to find topics, then add stories one by one across different sections. " +
          "Only use sourceUrls from approved sources. Banned URLs are rejected.",
        inputSchema: {
          type: "object",
          properties: {
            headline: {
              type: "string",
              description: "The story headline",
            },
            excerpt: {
              type: "string",
              description: "A 1-3 sentence summary of the story",
            },
            section: {
              type: "string",
              description:
                "Section to place the story in (e.g. 'Tech', 'Science', 'Sports'). " +
                "Use openmemoz.get_edition to see available sections, or create a new one.",
            },
            sourceName: {
              type: "string",
              description: "Name of the source (e.g. 'Reuters', 'Agent Contribution')",
            },
            sourceUrl: {
              type: "string",
              description: "URL of the original source, or empty string if none",
            },
            imageUrl: {
              type: "string",
              description: "Optional URL of a hero image for the story. Use a direct image link (jpg/png/webp).",
            },
            youtubeVideoId: {
              type: "string",
              description: "Optional YouTube video ID (e.g. 'dQw4w9WgXcQ') to embed a video with the story.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target in YYYY-MM-DD format (e.g. '2026-09-02'). " +
                "Defaults to today's date. If no edition exists for the date, a new empty edition is created automatically.",
            },
            position: {
              type: "string",
              description: "Where to insert: 'first' (default, appears at top), 'last' (append to end), " +
                "or 'after:<storyIdentifier>' / 'before:<storyIdentifier>' to place relative to another story.",
            },
            pinAsHero: {
              type: "boolean",
              description: "If true, pins this story as the hero (large featured story at top). Only one story can be hero at a time.",
            },
            author: {
              type: "string",
              description: "Author name (Schema.org/Dublin Core compatible).",
            },
            language: {
              type: "string",
              description: "ISO 639-1 language code (e.g. 'en', 'es', 'ko'). Default: 'en'.",
            },
            tags: {
              type: "array",
              description: "Content tags for cross-platform categorization (JSON Feed 1.1 compatible).",
              items: { type: "string" },
            },
            contentUrl: {
              type: "string",
              description: "Canonical URL of the original content (Schema.org compatible).",
            },
          },
          required: ["headline", "excerpt", "section", "sourceName"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ headline, excerpt, section, sourceName, sourceUrl, imageUrl, youtubeVideoId, editionDate, position, pinAsHero, author, language, tags, contentUrl }) => {
          // Validate sourceUrl before resolving so a rejected story never creates an empty edition
          if (sourceUrl && (sourceUrl as string).startsWith("http")) {
            const validation = validateSourceUrl(sourceUrl as string);
            if (validation.status === "banned") {
              return {
                error: {
                  code: "SOURCE_BANNED",
                  message: `Source domain "${validation.domain}" is not permitted. ` +
                    "OpenMemoz only accepts content from approved open-licensed sources. " +
                    "Use openmemoz.get_approved_sources to see the full list. " +
                    "You may still write an original article inspired by multiple sources — " +
                    "just don't link directly to copyrighted publishers.",
                },
              };
            }
          }

          const resolved = resolveOrCreateEditionByDateDefaultingToToday(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const storyIdentifier = (headline as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);

          const isDuplicateIdentifier = targetEdition.stories.some(
            (s) => s.storyIdentifier === storyIdentifier
          );
          if (isDuplicateIdentifier) {
            return {
              error: {
                code: "DUPLICATE",
                message: `A story with identifier "${storyIdentifier}" already exists.`,
              },
            };
          }

          // If pinning as hero, unpin any existing hero first
          let storiesBeforeInsert = targetEdition.stories;
          if (pinAsHero) {
            storiesBeforeInsert = storiesBeforeInsert.map((s) =>
              s.isHeroPinned ? { ...s, isHeroPinned: undefined } : s
            );
          }

          const resolvedVideoId = youtubeVideoId ? extractYoutubeVideoId(youtubeVideoId as string) : undefined;
          // Auto-generate thumbnail from YouTube if no image provided
          const resolvedImageUrl = (imageUrl as string | undefined)
            || (resolvedVideoId ? `https://img.youtube.com/vi/${resolvedVideoId}/hqdefault.jpg` : undefined);

          const newStory: Story = {
            storyIdentifier,
            headline: headline as string,
            excerpt: excerpt as string,
            section: section as string,
            provenanceTier: 2 as const,
            sourceName: sourceName as string,
            sourceUrl: (sourceUrl as string) || "",
            licenceBasis: "agent-contributed",
            publishedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
            ...(resolvedVideoId ? { youtubeVideoId: resolvedVideoId } : {}),
            ...(pinAsHero ? { isHeroPinned: true } : {}),
            ...(author ? { author: author as string } : {}),
            ...(language ? { language: language as string } : {}),
            ...(tags ? { tags: tags as string[] } : {}),
            ...(contentUrl ? { contentUrl: contentUrl as string } : {}),
          };

          // Position: first (default), last, after:<id>, before:<id>
          const positionStr = (position as string | undefined) || "first";
          let updatedStories: Story[];
          if (positionStr === "last") {
            updatedStories = [...storiesBeforeInsert, newStory];
          } else if (positionStr.startsWith("after:")) {
            const afterId = positionStr.slice(6);
            const afterIndex = storiesBeforeInsert.findIndex((s) => s.storyIdentifier === afterId);
            if (afterIndex === -1) {
              return { error: { code: "NOT_FOUND", message: `Cannot position after "${afterId}" — story not found.` } };
            }
            updatedStories = [...storiesBeforeInsert.slice(0, afterIndex + 1), newStory, ...storiesBeforeInsert.slice(afterIndex + 1)];
          } else if (positionStr.startsWith("before:")) {
            const beforeId = positionStr.slice(7);
            const beforeIndex = storiesBeforeInsert.findIndex((s) => s.storyIdentifier === beforeId);
            if (beforeIndex === -1) {
              return { error: { code: "NOT_FOUND", message: `Cannot position before "${beforeId}" — story not found.` } };
            }
            updatedStories = [...storiesBeforeInsert.slice(0, beforeIndex), newStory, ...storiesBeforeInsert.slice(beforeIndex)];
          } else {
            updatedStories = [newStory, ...storiesBeforeInsert];
          }

          const sectionStr = section as string;
          const updatedSections = targetEdition.sections.includes(sectionStr)
            ? targetEdition.sections
            : [...targetEdition.sections, sectionStr];

          const updatedEdition: Edition = {
            ...targetEdition,
            stories: updatedStories,
            storyCount: updatedStories.length,
            sections: updatedSections,
          };

          onEditionMutated(updatedEdition, targetIndex);

          return {
            added: true,
            storyIdentifier,
            section: sectionStr,
            editionDate: updatedEdition.editionDate,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 9. remove_story — supports cross-date targeting
    modelContext.registerTool(
      {
        name: "openmemoz.remove_story",
        title: "Remove Story",
        description:
          "Remove a story from an edition by its storyIdentifier. " +
          "The page updates immediately and changes persist via localStorage. " +
          "Target a specific edition date, or omit editionDate for the current edition.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier of the story to remove",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target (e.g. '2026-09-02'). Defaults to the currently viewed edition.",
            },
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: ({ storyIdentifier, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const storyIndex = targetEdition.stories.findIndex(
            (s) => s.storyIdentifier === (storyIdentifier as string)
          );
          if (storyIndex === -1) {
            return {
              error: {
                code: "NOT_FOUND",
                message: `No story found with identifier "${storyIdentifier}".`,
              },
            };
          }

          const removedStory = targetEdition.stories[storyIndex];
          const remainingStories = targetEdition.stories.filter(
            (_, i) => i !== storyIndex
          );
          const remainingSections = [
            ...new Set(remainingStories.map((s) => s.section)),
          ];

          const updatedEdition: Edition = {
            ...targetEdition,
            stories: remainingStories,
            storyCount: remainingStories.length,
            sections: remainingSections,
          };

          onEditionMutated(updatedEdition, targetIndex);

          return {
            removed: true,
            storyIdentifier: removedStory.storyIdentifier,
            headline: removedStory.headline,
            editionDate: updatedEdition.editionDate,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 10. update_story — supports all fields including media and cross-date targeting
    modelContext.registerTool(
      {
        name: "openmemoz.update_story",
        title: "Update Story",
        description:
          "Update fields of an existing story. Pass the storyIdentifier and any " +
          "fields to change. The page updates immediately and changes persist via " +
          "localStorage. Target a specific edition date, or omit for the current edition.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier of the story to update",
            },
            headline: {
              type: "string",
              description: "New headline (optional)",
            },
            excerpt: {
              type: "string",
              description: "New excerpt (optional)",
            },
            section: {
              type: "string",
              description: "Move to a different section (optional)",
            },
            sourceName: {
              type: "string",
              description: "Update the source name (optional)",
            },
            sourceUrl: {
              type: "string",
              description: "Update the source URL (optional)",
            },
            imageUrl: {
              type: "string",
              description: "Set or update the hero image URL (optional). Pass empty string to remove.",
            },
            youtubeVideoId: {
              type: "string",
              description: "Set or update the YouTube video ID (optional). Pass empty string to remove.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target (e.g. '2026-09-02'). Defaults to the currently viewed edition.",
            },
            author: { type: "string", description: "Update the author name (optional)." },
            language: { type: "string", description: "Update ISO 639-1 language code (optional)." },
            tags: { type: "array", description: "Update content tags (optional).", items: { type: "string" } },
            contentUrl: { type: "string", description: "Update canonical content URL (optional)." },
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, headline, excerpt, section, sourceName, sourceUrl, imageUrl, youtubeVideoId, editionDate, author, language, tags, contentUrl }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const storyIndex = targetEdition.stories.findIndex(
            (s) => s.storyIdentifier === (storyIdentifier as string)
          );
          if (storyIndex === -1) {
            return {
              error: {
                code: "NOT_FOUND",
                message: `No story found with identifier "${storyIdentifier}".`,
              },
            };
          }

          const updatedStory = { ...targetEdition.stories[storyIndex] };
          if (headline) updatedStory.headline = headline as string;
          if (excerpt) updatedStory.excerpt = excerpt as string;
          if (section) updatedStory.section = section as string;
          if (sourceName) updatedStory.sourceName = sourceName as string;
          if (sourceUrl !== undefined) updatedStory.sourceUrl = sourceUrl as string;
          if (imageUrl !== undefined) updatedStory.imageUrl = (imageUrl as string) || undefined;
          if (youtubeVideoId !== undefined) updatedStory.youtubeVideoId = (youtubeVideoId as string) || undefined;
          if (author !== undefined) updatedStory.author = (author as string) || undefined;
          if (language !== undefined) updatedStory.language = (language as string) || undefined;
          if (tags !== undefined) updatedStory.tags = (tags as string[]) || undefined;
          if (contentUrl !== undefined) updatedStory.contentUrl = (contentUrl as string) || undefined;
          updatedStory.dateModified = new Date().toISOString();

          const updatedStories = [...targetEdition.stories];
          updatedStories[storyIndex] = updatedStory;

          const updatedSections = [...new Set(updatedStories.map((s) => s.section))];

          const updatedEdition: Edition = {
            ...targetEdition,
            stories: updatedStories,
            sections: updatedSections,
          };

          onEditionMutated(updatedEdition, targetIndex);

          return {
            updated: true,
            storyIdentifier: updatedStory.storyIdentifier,
            headline: updatedStory.headline,
            section: updatedStory.section,
            editionDate: updatedEdition.editionDate,
          };
        },
      },
      options
    ),

    // 11. get_user_interests
    modelContext.registerTool(
      {
        name: "openmemoz.get_user_interests",
        title: "Get User Interests",
        description:
          "Returns the reader's chosen topics and weights. Use this to understand " +
          "what the reader cares about before generating or curating stories. " +
          "Topics with higher weights should appear more prominently. " +
          "Combine with openmemoz.add_story to create personalized content.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const interests = loadUserInterestsFromLocalStorage();
          return {
            activeTopics: interests.activeTopics,
            weights: interests.weights,
            topicCount: interests.activeTopics.length,
            suggestion:
              "Use these interests to curate or generate stories. " +
              "Call openmemoz.add_story to publish personalized content " +
              "based on what the reader follows.",
          };
        },
      },
      options
    ),

    // --- MEMORY LAYER ---
    // Tools 12-14 give agents persistent memory across sessions.
    // Data lives in localStorage (app layer). WebMCP tools are the
    // interface that lets agents read/write it. The agent brings the
    // intelligence; we just provide the storage.

    // 12. get_reading_history — exposes the user's reading behavior
    modelContext.registerTool(
      {
        name: "openmemoz.get_reading_history",
        title: "Get Reading History",
        description:
          "Returns the reader's browsing behavior: which stories they clicked, " +
          "how long they spent reading, and aggregated section preferences. " +
          "Use this to understand what the reader actually consumes (not just " +
          "what they say they want). Combine with get_user_interests for a " +
          "full picture of the reader's preferences.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => buildReadingBehaviorSummary(),
      },
      options
    ),

    // 13. save_memory — agent stores a fact it learned about the reader
    modelContext.registerTool(
      {
        name: "openmemoz.save_memory",
        title: "Save Agent Memory",
        description:
          "Store a fact or observation about the reader for future sessions. " +
          "The memory persists in the reader's browser across page reloads. " +
          "Use this to remember preferences, patterns, or insights you discovered " +
          "while curating content — e.g. 'reader prefers analysis over headlines' " +
          "or 'reader always skips finance stories'. " +
          "Call openmemoz.recall_memories to retrieve stored facts later.",
        inputSchema: {
          type: "object",
          properties: {
            memoryIdentifier: {
              type: "string",
              description:
                "A short unique slug for this memory (e.g. 'pref-long-form', 'skip-finance'). " +
                "Saving with the same identifier overwrites the previous value.",
            },
            content: {
              type: "string",
              description:
                "The fact or observation to remember (e.g. 'Reader prefers long-form analysis over short headlines')",
            },
            category: {
              type: "string",
              description:
                "Category for organizing memories: 'preference', 'behavior', 'feedback', or 'insight'",
            },
          },
          required: ["memoryIdentifier", "content", "category"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ memoryIdentifier, content, category }) => {
          saveAgentMemoryEntry(
            memoryIdentifier as string,
            content as string,
            category as string
          );
          return {
            saved: true,
            memoryIdentifier,
            totalMemories: loadAllAgentMemories().length,
          };
        },
      },
      options
    ),

    // 14. recall_memories — agent retrieves everything it stored
    modelContext.registerTool(
      {
        name: "openmemoz.recall_memories",
        title: "Recall Agent Memories",
        description:
          "Retrieve all facts and observations previously stored about this reader. " +
          "Use this at the start of a session to remember what you learned in " +
          "previous interactions. Memories are organized by category: " +
          "preference, behavior, feedback, insight.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const memories = loadAllAgentMemories();
          return {
            memories,
            totalCount: memories.length,
            categories: [...new Set(memories.map((m) => m.category))],
          };
        },
      },
      options
    ),

    // --- HERO, BATCH, FAVOURITES ---

    // 16. set_hero_story — pin a story as the hero
    modelContext.registerTool(
      {
        name: "openmemoz.set_hero_story",
        title: "Pin Hero Story",
        description:
          "Pin a story as the hero (the large featured story at the top of the page). " +
          "Only one story can be hero at a time — setting a new hero unpins the previous one. " +
          "Pass storyIdentifier to pin, or pass no identifier to clear the hero pin " +
          "(reverts to automatic hero selection based on content scoring).",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier to pin as hero. Omit to clear the hero pin.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target. Defaults to the currently viewed edition.",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          let updatedStories = targetEdition.stories.map((s) =>
            s.isHeroPinned ? { ...s, isHeroPinned: undefined } : s
          );

          if (storyIdentifier) {
            const storyIndex = updatedStories.findIndex(
              (s) => s.storyIdentifier === (storyIdentifier as string)
            );
            if (storyIndex === -1) {
              return { error: { code: "NOT_FOUND", message: `No story found with identifier "${storyIdentifier}".` } };
            }
            updatedStories[storyIndex] = { ...updatedStories[storyIndex], isHeroPinned: true };
          }

          const updatedEdition: Edition = { ...targetEdition, stories: updatedStories };
          onEditionMutated(updatedEdition, targetIndex);

          return {
            heroPinned: !!storyIdentifier,
            storyIdentifier: storyIdentifier || null,
            editionDate: updatedEdition.editionDate,
          };
        },
      },
      options
    ),

    // 17. batch_add_stories — add multiple stories at once
    modelContext.registerTool(
      {
        name: "openmemoz.batch_add_stories",
        title: "Batch Add Stories",
        description:
          "Add multiple stories to an edition in one call. Each story needs headline, excerpt, " +
          "section, and sourceName. Optionally include imageUrl, youtubeVideoId per story. " +
          "Stories are inserted in order at the specified position. Persists via localStorage. " +
          "Omit editionDate to target today's edition; it is created automatically if it does not exist yet.",
        inputSchema: {
          type: "object",
          properties: {
            stories: {
              type: "array",
              description: "Array of story objects to add",
              items: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  excerpt: { type: "string" },
                  section: { type: "string" },
                  sourceName: { type: "string" },
                  sourceUrl: { type: "string" },
                  imageUrl: { type: "string" },
                  youtubeVideoId: { type: "string" },
                  author: { type: "string" },
                  language: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  contentUrl: { type: "string" },
                },
                required: ["headline", "excerpt", "section", "sourceName"],
              },
            },
            position: {
              type: "string",
              description: "Where to insert all stories: 'first' (default) or 'last'.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target in YYYY-MM-DD format. Defaults to today's date. " +
                "If no edition exists for the date, a new empty edition is created automatically.",
            },
          },
          required: ["stories"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ stories: storiesToAdd, position: batchPosition, editionDate }) => {
          const resolved = resolveOrCreateEditionByDateDefaultingToToday(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const storyArray = storiesToAdd as Array<Record<string, unknown>>;
          const newStories: Story[] = [];
          const existingIdentifiers = new Set(targetEdition.stories.map((s) => s.storyIdentifier));

          for (const storyInput of storyArray) {
            const storyIdentifier = (storyInput.headline as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 60);

            if (existingIdentifiers.has(storyIdentifier)) continue;
            existingIdentifiers.add(storyIdentifier);

            const batchVideoId = storyInput.youtubeVideoId ? extractYoutubeVideoId(storyInput.youtubeVideoId as string) : undefined;
            const batchImageUrl = (storyInput.imageUrl as string | undefined)
              || (batchVideoId ? `https://img.youtube.com/vi/${batchVideoId}/hqdefault.jpg` : undefined);

            newStories.push({
              storyIdentifier,
              headline: storyInput.headline as string,
              excerpt: storyInput.excerpt as string,
              section: storyInput.section as string,
              provenanceTier: 2 as const,
              sourceName: storyInput.sourceName as string,
              sourceUrl: (storyInput.sourceUrl as string) || "",
              licenceBasis: "agent-contributed",
              publishedAt: new Date().toISOString(),
              fetchedAt: new Date().toISOString(),
              ...(batchImageUrl ? { imageUrl: batchImageUrl } : {}),
              ...(batchVideoId ? { youtubeVideoId: batchVideoId } : {}),
              ...(storyInput.author ? { author: storyInput.author as string } : {}),
              ...(storyInput.language ? { language: storyInput.language as string } : {}),
              ...(storyInput.tags ? { tags: storyInput.tags as string[] } : {}),
              ...(storyInput.contentUrl ? { contentUrl: storyInput.contentUrl as string } : {}),
            });
          }

          const posStr = (batchPosition as string | undefined) || "first";
          const allStories = posStr === "last"
            ? [...targetEdition.stories, ...newStories]
            : [...newStories, ...targetEdition.stories];

          const allSections = [...new Set(allStories.map((s) => s.section))];

          const updatedEdition: Edition = {
            ...targetEdition,
            stories: allStories,
            storyCount: allStories.length,
            sections: allSections,
          };

          onEditionMutated(updatedEdition, targetIndex);

          return {
            addedCount: newStories.length,
            storyIdentifiers: newStories.map((s) => s.storyIdentifier),
            editionDate: updatedEdition.editionDate,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 18. batch_remove_stories — remove multiple stories at once
    modelContext.registerTool(
      {
        name: "openmemoz.batch_remove_stories",
        title: "Batch Remove Stories",
        description:
          "Remove multiple stories from an edition in one call. " +
          "Pass an array of storyIdentifiers. Persists via localStorage.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifiers: {
              type: "array",
              description: "Array of storyIdentifier strings to remove",
              items: { type: "string" },
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target. Defaults to the currently viewed edition.",
            },
          },
          required: ["storyIdentifiers"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: ({ storyIdentifiers, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const idsToRemove = new Set(storyIdentifiers as string[]);
          const removedStories = targetEdition.stories.filter((s) => idsToRemove.has(s.storyIdentifier));
          const remainingStories = targetEdition.stories.filter((s) => !idsToRemove.has(s.storyIdentifier));
          const remainingSections = [...new Set(remainingStories.map((s) => s.section))];

          const updatedEdition: Edition = {
            ...targetEdition,
            stories: remainingStories,
            storyCount: remainingStories.length,
            sections: remainingSections,
          };

          onEditionMutated(updatedEdition, targetIndex);

          return {
            removedCount: removedStories.length,
            removedIdentifiers: removedStories.map((s) => s.storyIdentifier),
            editionDate: updatedEdition.editionDate,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 19. toggle_favourite — mark/unmark a story as favourite
    modelContext.registerTool(
      {
        name: "openmemoz.toggle_favourite",
        title: "Toggle Favourite",
        description:
          "Mark or unmark a story as a favourite. Favourited stories can be retrieved " +
          "with openmemoz.get_favourites. Use this to let readers bookmark stories they " +
          "want to revisit. Persists via localStorage.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier to toggle favourite on",
            },
            isFavourite: {
              type: "boolean",
              description: "True to favourite, false to unfavourite. Omit to toggle.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target. Defaults to the currently viewed edition.",
            },
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, isFavourite, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const storyIndex = targetEdition.stories.findIndex(
            (s) => s.storyIdentifier === (storyIdentifier as string)
          );
          if (storyIndex === -1) {
            return { error: { code: "NOT_FOUND", message: `No story found with identifier "${storyIdentifier}".` } };
          }

          const currentStory = targetEdition.stories[storyIndex];
          const newFavouriteState = isFavourite !== undefined
            ? (isFavourite as boolean)
            : !currentStory.isFavourite;

          const updatedStories = [...targetEdition.stories];
          updatedStories[storyIndex] = { ...currentStory, isFavourite: newFavouriteState || undefined };

          const updatedEdition: Edition = { ...targetEdition, stories: updatedStories };
          onEditionMutated(updatedEdition, targetIndex);

          return {
            storyIdentifier: currentStory.storyIdentifier,
            headline: currentStory.headline,
            isFavourite: newFavouriteState,
            editionDate: updatedEdition.editionDate,
          };
        },
      },
      options
    ),

    // 20. get_favourites — list all favourited stories across editions
    modelContext.registerTool(
      {
        name: "openmemoz.get_favourites",
        title: "Get Favourites",
        description:
          "List all stories marked as favourite across all loaded editions. " +
          "Returns the story details and which edition they belong to.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const favourites: Array<{ editionDate: string; storyIdentifier: string; headline: string; section: string }> = [];
          for (const ed of allEditions) {
            for (const story of ed.stories) {
              if (story.isFavourite) {
                favourites.push({
                  editionDate: ed.editionDate,
                  storyIdentifier: story.storyIdentifier,
                  headline: story.headline,
                  section: story.section,
                });
              }
            }
          }
          return { favourites, totalCount: favourites.length };
        },
      },
      options
    ),

    // --- THEME CONTROL ---

    // 22. set_color_palette — change the color scheme
    modelContext.registerTool(
      {
        name: "openmemoz.set_color_palette",
        title: "Set Color Palette",
        description:
          "Change the newspaper's color palette. The page updates immediately. " +
          "Available palettes: " + COLOR_PALETTES.map((p) => p.paletteIdentifier).join(", ") + ". " +
          "Persists via localStorage.",
        inputSchema: {
          type: "object",
          properties: {
            paletteIdentifier: {
              type: "string",
              description: "The palette to apply: " + COLOR_PALETTES.map((p) => `'${p.paletteIdentifier}' (${p.displayName})`).join(", "),
            },
          },
          required: ["paletteIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ paletteIdentifier }) => {
          const palette = findPaletteByIdentifier(paletteIdentifier as string);
          if (palette.paletteIdentifier !== (paletteIdentifier as string)) {
            return { error: { code: "NOT_FOUND", message: `Unknown palette "${paletteIdentifier}". Available: ${COLOR_PALETTES.map((p) => p.paletteIdentifier).join(", ")}` } };
          }
          applyPaletteToDocument(palette);
          savePaletteIdentifier(palette.paletteIdentifier);
          return { applied: true, paletteIdentifier: palette.paletteIdentifier, displayName: palette.displayName };
        },
      },
      options
    ),

    // 23. set_visual_style — change the card morphism
    modelContext.registerTool(
      {
        name: "openmemoz.set_visual_style",
        title: "Set Visual Style",
        description:
          "Change the newspaper's visual style (card morphism). " +
          "Available: 'flat' (clean, no effects), 'glass' (frosted glass cards), " +
          "'neu' (neumorphic embossed cards). Persists via localStorage.",
        inputSchema: {
          type: "object",
          properties: {
            styleIdentifier: {
              type: "string",
              description: "'flat', 'glass', or 'neu'",
            },
          },
          required: ["styleIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ styleIdentifier }) => {
          const validStyles = VISUAL_STYLES.map((s) => s.styleIdentifier);
          if (!validStyles.includes(styleIdentifier as VisualStyleIdentifier)) {
            return { error: { code: "INVALID_INPUT", message: `Unknown style "${styleIdentifier}". Available: ${validStyles.join(", ")}` } };
          }
          applyVisualStyleToDocument(styleIdentifier as VisualStyleIdentifier);
          saveVisualStyleIdentifier(styleIdentifier as VisualStyleIdentifier);
          const style = VISUAL_STYLES.find((s) => s.styleIdentifier === styleIdentifier)!;
          return { applied: true, styleIdentifier: style.styleIdentifier, displayName: style.displayName };
        },
      },
      options
    ),

    // 24. get_theme — read current theme settings
    modelContext.registerTool(
      {
        name: "openmemoz.get_theme",
        title: "Get Theme Settings",
        description:
          "Get the current theme settings: color palette and visual style. " +
          "Also lists all available palettes and styles for reference.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          currentPalette: loadSavedPaletteIdentifier(),
          currentVisualStyle: loadSavedVisualStyleIdentifier(),
          availablePalettes: COLOR_PALETTES.map((p) => ({ identifier: p.paletteIdentifier, name: p.displayName })),
          availableStyles: VISUAL_STYLES.map((s) => ({ identifier: s.styleIdentifier, name: s.displayName, description: s.description })),
        }),
      },
      options
    ),

    // 25. reorder_story — move a story to a new position
    modelContext.registerTool(
      {
        name: "openmemoz.reorder_story",
        title: "Reorder Story",
        description:
          "Move a story to a different position within the edition. " +
          "Use 'first', 'last', 'up', 'down', or a specific index (0-based). " +
          "Persists via localStorage.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier to move",
            },
            moveTo: {
              type: "string",
              description: "'first', 'last', 'up' (one position earlier), 'down' (one position later), " +
                "or a number like '3' for a specific 0-based index.",
            },
            editionDate: {
              type: "string",
              description: "Optional edition date to target. Defaults to the currently viewed edition.",
            },
          },
          required: ["storyIdentifier", "moveTo"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, moveTo, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
          if ("error" in resolved) return resolved;
          const { targetEdition, targetIndex } = resolved;

          const currentIndex = targetEdition.stories.findIndex(
            (s) => s.storyIdentifier === (storyIdentifier as string)
          );
          if (currentIndex === -1) {
            return { error: { code: "NOT_FOUND", message: `No story found with identifier "${storyIdentifier}".` } };
          }

          const stories = [...targetEdition.stories];
          const [movedStory] = stories.splice(currentIndex, 1);
          const moveToStr = (moveTo as string).toLowerCase();

          let newIndex: number;
          if (moveToStr === "first") {
            newIndex = 0;
          } else if (moveToStr === "last") {
            newIndex = stories.length;
          } else if (moveToStr === "up") {
            newIndex = Math.max(0, currentIndex - 1);
          } else if (moveToStr === "down") {
            newIndex = Math.min(stories.length, currentIndex + 1);
          } else {
            const parsed = parseInt(moveToStr, 10);
            if (isNaN(parsed)) {
              return { error: { code: "INVALID_INPUT", message: `Invalid moveTo value "${moveTo}". Use 'first', 'last', 'up', 'down', or a number.` } };
            }
            newIndex = Math.max(0, Math.min(stories.length, parsed));
          }

          stories.splice(newIndex, 0, movedStory);

          const updatedEdition: Edition = { ...targetEdition, stories };
          onEditionMutated(updatedEdition, targetIndex);

          return {
            storyIdentifier: movedStory.storyIdentifier,
            headline: movedStory.headline,
            previousIndex: currentIndex,
            newIndex,
            editionDate: updatedEdition.editionDate,
          };
        },
      },
      options
    ),

    // 26. get_approved_sources — list all approved content sources
    modelContext.registerTool(
      {
        name: "openmemoz.get_approved_sources",
        title: "Get Approved Sources",
        description:
          "Returns the list of approved open-licensed content sources that OpenMemoz " +
          "accepts. Stories added via openmemoz.add_story must reference only these " +
          "approved sources or original agent-generated content. Sources from banned " +
          "domains (major news publishers, social media with restrictive terms) will " +
          "be rejected. Use this to discover which sources you can reference.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Optional filter: 'government', 'creative-commons', 'open-api', " +
                "'video', 'academic', 'prediction', 'international'. Omit for all.",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: ({ category }) => {
          const sources = category
            ? APPROVED_SOURCES.filter((s) => s.category === category)
            : APPROVED_SOURCES;
          return {
            approvedSourceCount: sources.length,
            bannedDomainCount: BANNED_DOMAINS.length,
            sources: sources.map((s) => ({
              domain: s.domain,
              name: s.displayName,
              category: s.category,
              licence: s.licenceBasis,
              contentType: s.contentType,
              ...(s.apiEndpoint ? { apiEndpoint: s.apiEndpoint } : {}),
            })),
            note:
              "You may also create original content without a sourceUrl. " +
              "AI-synthesized articles from multiple open sources are encouraged. " +
              "YouTube embedding is always permitted.",
          };
        },
      },
      options
    ),

    // 27. get_banned_domains — list domains that cannot be used as sources
    modelContext.registerTool(
      {
        name: "openmemoz.get_banned_domains",
        title: "Get Banned Domains",
        description:
          "Returns the list of banned domains that OpenMemoz will reject. " +
          "These are copyrighted news publishers and social media platforms " +
          "with restrictive terms. Do NOT use these as sourceUrl in add_story.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          bannedDomainCount: BANNED_DOMAINS.length,
          domains: BANNED_DOMAINS,
          note:
            "These domains are banned because they are copyrighted news publishers " +
            "or social media platforms with restrictive redistribution terms. " +
            "You can still write ORIGINAL content inspired by facts from any source — " +
            "just don't link to banned domains as the sourceUrl.",
        }),
      },
      options
    ),

    // 28. discover_youtube_content — browse curated YouTube channels (no API key needed)
    modelContext.registerTool(
      {
        name: "openmemoz.discover_youtube_content",
        title: "Discover YouTube Content",
        description:
          "Discover recent videos from curated YouTube news channels. Returns " +
          "titles, thumbnails, and video URLs from approved channels across " +
          "Tech, Science, World, Finance, Space, Sports, and Health categories. " +
          "No API key needed — uses public RSS feeds. Use this to find videos " +
          "to add as stories, or search YouTube yourself and use openmemoz.add_story " +
          "with the video URL directly.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "Optional filter: 'Tech', 'Science', 'World', 'Finance', " +
                "'Space', 'Sports', 'Health'. Omit for all categories.",
            },
            limit: {
              type: "number",
              description: "Max videos to return (default 10, max 50).",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async ({ category, limit }) => {
          try {
            const params = new URLSearchParams();
            if (category) params.set("category", category as string);
            if (limit) params.set("limit", String(limit));
            const response = await fetch(
              `${window.location.origin}/api/youtube/discover?${params.toString()}`
            );
            if (!response.ok) {
              return { error: { code: "FETCH_FAILED", message: `Discovery API returned ${response.status}` } };
            }
            return await response.json();
          } catch (err) {
            return { error: { code: "NETWORK_ERROR", message: String(err) } };
          }
        },
      },
      options
    ),
    // 29. discover_bluesky_trending — trending posts from Bluesky (no auth)
    modelContext.registerTool(
      {
        name: "openmemoz.discover_bluesky_trending",
        title: "Discover Bluesky Trending",
        description:
          "Discover trending posts on Bluesky (AT Protocol). Returns top posts " +
          "with text, author, engagement counts, and any external links shared. " +
          "No API key needed — uses Bluesky's public API. Great for finding " +
          "trending topics and news links from the decentralized social network.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max posts to return (default 10, max 50).",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async ({ limit }) => {
          try {
            const params = new URLSearchParams();
            if (limit) params.set("limit", String(limit));
            const response = await fetch(
              `${window.location.origin}/api/social/bluesky?${params.toString()}`
            );
            if (!response.ok) {
              return { error: { code: "FETCH_FAILED", message: `Bluesky API returned ${response.status}` } };
            }
            return await response.json();
          } catch (err) {
            return { error: { code: "NETWORK_ERROR", message: String(err) } };
          }
        },
      },
      options
    ),

    // 30. discover_mastodon_trending — trending links and hashtags from Mastodon (no auth)
    modelContext.registerTool(
      {
        name: "openmemoz.discover_mastodon_trending",
        title: "Discover Mastodon Trending",
        description:
          "Discover trending links and hashtags on Mastodon (ActivityPub). " +
          "Returns the most-shared news links and popular hashtags across " +
          "the fediverse. No API key needed. Optionally specify an instance " +
          "(default: mastodon.social). Available instances: mastodon.social, " +
          "hachyderm.io (tech), fosstodon.org (FOSS).",
        inputSchema: {
          type: "object",
          properties: {
            instance: {
              type: "string",
              description: "Mastodon instance to query (default: mastodon.social). Try hachyderm.io for tech, fosstodon.org for FOSS.",
            },
            limit: {
              type: "number",
              description: "Max trending links to return (default 10, max 40).",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async ({ instance, limit }) => {
          try {
            const params = new URLSearchParams();
            if (instance) params.set("instance", instance as string);
            if (limit) params.set("limit", String(limit));
            const response = await fetch(
              `${window.location.origin}/api/social/mastodon?${params.toString()}`
            );
            if (!response.ok) {
              return { error: { code: "FETCH_FAILED", message: `Mastodon API returned ${response.status}` } };
            }
            return await response.json();
          } catch (err) {
            return { error: { code: "NETWORK_ERROR", message: String(err) } };
          }
        },
      },
      options
    ),
    // 31. discover_web_content — trending stories from Hacker News, Federal Register, and other approved web sources
    modelContext.registerTool(
      {
        name: "openmemoz.discover_web_content",
        title: "Discover Web Content",
        description:
          "Discover trending stories from approved web sources beyond YouTube, Bluesky, and Mastodon. " +
          "Currently fetches from Hacker News (tech, startups, AI) and Federal Register (government policy, regulations). " +
          "Returns stories with headlines, excerpts, source URLs, and engagement scores. " +
          "All sources are from the approved list (~90 domains). No API key needed.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max stories per source to return (default 10, max 30).",
            },
            sources: {
              type: "string",
              description: "Comma-separated source names to query. Options: hackernews, federalregister. Default: all.",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async ({ limit, sources }) => {
          try {
            const params = new URLSearchParams();
            if (limit) params.set("limit", String(limit));
            if (sources) params.set("sources", sources as string);
            const response = await fetch(
              `${window.location.origin}/api/web/discover?${params.toString()}`
            );
            if (!response.ok) {
              return { error: { code: "FETCH_FAILED", message: `Web discover API returned ${response.status}` } };
            }
            return await response.json();
          } catch (err) {
            return { error: { code: "NETWORK_ERROR", message: String(err) } };
          }
        },
      },
      options
    ),
    // 33. clear_user_data — nuclear option to wipe localStorage content
    modelContext.registerTool(
      {
        name: "openmemoz.clear_user_data",
        title: "Clear User Data",
        description:
          "Clear user-generated content from localStorage. Use 'all' to wipe " +
          "everything (stories, themes, memories, reading history). Use 'stories' " +
          "to reset editions to defaults only. Use 'older_than_days' with a number " +
          "to remove stories added more than N days ago. This is destructive and " +
          "cannot be undone.",
        inputSchema: {
          type: "object",
          properties: {
            scope: {
              type: "string",
              description: "'all' — wipe everything. 'stories' — reset editions only. " +
                "'older_than_days' — remove stories older than N days (requires 'days' param).",
            },
            days: {
              type: "number",
              description: "Required when scope is 'older_than_days'. Remove stories added more than this many days ago.",
            },
          },
          required: ["scope"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: ({ scope, days }) => {
          const scopeStr = scope as string;

          if (scopeStr === "all") {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith("openmemoz_")) keysToRemove.push(key);
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
            return { cleared: "all", keysRemoved: keysToRemove.length, note: "Refresh the page to reload default editions." };
          }

          if (scopeStr === "stories") {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith("openmemoz_edition_")) keysToRemove.push(key);
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
            return { cleared: "stories", keysRemoved: keysToRemove.length, note: "Refresh the page to reload default editions." };
          }

          if (scopeStr === "older_than_days" && typeof days === "number") {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffIso = cutoffDate.toISOString();
            let totalRemoved = 0;

            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (!key?.startsWith("openmemoz_edition_")) continue;
              try {
                const editionData = JSON.parse(localStorage.getItem(key) || "{}");
                if (!editionData.stories) continue;
                const before = editionData.stories.length;
                editionData.stories = editionData.stories.filter(
                  (s: { fetchedAt?: string }) => !s.fetchedAt || s.fetchedAt >= cutoffIso
                );
                if (editionData.stories.length < before) {
                  totalRemoved += before - editionData.stories.length;
                  editionData.storyCount = editionData.stories.length;
                  localStorage.setItem(key, JSON.stringify(editionData));
                }
              } catch { /* skip malformed */ }
            }
            return { cleared: `stories_older_than_${days}_days`, storiesRemoved: totalRemoved };
          }

          return { error: { code: "INVALID_SCOPE", message: "Use 'all', 'stories', or 'older_than_days'." } };
        },
      },
      options
    ),
    // 34. export_data — export all localStorage content as JSON
    modelContext.registerTool(
      {
        name: "openmemoz.export_data",
        title: "Export All Data",
        description:
          "Export all OpenMemoz data from localStorage as a JSON object. " +
          "Returns editions, themes, memories, reading history, and interests. " +
          "Useful for backup or migration. Videos and images are stored as " +
          "external URLs (not binary data).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const exportData: Record<string, unknown> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith("openmemoz_")) continue;
            try {
              exportData[key] = JSON.parse(localStorage.getItem(key) || "null");
            } catch {
              exportData[key] = localStorage.getItem(key);
            }
          }
          const totalKeys = Object.keys(exportData).length;
          const sizeBytes = new Blob([JSON.stringify(exportData)]).size;
          return {
            exportedKeys: totalKeys,
            sizeBytes,
            sizeReadable: sizeBytes < 1024 ? `${sizeBytes}B` : `${(sizeBytes / 1024).toFixed(1)}KB`,
            data: exportData,
          };
        },
      },
      options
    ),
    // 35. format_for_delivery — package content for any destination
    modelContext.registerTool(
      {
        name: "openmemoz.format_for_delivery",
        title: "Format for Delivery",
        description:
          "Package stories for delivery outside OpenMemoz. Returns formatted content " +
          "the agent can present in chat or copy into an email, social post, or another service. " +
          "Formats: 'briefing' (structured markdown summary), 'social' (short-form per story " +
          "for social media posts), 'newsletter' (full email-ready markdown with sections), " +
          "'html' (rich HTML page with YouTube embeds and images — ready to open in a browser), " +
          "'data' (clean typed JSON array of Story objects). " +
          "Pass specific storyIdentifiers or omit for the full edition. " +
          "The agent decides the destination — paste in chat, email it, post it, " +
          "or use it to populate another WebMCP page.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "'briefing', 'social', 'newsletter', 'html', or 'data'",
            },
            storyIdentifiers: {
              type: "array",
              description: "Optional array of storyIdentifier strings. Omit for all stories.",
              items: { type: "string" },
            },
            maxStories: {
              type: "number",
              description: "Optional limit on number of stories to include (default: all).",
            },
          },
          required: ["format"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: ({ format, storyIdentifiers, maxStories }) => {
          let stories = edition.stories;
          if (storyIdentifiers && (storyIdentifiers as string[]).length > 0) {
            const ids = new Set(storyIdentifiers as string[]);
            stories = stories.filter((s) => ids.has(s.storyIdentifier));
          }
          if (maxStories) {
            stories = stories.slice(0, maxStories as number);
          }
          if (stories.length === 0) {
            return { error: { code: "NO_STORIES", message: "No matching stories found." } };
          }

          const formatStr = format as string;

          if (formatStr === "briefing") {
            const lines = [
              `# OpenMemoz Briefing — ${edition.editionDate}`,
              `${stories.length} stories across ${[...new Set(stories.map((s) => s.section))].join(", ")}`,
              "",
            ];
            for (const s of stories) {
              lines.push(`## ${s.headline}`);
              lines.push(`**${s.section}** · ${s.sourceName} · Tier ${s.provenanceTier}`);
              lines.push(s.excerpt);
              if (s.sourceUrl) lines.push(`Source: ${s.sourceUrl}`);
              if (s.youtubeVideoId) lines.push(`Video: https://www.youtube.com/watch?v=${s.youtubeVideoId}`);
              lines.push("");
            }
            return { format: "briefing", storyCount: stories.length, content: lines.join("\n") };
          }

          if (formatStr === "social") {
            const posts = stories.map((s) => ({
              storyIdentifier: s.storyIdentifier,
              text: `${s.headline}\n\n${s.excerpt.split(".")[0]}.`,
              source: s.sourceName,
              link: s.youtubeVideoId
                ? `https://www.youtube.com/watch?v=${s.youtubeVideoId}`
                : s.sourceUrl || null,
              section: s.section,
            }));
            return { format: "social", storyCount: posts.length, posts };
          }

          if (formatStr === "newsletter") {
            const sections = [...new Set(stories.map((s) => s.section))];
            const lines = [
              `# OpenMemoz — Edition ${edition.editionNumber}`,
              `*${edition.editionDate} · ${stories.length} stories · ${sections.length} sections*`,
              "",
              "---",
              "",
            ];
            for (const section of sections) {
              lines.push(`## ${section}`);
              lines.push("");
              for (const s of stories.filter((st) => st.section === section)) {
                lines.push(`### ${s.headline}`);
                lines.push(s.excerpt);
                if (s.sourceUrl) lines.push(`*Source: [${s.sourceName}](${s.sourceUrl})*`);
                if (s.youtubeVideoId) lines.push(`*Watch: [YouTube](https://www.youtube.com/watch?v=${s.youtubeVideoId})*`);
                lines.push("");
              }
            }
            lines.push("---");
            lines.push("*Curated by AI agents on OpenMemoz. Content from approved open sources only.*");
            return { format: "newsletter", storyCount: stories.length, sectionCount: sections.length, content: lines.join("\n") };
          }

          if (formatStr === "html") {
            const sections = [...new Set(stories.map((s) => s.section))];
            const storyCards = stories.map((s) => {
              const mediaHtml = s.youtubeVideoId
                ? `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;margin-bottom:12px"><iframe src="https://www.youtube-nocookie.com/embed/${s.youtubeVideoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
                : s.imageUrl
                  ? `<img src="${s.imageUrl}" alt="${s.headline}" style="width:100%;border-radius:8px;margin-bottom:12px">`
                  : "";
              return `<article style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(212,168,67,0.15)">
  <span style="display:inline-block;background:rgba(212,168,67,0.15);color:#D4A843;padding:2px 10px;border-radius:4px;font-size:11px;font-family:system-ui;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">${s.section}</span>
  <h2 style="font-size:22px;margin:4px 0 8px;line-height:1.2">${s.headline}</h2>
  ${mediaHtml}
  <p style="color:#c8c8d0;line-height:1.7;margin:8px 0">${s.excerpt}</p>
  <p style="font-size:12px;color:#9C9CB0">${s.sourceName} · Tier ${s.provenanceTier}${s.sourceUrl ? ` · <a href="${s.sourceUrl}" style="color:#D4A843">${s.sourceUrl}</a>` : ""}</p>
</article>`;
            }).join("\n");

            const htmlContent = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenMemoz Edition</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;max-width:740px;margin:0 auto;padding:40px 24px;background:#0A0908;color:#EDEDF0}
a{color:#D4A843;text-decoration:none}a:hover{text-decoration:underline}
.header{text-align:center;border-bottom:3px solid #D4A843;padding-bottom:16px;margin-bottom:32px}
.header h1{font-size:36px;margin:0;letter-spacing:-0.5px}
.header p{color:#9C9CB0;font-size:14px;margin-top:4px}
.footer{text-align:center;font-size:12px;color:#5C5C72;margin-top:48px;padding-top:20px;border-top:1px solid rgba(212,168,67,0.2)}
</style></head><body>
<div class="header">
  <h1>OpenMemoz<span style="color:#D4A843">.</span></h1>
  <p>Edition ${edition.editionNumber} · ${edition.editionDate} · ${stories.length} stories · ${sections.length} sections</p>
</div>
${storyCards}
<div class="footer">Delivered by <strong>openmemoz.format_for_delivery</strong> · Content from approved open sources only</div>
</body></html>`;

            return { format: "html", storyCount: stories.length, sectionCount: sections.length, content: htmlContent };
          }

          if (formatStr === "data") {
            return {
              format: "data",
              editionDate: edition.editionDate,
              storyCount: stories.length,
              stories: stories.map((s) => ({
                storyIdentifier: s.storyIdentifier,
                headline: s.headline,
                excerpt: s.excerpt,
                section: s.section,
                provenanceTier: s.provenanceTier,
                sourceName: s.sourceName,
                sourceUrl: s.sourceUrl,
                licenceBasis: s.licenceBasis,
                youtubeVideoId: s.youtubeVideoId || null,
                imageUrl: s.imageUrl || null,
                author: s.author || null,
                language: s.language || null,
                tags: s.tags || null,
                contentUrl: s.contentUrl || null,
                dateModified: s.dateModified || null,
              })),
            };
          }

          return { error: { code: "INVALID_FORMAT", message: "Use 'briefing', 'social', 'newsletter', 'html', or 'data'." } };
        },
      },
      options
    ),
    // 36. set_user_interests — let agents onboard users by setting topic preferences
    modelContext.registerTool(
      {
        name: "openmemoz.set_user_interests",
        title: "Set User Interests",
        description:
          "Update the reader's topic interests and weights. Use this to onboard new readers, " +
          "adjust preferences based on reading behavior, or let the reader tell the agent what " +
          "they care about. Available topics: " + AVAILABLE_TOPICS.join(", ") + ". " +
          "Pass activeTopics (array of topic strings to enable) and/or weights (object mapping " +
          "topic names to 0-100 priority scores). Higher weights mean the topic appears more " +
          "prominently. This is the standard WebMCP interest onboarding pattern — any page " +
          "can adopt the same schema.",
        inputSchema: {
          type: "object",
          properties: {
            activeTopics: {
              type: "array",
              description: "Topics to enable. Available: " + AVAILABLE_TOPICS.join(", "),
              items: { type: "string" },
            },
            weights: {
              type: "object",
              description: "Topic name → priority score (0-100). Higher = more prominent.",
            },
            addTopics: {
              type: "array",
              description: "Topics to add to existing active list (without replacing).",
              items: { type: "string" },
            },
            removeTopics: {
              type: "array",
              description: "Topics to remove from active list.",
              items: { type: "string" },
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ activeTopics, weights, addTopics, removeTopics }) => {
          const current = loadUserInterestsFromLocalStorage();

          if (activeTopics) {
            current.activeTopics = (activeTopics as string[]).filter((t) => AVAILABLE_TOPICS.includes(t));
          }
          if (addTopics) {
            for (const topic of addTopics as string[]) {
              if (AVAILABLE_TOPICS.includes(topic) && !current.activeTopics.includes(topic)) {
                current.activeTopics.push(topic);
              }
            }
          }
          if (removeTopics) {
            const toRemove = new Set(removeTopics as string[]);
            current.activeTopics = current.activeTopics.filter((t) => !toRemove.has(t));
          }
          if (weights) {
            const weightMap = weights as Record<string, number>;
            for (const [topic, weight] of Object.entries(weightMap)) {
              if (typeof weight === "number") {
                current.weights[topic] = Math.max(0, Math.min(100, weight));
              }
            }
          }

          saveUserInterestsToLocalStorage(current);
          return {
            updated: true,
            activeTopics: current.activeTopics,
            weights: current.weights,
            availableTopics: AVAILABLE_TOPICS,
          };
        },
      },
      options
    ),

    // 37. configure_auto_curation — manage the scheduled curation system
    modelContext.registerTool(
      {
        name: "openmemoz.configure_auto_curation",
        title: "Configure Auto-Curation",
        description:
          "Manage the automatic content curation scheduler. The scheduler periodically " +
          "discovers content from YouTube, Bluesky, Mastodon, and approved web sources (Hacker News, Federal Register) and adds the best stories " +
          "to the edition automatically. Actions: 'status' (check current state), " +
          "'enable' (start the scheduler), 'disable' (stop it), 'run_now' (trigger one " +
          "curation run immediately), 'configure' (update settings like interval, max stories, " +
          "or which sources to use).",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "'status', 'enable', 'disable', 'run_now', or 'configure'",
            },
            intervalHours: {
              type: "number",
              description: "Hours between runs (default 24). Only used with 'configure' or 'enable'.",
            },
            maxStoriesPerRun: {
              type: "number",
              description: "Max stories to add per run (default 5). Only used with 'configure' or 'enable'.",
            },
            enableYoutube: { type: "boolean", description: "Include YouTube in discovery (default true)." },
            enableBluesky: { type: "boolean", description: "Include Bluesky in discovery (default true)." },
            enableMastodon: { type: "boolean", description: "Include Mastodon in discovery (default true)." },
            enableWeb: { type: "boolean", description: "Include web sources (Hacker News, Federal Register) in discovery (default true)." },
          },
          required: ["action"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async ({ action, intervalHours, maxStoriesPerRun, enableYoutube, enableBluesky, enableMastodon, enableWeb }) => {
          const actionStr = action as string;

          if (actionStr === "status") {
            return { ...getAutoCurationStatus(), config: loadAutoCurationConfig() };
          }

          if (actionStr === "enable") {
            const config = loadAutoCurationConfig();
            config.isEnabled = true;
            if (typeof intervalHours === "number") config.intervalHours = intervalHours;
            if (typeof maxStoriesPerRun === "number") config.maxStoriesPerRun = maxStoriesPerRun;
            if (typeof enableYoutube === "boolean") config.sources.youtube = enableYoutube;
            if (typeof enableBluesky === "boolean") config.sources.bluesky = enableBluesky;
            if (typeof enableMastodon === "boolean") config.sources.mastodon = enableMastodon;
            if (typeof enableWeb === "boolean") config.sources.web = enableWeb;
            saveAutoCurationConfig(config);
            startAutoCurationScheduler();
            return { enabled: true, config, status: getAutoCurationStatus() };
          }

          if (actionStr === "disable") {
            const config = loadAutoCurationConfig();
            config.isEnabled = false;
            saveAutoCurationConfig(config);
            stopAutoCurationScheduler();
            return { enabled: false, status: getAutoCurationStatus() };
          }

          if (actionStr === "run_now") {
            const logEntry = await runAutoCurationOnce();
            return logEntry
              ? { ran: true, storiesAdded: logEntry.storiesAddedCount, addedIdentifiers: logEntry.addedStoryIdentifiers, errors: logEntry.sourceErrors }
              : { ran: false, reason: "A curation run is already in progress." };
          }

          if (actionStr === "configure") {
            const config = loadAutoCurationConfig();
            if (typeof intervalHours === "number") config.intervalHours = intervalHours;
            if (typeof maxStoriesPerRun === "number") config.maxStoriesPerRun = maxStoriesPerRun;
            if (typeof enableYoutube === "boolean") config.sources.youtube = enableYoutube;
            if (typeof enableBluesky === "boolean") config.sources.bluesky = enableBluesky;
            if (typeof enableMastodon === "boolean") config.sources.mastodon = enableMastodon;
            if (typeof enableWeb === "boolean") config.sources.web = enableWeb;
            saveAutoCurationConfig(config);
            if (config.isEnabled) startAutoCurationScheduler();
            return { configured: true, config };
          }

          return { error: { code: "INVALID_ACTION", message: "Use 'status', 'enable', 'disable', 'run_now', or 'configure'." } };
        },
      },
      options
    ),
  ]);
}
