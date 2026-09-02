import { Edition } from "./types";
import { loadUserInterestsFromLocalStorage } from "@/components/InterestsScreen";

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
  getCurrentSectionFilter: () => string,
  setCurrentSectionFilter: (section: string) => void,
  onEditionMutated: (updatedEdition: Edition) => void,
  abortSignal: AbortSignal
): void {
  // Chrome 150+ uses document.modelContext; Chrome 146–149 used navigator.modelContext
  const modelContext = document.modelContext ?? (navigator as unknown as { modelContext?: typeof document.modelContext }).modelContext;
  if (typeof modelContext?.registerTool !== "function") return;

  const options = { signal: abortSignal };

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

    // 2. search_stories
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

    // 8. add_story
    modelContext.registerTool(
      {
        name: "newsroom.add_story",
        description:
          "Add a new story to the current edition. The page updates immediately. " +
          "The story appears in the specified section. A unique storyIdentifier is " +
          "generated automatically from the headline. Changes are in-memory only " +
          "and do not persist across page reloads.",
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
                "Section to place the story in (e.g. 'Tech', 'Science', 'Climate'). " +
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
          },
          required: ["headline", "excerpt", "section", "sourceName"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ headline, excerpt, section, sourceName, sourceUrl }) => {
          const storyIdentifier = (headline as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 60);

          const isDuplicateIdentifier = edition.stories.some(
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

          const newStory = {
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
          };

          const sectionStr = section as string;
          const updatedSections = edition.sections.includes(sectionStr)
            ? edition.sections
            : [...edition.sections, sectionStr];

          const updatedEdition: Edition = {
            ...edition,
            stories: [newStory, ...edition.stories],
            storyCount: edition.storyCount + 1,
            sections: updatedSections,
          };

          onEditionMutated(updatedEdition);

          return {
            added: true,
            storyIdentifier,
            section: sectionStr,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 9. remove_story
    modelContext.registerTool(
      {
        name: "newsroom.remove_story",
        description:
          "Remove a story from the current edition by its storyIdentifier. " +
          "The page updates immediately. Changes are in-memory only.",
        inputSchema: {
          type: "object",
          properties: {
            storyIdentifier: {
              type: "string",
              description: "The storyIdentifier of the story to remove",
            },
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier }) => {
          const storyIndex = edition.stories.findIndex(
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

          const removedStory = edition.stories[storyIndex];
          const remainingStories = edition.stories.filter(
            (_, i) => i !== storyIndex
          );
          const remainingSections = [
            ...new Set(remainingStories.map((s) => s.section)),
          ];

          const updatedEdition: Edition = {
            ...edition,
            stories: remainingStories,
            storyCount: remainingStories.length,
            sections: remainingSections,
          };

          onEditionMutated(updatedEdition);

          return {
            removed: true,
            storyIdentifier: removedStory.storyIdentifier,
            headline: removedStory.headline,
            totalStoryCount: updatedEdition.storyCount,
          };
        },
      },
      options
    ),

    // 10. update_story
    modelContext.registerTool(
      {
        name: "newsroom.update_story",
        description:
          "Update fields of an existing story. Pass the storyIdentifier and any " +
          "fields to change (headline, excerpt, section). The page updates immediately. " +
          "Changes are in-memory only.",
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
          },
          required: ["storyIdentifier"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: ({ storyIdentifier, headline, excerpt, section }) => {
          const storyIndex = edition.stories.findIndex(
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

          const updatedStory = { ...edition.stories[storyIndex] };
          if (headline) updatedStory.headline = headline as string;
          if (excerpt) updatedStory.excerpt = excerpt as string;
          if (section) updatedStory.section = section as string;

          const updatedStories = [...edition.stories];
          updatedStories[storyIndex] = updatedStory;

          const updatedSections = [...new Set(updatedStories.map((s) => s.section))];

          const updatedEdition: Edition = {
            ...edition,
            stories: updatedStories,
            sections: updatedSections,
          };

          onEditionMutated(updatedEdition);

          return {
            updated: true,
            storyIdentifier: updatedStory.storyIdentifier,
            headline: updatedStory.headline,
            section: updatedStory.section,
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
  ]);
}
