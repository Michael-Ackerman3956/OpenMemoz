import { Edition, Story } from "./types";
import { loadUserInterestsFromLocalStorage } from "@/components/InterestsScreen";
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

  void Promise.all([
    // 1. get_edition
    modelContext.registerTool(
      {
        name: "newsroom.get_edition",
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
        name: "newsroom.list_editions",
        description:
          "List all available edition dates. Use this to discover which dates can be " +
          "targeted when adding, removing, or updating stories with the editionDate parameter.",
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
        name: "newsroom.search_stories",
        description:
          "Search today's edition by keyword. Each result includes a provenance tier: " +
          "tier 1 is the source's own text and may be quoted; tier 2 is an " +
          "AI summary and must not be presented as a direct quote. " +
          "Use a returned storyIdentifier with newsroom.get_story for full details.",
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
          return {
            resultCount: matchingStories.length,
            results: matchingStories.map((story) => ({
              storyIdentifier: story.storyIdentifier,
              headline: story.headline,
              section: story.section,
              provenanceTier: story.provenanceTier,
              sourceName: story.sourceName,
              excerpt: story.excerpt,
            })),
          };
        },
      },
      options
    ),

    // 3. get_story
    modelContext.registerTool(
      {
        name: "newsroom.get_story",
        description:
          "Get a single story in full detail, including its licence basis, " +
          "source attribution, and citations if AI-synthesized. " +
          "Use the storyIdentifier from newsroom.get_edition or newsroom.search_stories.",
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
                  "No story found with that identifier. Use newsroom.get_edition to list available stories.",
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
        name: "newsroom.get_reading_context",
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
        name: "newsroom.set_section_filter",
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
        name: "newsroom.explain_connections",
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
        name: "newsroom.get_youtube_video",
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
            geminiApiKey: {
              type: "string",
              description:
                "Optional Google Gemini API key for full video analysis (audio + visual frames). " +
                "Free at ai.google.dev. Without this, only transcript + metadata are returned.",
            },
            analysisPrompt: {
              type: "string",
              description:
                "Optional custom prompt for Gemini video analysis. " +
                "Only used when geminiApiKey is provided.",
            },
          },
          required: ["videoUrl"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async ({ videoUrl, geminiApiKey, analysisPrompt }) => {
          try {
            const hasApiKey = geminiApiKey && (geminiApiKey as string).length > 0;
            const response = hasApiKey
              ? await fetch("/api/youtube/metadata", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ videoUrl, geminiApiKey, analysisPrompt }),
                })
              : await fetch(
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
        name: "newsroom.add_story",
        description:
          "Add a new story to an edition. The page updates immediately and changes " +
          "persist in the reader's browser via localStorage. Optionally include an " +
          "image URL or YouTube video ID for rich display. Target a specific edition " +
          "date, or omit editionDate to add to the currently viewed edition.",
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
                "Use newsroom.get_edition to see available sections, or create a new one.",
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
              description: "Optional edition date to target (e.g. '2026-09-02'). Defaults to the currently viewed edition.",
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
          },
          required: ["headline", "excerpt", "section", "sourceName"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ headline, excerpt, section, sourceName, sourceUrl, imageUrl, youtubeVideoId, editionDate, position, pinAsHero }) => {
          const resolved = resolveEditionByDate(editionDate);
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
        name: "newsroom.remove_story",
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
        annotations: { readOnlyHint: false },
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
        name: "newsroom.update_story",
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
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, headline, excerpt, section, sourceName, sourceUrl, imageUrl, youtubeVideoId, editionDate }) => {
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
        name: "newsroom.get_user_interests",
        description:
          "Returns the reader's chosen topics and weights. Use this to understand " +
          "what the reader cares about before generating or curating stories. " +
          "Topics with higher weights should appear more prominently. " +
          "Combine with newsroom.add_story to create personalized content.",
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
              "Call newsroom.add_story to publish personalized content " +
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
        name: "newsroom.get_reading_history",
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
        name: "newsroom.save_memory",
        description:
          "Store a fact or observation about the reader for future sessions. " +
          "The memory persists in the reader's browser across page reloads. " +
          "Use this to remember preferences, patterns, or insights you discovered " +
          "while curating content — e.g. 'reader prefers analysis over headlines' " +
          "or 'reader always skips finance stories'. " +
          "Call newsroom.recall_memories to retrieve stored facts later.",
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
        name: "newsroom.recall_memories",
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
        name: "newsroom.set_hero_story",
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
        name: "newsroom.batch_add_stories",
        description:
          "Add multiple stories to an edition in one call. Each story needs headline, excerpt, " +
          "section, and sourceName. Optionally include imageUrl, youtubeVideoId per story. " +
          "Stories are inserted in order at the specified position. Persists via localStorage.",
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
              description: "Optional edition date to target. Defaults to the currently viewed edition.",
            },
          },
          required: ["stories"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ stories: storiesToAdd, position: batchPosition, editionDate }) => {
          const resolved = resolveEditionByDate(editionDate);
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
        name: "newsroom.batch_remove_stories",
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
        annotations: { readOnlyHint: false },
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
        name: "newsroom.toggle_favourite",
        description:
          "Mark or unmark a story as a favourite. Favourited stories can be retrieved " +
          "with newsroom.get_favourites. Use this to let readers bookmark stories they " +
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
        name: "newsroom.get_favourites",
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
        name: "newsroom.set_color_palette",
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
        name: "newsroom.set_visual_style",
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
        name: "newsroom.get_theme",
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
        name: "newsroom.reorder_story",
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
  ]);
}
