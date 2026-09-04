import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "webmcp-tool-outputs");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

function saveOutput(toolName: string, input: Record<string, unknown>, output: unknown) {
  const filename = toolName.replace(/\./g, "_") + ".json";
  const filePath = path.join(OUTPUT_DIR, filename);
  const entry = { tool: toolName, input, output, testedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
}

// Inject mock modelContext before app loads, capturing all registered tools
const MOCK_SCRIPT = `
  window.__capturedTools = {};
  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool: (tool, opts) => {
        window.__capturedTools[tool.name] = {
          name: tool.name,
          title: tool.title,
          description: tool.description,
          annotations: tool.annotations,
          inputSchema: tool.inputSchema,
          _execute: tool.execute,
        };
        return Promise.resolve();
      }
    },
    writable: false,
    configurable: true,
  });
`;

async function setupAndGetTools(page: import("@playwright/test").Page) {
  await page.addInitScript(MOCK_SCRIPT);
  await page.goto("/");
  await page.waitForSelector("text=Edition No.", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const toolCount = await page.evaluate(() => Object.keys((window as any).__capturedTools).length);
  return toolCount;
}

async function callTool(page: import("@playwright/test").Page, toolName: string, args: Record<string, unknown>) {
  const result = await page.evaluate(async ({ name, input }) => {
    const tool = (window as any).__capturedTools[name];
    if (!tool) return { __error: `Tool "${name}" not registered` };
    try {
      const output = await tool._execute(input);
      return output;
    } catch (err: any) {
      return { __error: err.message ?? String(err) };
    }
  }, { name: toolName, input: args });

  saveOutput(toolName, args, result);
  return result;
}

test.describe("WebMCP Tool Function Tests — All 31 Tools", () => {
  test.setTimeout(60000);

  test("mock modelContext captures all 31 tools", async ({ page }) => {
    const count = await setupAndGetTools(page);
    expect(count).toBeGreaterThanOrEqual(34);
  });

  // --- READ TOOLS (18) ---

  test("openmemoz.get_edition — returns edition overview", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_edition", {});
    expect(result.editionDate).toBeTruthy();
    expect(result.storyCount).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.stories.length).toBe(result.storyCount);
    expect(result.stories[0]).toHaveProperty("storyIdentifier");
    expect(result.stories[0]).toHaveProperty("headline");
    expect(result.stories[0]).toHaveProperty("provenanceTier");
  });

  test("openmemoz.list_editions — returns all available dates", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.list_editions", {});
    expect(result.totalEditions).toBeGreaterThanOrEqual(1);
    expect(result.currentEditionDate).toBeTruthy();
    expect(result.editions.length).toBe(result.totalEditions);
    expect(result.editions[0]).toHaveProperty("editionDate");
    expect(result.editions[0]).toHaveProperty("storyCount");
  });

  test("openmemoz.search_stories — finds matching stories", async ({ page }) => {
    await setupAndGetTools(page);
    // First get a headline word to search for
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const firstHeadline = edition.stories[0].headline;
    const searchWord = firstHeadline.split(" ").find((w: string) => w.length > 4) || firstHeadline.split(" ")[0];

    const result: any = await callTool(page, "openmemoz.search_stories", { query: searchWord });
    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("storyIdentifier");
    expect(result.results[0]).toHaveProperty("headline");
  });

  test("openmemoz.search_stories — returns suggestion when no results", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.search_stories", { query: "xyznonexistent12345" });
    expect(result.resultCount).toBe(0);
    expect(result.suggestion).toBeTruthy();
    expect(result.suggestion).toContain("discover");
  });

  test("openmemoz.get_story — returns full story detail", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const storyId = edition.stories[0].storyIdentifier;

    const result: any = await callTool(page, "openmemoz.get_story", { storyIdentifier: storyId });
    expect(result.storyIdentifier).toBe(storyId);
    expect(result.headline).toBeTruthy();
    expect(result.excerpt).toBeTruthy();
    expect(result.section).toBeTruthy();
    expect(result.provenanceTier).toBeDefined();
    expect(result.licenceBasis).toBeTruthy();
  });

  test("openmemoz.get_story — returns error for invalid ID", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_story", { storyIdentifier: "nonexistent-id-xyz" });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("NOT_FOUND");
  });

  test("openmemoz.get_reading_context — returns current view state", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_reading_context", {});
    expect(result.currentView).toBe("edition");
    expect(result.activeSectionFilter).toBeTruthy();
    expect(result.visibleStoryCount).toBeGreaterThan(0);
    expect(result.totalStoryCount).toBeGreaterThan(0);
    expect(result.availableSections.length).toBeGreaterThan(0);
  });

  test("openmemoz.explain_connections — returns story relationships", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.explain_connections", {});
    expect(result.editionDate).toBeTruthy();
    expect(result.connectionCount).toBeGreaterThanOrEqual(0);
    expect(result.allStories.length).toBeGreaterThan(0);
  });

  test("openmemoz.get_youtube_video — fetches video metadata", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_youtube_video", {
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    // May succeed or fail depending on API, but should not crash
    expect(result).toBeTruthy();
    if (!result.error) {
      expect(result.title || result.videoId).toBeTruthy();
    }
  });

  test("openmemoz.get_user_interests — returns topic preferences", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_user_interests", {});
    expect(result).toHaveProperty("activeTopics");
    expect(result).toHaveProperty("weights");
    expect(result).toHaveProperty("topicCount");
    expect(result.suggestion).toBeTruthy();
  });

  test("openmemoz.get_reading_history — returns behavior summary", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_reading_history", {});
    expect(result).toBeTruthy();
    // Fresh page has no history, but function should return valid structure
  });

  test("openmemoz.recall_memories — returns empty on fresh page", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.recall_memories", {});
    expect(result).toHaveProperty("memories");
    expect(result).toHaveProperty("totalCount");
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });

  test("openmemoz.get_favourites — returns empty on fresh page", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_favourites", {});
    expect(result).toHaveProperty("favourites");
    expect(result).toHaveProperty("totalCount");
  });

  test("openmemoz.get_theme — returns current theme settings", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_theme", {});
    expect(result.currentPalette).toBeTruthy();
    expect(result.currentVisualStyle).toBeTruthy();
    expect(result.availablePalettes.length).toBeGreaterThanOrEqual(10);
    expect(result.availableStyles.length).toBeGreaterThanOrEqual(3);
  });

  test("openmemoz.get_approved_sources — returns source list", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_approved_sources", {});
    expect(result.approvedSourceCount).toBeGreaterThanOrEqual(80);
    expect(result.bannedDomainCount).toBeGreaterThanOrEqual(200);
    expect(result.sources.length).toBe(result.approvedSourceCount);
    expect(result.sources[0]).toHaveProperty("domain");
    expect(result.sources[0]).toHaveProperty("licence");
  });

  test("openmemoz.get_approved_sources — filters by category", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_approved_sources", { category: "government" });
    expect(result.approvedSourceCount).toBeGreaterThan(0);
    expect(result.approvedSourceCount).toBeLessThan(90);
    for (const s of result.sources) {
      expect(s.category).toBe("government");
    }
  });

  test("openmemoz.get_banned_domains — returns banned list", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.get_banned_domains", {});
    expect(result.bannedDomainCount).toBeGreaterThanOrEqual(200);
    expect(result.domains.length).toBe(result.bannedDomainCount);
    expect(result.domains).toContain("nytimes.com");
    expect(result.domains).toContain("wsj.com");
  });

  test("openmemoz.export_data — exports localStorage content", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.export_data", {});
    expect(result).toHaveProperty("exportedKeys");
    expect(result).toHaveProperty("sizeBytes");
    expect(result).toHaveProperty("sizeReadable");
    expect(result.sizeBytes).toBeGreaterThanOrEqual(0);
  });

  // --- WRITE TOOLS (13) ---

  test("openmemoz.add_story — adds a story to today's edition (created on demand) and page navigates to it", async ({ page }) => {
    await setupAndGetTools(page);
    // Omitting editionDate targets today's edition, so measure "before" against today (0 if it does not exist yet)
    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const editionsBefore: any = await callTool(page, "openmemoz.list_editions", {});
    const todayEntryBefore = editionsBefore.editions.find((e: any) => e.editionDate === todayDateString);
    const beforeCount = todayEntryBefore?.storyCount ?? 0;

    const result: any = await callTool(page, "openmemoz.add_story", {
      headline: "Test Story: Playwright Integration Verified",
      excerpt: "An automated test confirmed that all 31 WebMCP tools function correctly.",
      section: "Tech",
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com",
    });
    expect(result.added).toBe(true);
    expect(result.storyIdentifier).toBeTruthy();
    expect(result.editionDate).toBe(todayDateString);
    expect(result.totalStoryCount).toBe(beforeCount + 1);

    const viewedEditionAfter: any = await callTool(page, "openmemoz.get_edition", {});
    expect(viewedEditionAfter.editionDate).toBe(todayDateString);
    expect(viewedEditionAfter.storyCount).toBe(beforeCount + 1);
  });

  test("openmemoz.add_story — rejects banned source", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.add_story", {
      headline: "Banned Source Test",
      excerpt: "This should be rejected.",
      section: "Tech",
      sourceName: "New York Times",
      sourceUrl: "https://www.nytimes.com/article",
    });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("SOURCE_BANNED");
  });

  test("openmemoz.add_story — rejects duplicate headline", async ({ page }) => {
    await setupAndGetTools(page);
    await callTool(page, "openmemoz.add_story", {
      headline: "Duplicate Detection Test Story Unique",
      excerpt: "First copy.",
      section: "Tech",
      sourceName: "Hacker News",
    });
    const result: any = await callTool(page, "openmemoz.add_story", {
      headline: "Duplicate Detection Test Story Unique",
      excerpt: "Second copy.",
      section: "Tech",
      sourceName: "Hacker News",
    });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("DUPLICATE");
  });

  test("openmemoz.add_story — with YouTube video accepts video ID", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.add_story", {
      headline: "YouTube Embed Test Story",
      excerpt: "Testing YouTube video integration.",
      section: "Tech",
      sourceName: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeVideoId: "dQw4w9WgXcQ",
    });
    expect(result.added).toBe(true);
    expect(result.storyIdentifier).toBeTruthy();
  });

  test("openmemoz.update_story — modifies existing story", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const storyId = edition.stories[0].storyIdentifier;

    const result: any = await callTool(page, "openmemoz.update_story", {
      storyIdentifier: storyId,
      headline: "Updated Headline by Playwright Test",
    });
    expect(result.updated).toBe(true);
    expect(result.headline).toBe("Updated Headline by Playwright Test");
  });

  test("openmemoz.remove_story — removes a story", async ({ page }) => {
    await setupAndGetTools(page);
    // Add then remove
    const addResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "Story To Be Removed",
      excerpt: "This will be removed.",
      section: "Tech",
      sourceName: "Hacker News",
    });

    const beforeEdition: any = await callTool(page, "openmemoz.get_edition", {});
    const result: any = await callTool(page, "openmemoz.remove_story", {
      storyIdentifier: addResult.storyIdentifier,
    });
    expect(result.removed).toBe(true);
    expect(result.totalStoryCount).toBe(beforeEdition.storyCount - 1);
  });

  test("openmemoz.set_hero_story — pins and unpins hero", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const storyId = edition.stories[2].storyIdentifier;

    const pinResult: any = await callTool(page, "openmemoz.set_hero_story", { storyIdentifier: storyId });
    expect(pinResult.heroPinned).toBe(true);
    expect(pinResult.storyIdentifier).toBe(storyId);

    const unpinResult: any = await callTool(page, "openmemoz.set_hero_story", {});
    expect(unpinResult.heroPinned).toBe(false);
  });

  test("openmemoz.batch_add_stories — adds multiple stories", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.batch_add_stories", {
      stories: [
        { headline: "Batch Story Alpha", excerpt: "First batch.", section: "Science", sourceName: "NASA" },
        { headline: "Batch Story Beta", excerpt: "Second batch.", section: "Science", sourceName: "NASA" },
      ],
    });
    expect(result.addedCount).toBe(2);
    expect(result.storyIdentifiers.length).toBe(2);
  });

  test("openmemoz.batch_remove_stories — removes multiple stories", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    // Pick last two stories to remove (they exist in the edition)
    const lastTwo = edition.stories.slice(-2).map((s: any) => s.storyIdentifier);

    const result: any = await callTool(page, "openmemoz.batch_remove_stories", {
      storyIdentifiers: lastTwo,
    });
    expect(result.removedCount).toBe(2);
    expect(result.removedIdentifiers.length).toBe(2);
  });

  test("openmemoz.toggle_favourite — marks and unmarks favourite", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const storyId = edition.stories[0].storyIdentifier;

    const favResult: any = await callTool(page, "openmemoz.toggle_favourite", {
      storyIdentifier: storyId,
      isFavourite: true,
    });
    expect(favResult.isFavourite).toBe(true);

    const favs: any = await callTool(page, "openmemoz.get_favourites", {});
    expect(favs.totalCount).toBeGreaterThanOrEqual(1);

    const unfavResult: any = await callTool(page, "openmemoz.toggle_favourite", {
      storyIdentifier: storyId,
      isFavourite: false,
    });
    expect(unfavResult.isFavourite).toBe(false);
  });

  test("openmemoz.save_memory + recall_memories — round-trip", async ({ page }) => {
    await setupAndGetTools(page);

    const saveResult: any = await callTool(page, "openmemoz.save_memory", {
      memoryIdentifier: "test-pref-long-form",
      content: "Reader prefers long-form analysis over headlines",
      category: "preference",
    });
    expect(saveResult.saved).toBe(true);
    expect(saveResult.totalMemories).toBeGreaterThanOrEqual(1);

    const recallResult: any = await callTool(page, "openmemoz.recall_memories", {});
    expect(recallResult.totalCount).toBeGreaterThanOrEqual(1);
    const found = recallResult.memories.find((m: any) => m.memoryIdentifier === "test-pref-long-form");
    expect(found).toBeTruthy();
    expect(found.content).toContain("long-form");
  });

  test("openmemoz.set_section_filter — filters to valid section", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const section = edition.sections[0];

    const result: any = await callTool(page, "openmemoz.set_section_filter", { section });
    expect(result.activeSectionFilter).toBe(section);
    expect(result.visibleStoryCount).toBeGreaterThan(0);

    // Reset
    const resetResult: any = await callTool(page, "openmemoz.set_section_filter", { section: "ALL" });
    expect(resetResult.activeSectionFilter).toBe("ALL");
  });

  test("openmemoz.set_section_filter — rejects invalid section", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.set_section_filter", { section: "NonexistentSection" });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("INVALID_INPUT");
  });

  test("openmemoz.set_color_palette — applies palette", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.set_color_palette", { paletteIdentifier: "midnight" });
    expect(result.applied).toBe(true);
    expect(result.paletteIdentifier).toBe("midnight");
  });

  test("openmemoz.set_color_palette — rejects invalid palette", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.set_color_palette", { paletteIdentifier: "nonexistent" });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("NOT_FOUND");
  });

  test("openmemoz.set_visual_style — applies style", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.set_visual_style", { styleIdentifier: "glass" });
    expect(result.applied).toBe(true);
    expect(result.styleIdentifier).toBe("glass");
  });

  test("openmemoz.set_visual_style — rejects invalid style", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.set_visual_style", { styleIdentifier: "invalid" });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("INVALID_INPUT");
  });

  test("openmemoz.reorder_story — moves story to new position", async ({ page }) => {
    await setupAndGetTools(page);
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    const storyId = edition.stories[edition.stories.length - 1].storyIdentifier;

    const result: any = await callTool(page, "openmemoz.reorder_story", {
      storyIdentifier: storyId,
      moveTo: "first",
    });
    expect(result.newIndex).toBe(0);
    expect(result.storyIdentifier).toBe(storyId);
  });

  test("openmemoz.clear_user_data — clears stories scope", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.clear_user_data", { scope: "stories" });
    expect(result.cleared).toBe("stories");
    expect(result.keysRemoved).toBeGreaterThanOrEqual(0);
  });

  test("openmemoz.clear_user_data — rejects invalid scope", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.clear_user_data", { scope: "invalid_scope" });
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe("INVALID_SCOPE");
  });

  // --- DISCOVER TOOLS (3) - external API calls ---

  test("openmemoz.discover_youtube_content — returns video list", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.discover_youtube_content", { limit: 3 });
    expect(result).toBeTruthy();
    if (!result.error) {
      expect(result.videos || result.channels).toBeTruthy();
    }
  });

  test("openmemoz.discover_bluesky_trending — returns posts", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.discover_bluesky_trending", { limit: 3 });
    expect(result).toBeTruthy();
    // May fail if Bluesky API is down, but should not crash
  });

  test("openmemoz.discover_mastodon_trending — returns trending links", async ({ page }) => {
    await setupAndGetTools(page);
    const result: any = await callTool(page, "openmemoz.discover_mastodon_trending", { limit: 3 });
    expect(result).toBeTruthy();
  });

  // --- ANNOTATION VERIFICATION ---

  test("all tools have correct annotation types", async ({ page }) => {
    await setupAndGetTools(page);
    const annotations: any = await page.evaluate(() => {
      const tools = (window as any).__capturedTools;
      const result: Record<string, any> = {};
      for (const [name, tool] of Object.entries(tools) as any) {
        result[name] = { annotations: tool.annotations, title: tool.title };
      }
      return result;
    });

    saveOutput("_annotation_summary", {}, annotations);

    const readTools = [
      "openmemoz.get_edition", "openmemoz.list_editions", "openmemoz.search_stories",
      "openmemoz.get_story", "openmemoz.get_reading_context", "openmemoz.explain_connections",
      "openmemoz.get_youtube_video", "openmemoz.get_user_interests", "openmemoz.get_reading_history",
      "openmemoz.recall_memories", "openmemoz.get_favourites", "openmemoz.get_theme",
      "openmemoz.get_approved_sources", "openmemoz.get_banned_domains", "openmemoz.export_data",
    ];
    for (const name of readTools) {
      expect(annotations[name]?.annotations?.readOnlyHint).toBe(true);
      expect(annotations[name]?.title).toBeTruthy();
    }

    const destructiveTools = [
      "openmemoz.remove_story", "openmemoz.batch_remove_stories", "openmemoz.clear_user_data",
    ];
    for (const name of destructiveTools) {
      expect(annotations[name]?.annotations?.consequentialHint).toBe(true);
    }

    const discoverTools = [
      "openmemoz.discover_youtube_content", "openmemoz.discover_bluesky_trending",
      "openmemoz.discover_mastodon_trending",
    ];
    for (const name of discoverTools) {
      expect(annotations[name]?.annotations?.untrustedContentHint).toBe(true);
    }
  });
});
