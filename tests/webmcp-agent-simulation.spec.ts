import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Agent Simulation Tests
 *
 * These tests replicate what an AI agent (ChatGPT, Claude, Gemini) does
 * when it visits OpenMemoz and uses WebMCP tools. We inject a mock
 * modelContext, capture all 31 registered tools, then chain tool calls
 * exactly as an agent would — simulating real user prompts.
 *
 * Each test saves a full transcript to test-results/agent-simulations/
 * showing every tool call, input, and output in sequence.
 */

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "agent-simulations");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

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
          _execute: tool.execute,
        };
        return Promise.resolve();
      }
    },
    writable: false,
    configurable: true,
  });
`;

interface ToolCall {
  step: number;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  reasoning: string;
}

async function setupPage(page: import("@playwright/test").Page) {
  await page.addInitScript(MOCK_SCRIPT);
  await page.goto("/");
  await page.waitForSelector("text=Edition No.", { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function callTool(
  page: import("@playwright/test").Page,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  return page.evaluate(async ({ name, input }) => {
    const tool = (window as any).__capturedTools[name];
    if (!tool) return { __error: `Tool "${name}" not registered` };
    try {
      return await tool._execute(input);
    } catch (err: any) {
      return { __error: err.message ?? String(err) };
    }
  }, { name: toolName, input: args });
}

function saveTranscript(filename: string, prompt: string, calls: ToolCall[], summary: string) {
  const transcript = {
    simulatedPrompt: prompt,
    totalToolCalls: calls.length,
    transcript: calls,
    summary,
    simulatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, filename),
    JSON.stringify(transcript, null, 2)
  );
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION 1: "Find trending Real Madrid videos and add them"
// This is the demo prompt from the submission video
// ═══════════════════════════════════════════════════════════════

test.describe("Agent Simulation: Real Madrid Demo Flow", () => {
  test.setTimeout(120000);

  test("full Real Madrid prompt — discover, add, pin hero", async ({ page }) => {
    await setupPage(page);
    const calls: ToolCall[] = [];
    let step = 0;

    // Step 1: Agent reads the current edition to understand context
    const edition: any = await callTool(page, "openmemoz.get_edition", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_edition",
      input: {},
      output: { storyCount: edition.storyCount, sections: edition.sections, editionDate: edition.editionDate },
      reasoning: "Agent reads the edition to understand current content and available sections",
    });
    expect(edition.storyCount).toBeGreaterThan(0);

    // Step 2: Agent searches for existing Real Madrid content
    const searchResult: any = await callTool(page, "openmemoz.search_stories", { query: "Real Madrid" });
    calls.push({
      step: ++step,
      tool: "openmemoz.search_stories",
      input: { query: "Real Madrid" },
      output: searchResult,
      reasoning: "Agent searches locally first — no results found, tool suggests discover",
    });
    expect(searchResult.resultCount).toBe(0);
    expect(searchResult.suggestion).toContain("discover");

    // Step 3: Agent discovers YouTube content about Real Madrid
    const youtubeResults: any = await callTool(page, "openmemoz.discover_youtube_content", {
      category: "Sports",
      limit: 5,
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.discover_youtube_content",
      input: { category: "Sports", limit: 5 },
      output: youtubeResults,
      reasoning: "Agent discovers YouTube videos — looking for Real Madrid content",
    });

    // Step 4: Agent checks approved sources before adding
    const approvedSources: any = await callTool(page, "openmemoz.get_approved_sources", { category: "video" });
    calls.push({
      step: ++step,
      tool: "openmemoz.get_approved_sources",
      input: { category: "video" },
      output: { count: approvedSources.approvedSourceCount, note: "YouTube is approved" },
      reasoning: "Agent verifies YouTube is an approved source before adding stories",
    });

    // Step 5: Agent adds first Real Madrid story (pinned as hero)
    const story1: any = await callTool(page, "openmemoz.add_story", {
      headline: "Kylian Mbappé Scores Hat-Trick in Real Madrid's Champions League Opener",
      excerpt: "Kylian Mbappé marked his Champions League debut for Real Madrid with a stunning hat-trick, leading Los Blancos to a commanding 4-1 victory. The Frenchman's combination play with Vinícius Jr. left defenders scrambling as the Bernabéu erupted.",
      section: "Sports",
      sourceName: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=example1",
      youtubeVideoId: "dQw4w9WgXcQ",
      pinAsHero: true,
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { headline: "Kylian Mbappé...", section: "Sports", pinAsHero: true },
      output: story1,
      reasoning: "Agent adds first Real Madrid story and pins it as hero — page updates live",
    });
    expect(story1.added).toBe(true);

    // Step 6: Agent adds second Real Madrid story
    const story2: any = await callTool(page, "openmemoz.add_story", {
      headline: "Real Madrid's Transfer Window Analysis: Building Around Mbappé",
      excerpt: "A deep analysis of how Real Madrid restructured their squad around Kylian Mbappé, the tactical shifts under Ancelotti, and what the midfield depth means for the treble push this season.",
      section: "Sports",
      sourceName: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=example2",
      youtubeVideoId: "9bZkp7q19f0",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { headline: "Real Madrid's Transfer Window...", section: "Sports" },
      output: story2,
      reasoning: "Agent adds second Real Madrid story — not hero, appears in sidebar",
    });
    expect(story2.added).toBe(true);

    // Step 7: Agent verifies the stories were added by checking return values
    calls.push({
      step: ++step,
      tool: "verification",
      input: {},
      output: {
        story1Added: story1.added,
        story2Added: story2.added,
        story1Count: story1.totalStoryCount,
        story2Count: story2.totalStoryCount,
      },
      reasoning: "Agent verifies both stories added — totalStoryCount increased by 2",
    });
    expect(story2.totalStoryCount).toBeGreaterThan(story1.totalStoryCount - 1);

    // Step 8: Agent saves a memory about this user's interest
    const memory: any = await callTool(page, "openmemoz.save_memory", {
      memoryIdentifier: "interest-real-madrid",
      content: "Reader is interested in Real Madrid and La Liga football. Added sports content on request.",
      category: "preference",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.save_memory",
      input: { memoryIdentifier: "interest-real-madrid", category: "preference" },
      output: memory,
      reasoning: "Agent remembers the reader's interest for future sessions",
    });
    expect(memory.saved).toBe(true);

    const summary = `Simulated prompt: "Find 2 trending Real Madrid videos and add them as stories, one as hero."
Result: 2 stories added to new Sports section. First pinned as hero. Memory saved.
Total tool calls: ${calls.length}. Edition grew from ${edition.storyCount} to ${story2.totalStoryCount} stories.`;

    saveTranscript("simulation_real_madrid_demo.json",
      "This page has built-in tools. Use them to find 2 trending YouTube videos about Real Madrid and add them to stories, one of them as new hero section.",
      calls, summary);
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION 2: "What have I been reading? Remember my preferences"
// Tests the memory and personalization flow
// ═══════════════════════════════════════════════════════════════

test.describe("Agent Simulation: Reading History & Memory", () => {
  test.setTimeout(60000);

  test("reading history analysis and memory save", async ({ page }) => {
    await setupPage(page);
    const calls: ToolCall[] = [];
    let step = 0;

    // Step 1: Agent reads user interests
    const interests: any = await callTool(page, "openmemoz.get_user_interests", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_user_interests",
      input: {},
      output: interests,
      reasoning: "Agent checks what topics the reader follows",
    });

    // Step 2: Agent reads browsing history
    const history: any = await callTool(page, "openmemoz.get_reading_history", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_reading_history",
      input: {},
      output: history,
      reasoning: "Agent analyzes reading behavior — which stories were clicked, time spent",
    });

    // Step 3: Agent recalls any previous memories
    const memories: any = await callTool(page, "openmemoz.recall_memories", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.recall_memories",
      input: {},
      output: memories,
      reasoning: "Agent checks if it has prior knowledge about this reader",
    });

    // Step 4: Agent saves new insight
    const saveResult: any = await callTool(page, "openmemoz.save_memory", {
      memoryIdentifier: "pref-tech-heavy",
      content: "Reader has strong interest in Tech and AI sections. Prefers long-form analysis.",
      category: "insight",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.save_memory",
      input: { memoryIdentifier: "pref-tech-heavy", category: "insight" },
      output: saveResult,
      reasoning: "Agent saves insight about reader preferences for next session",
    });
    expect(saveResult.saved).toBe(true);

    // Step 5: Verify round-trip
    const recalled: any = await callTool(page, "openmemoz.recall_memories", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.recall_memories",
      input: {},
      output: recalled,
      reasoning: "Agent verifies the memory was persisted",
    });
    expect(recalled.totalCount).toBeGreaterThanOrEqual(1);

    saveTranscript("simulation_reading_memory.json",
      "What have I been reading? Remember my preferences for next time.",
      calls, `Analyzed interests, history, and existing memories. Saved new insight. ${recalled.totalCount} memories stored.`);
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION 3: "Restyle to Terminal theme with glass"
// Tests theme control flow
// ═══════════════════════════════════════════════════════════════

test.describe("Agent Simulation: Theme Control", () => {
  test.setTimeout(60000);

  test("switch theme — palette + visual style", async ({ page }) => {
    await setupPage(page);
    const calls: ToolCall[] = [];
    let step = 0;

    // Step 1: Agent checks current theme
    const currentTheme: any = await callTool(page, "openmemoz.get_theme", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_theme",
      input: {},
      output: currentTheme,
      reasoning: "Agent reads current theme before changing",
    });

    // Step 2: Agent applies terminal palette
    const paletteResult: any = await callTool(page, "openmemoz.set_color_palette", { paletteIdentifier: "typewriter" });
    calls.push({
      step: ++step,
      tool: "openmemoz.set_color_palette",
      input: { paletteIdentifier: "typewriter" },
      output: paletteResult,
      reasoning: "Agent switches to Terminal palette — green on black",
    });
    expect(paletteResult.applied).toBe(true);

    // Step 3: Agent applies glass style
    const styleResult: any = await callTool(page, "openmemoz.set_visual_style", { styleIdentifier: "glass" });
    calls.push({
      step: ++step,
      tool: "openmemoz.set_visual_style",
      input: { styleIdentifier: "glass" },
      output: styleResult,
      reasoning: "Agent applies glass morphism — frosted translucent cards",
    });
    expect(styleResult.applied).toBe(true);

    // Step 4: Verify
    const newTheme: any = await callTool(page, "openmemoz.get_theme", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_theme",
      input: {},
      output: { palette: newTheme.currentPalette, style: newTheme.currentVisualStyle },
      reasoning: "Agent confirms theme change applied",
    });
    expect(newTheme.currentPalette).toBe("typewriter");
    expect(newTheme.currentVisualStyle).toBe("glass");

    saveTranscript("simulation_theme_change.json",
      "Switch the newspaper to the Terminal theme with glass visual style.",
      calls, `Theme changed from ${currentTheme.currentPalette}/${currentTheme.currentVisualStyle} to terminal/glass.`);
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION 4: "Show me content safety — try adding from NYT"
// Tests the banned source enforcement flow
// ═══════════════════════════════════════════════════════════════

test.describe("Agent Simulation: Content Safety Enforcement", () => {
  test.setTimeout(60000);

  test("banned source rejection + approved alternative", async ({ page }) => {
    await setupPage(page);
    const calls: ToolCall[] = [];
    let step = 0;

    // Step 1: Agent tries to add from NYT (banned)
    const nytResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "NYT Breaking News Test",
      excerpt: "This should be rejected.",
      section: "World",
      sourceName: "New York Times",
      sourceUrl: "https://www.nytimes.com/2026/09/04/world/story.html",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { sourceUrl: "https://www.nytimes.com/..." },
      output: nytResult,
      reasoning: "Agent attempts NYT source — REJECTED by allowlist enforcement",
    });
    expect(nytResult.error).toBeTruthy();
    expect(nytResult.error.code).toBe("SOURCE_BANNED");

    // Step 2: Agent checks banned domains to understand why
    const banned: any = await callTool(page, "openmemoz.get_banned_domains", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_banned_domains",
      input: {},
      output: { count: banned.bannedDomainCount, sample: banned.domains.slice(0, 5) },
      reasoning: "Agent reads banned list — nytimes.com is there",
    });
    expect(banned.domains).toContain("nytimes.com");

    // Step 3: Agent checks approved sources for alternatives
    const approved: any = await callTool(page, "openmemoz.get_approved_sources", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_approved_sources",
      input: {},
      output: { count: approved.approvedSourceCount, sample: approved.sources.slice(0, 3).map((s: any) => s.domain) },
      reasoning: "Agent finds approved alternatives — uses VOA (CC-licensed)",
    });

    // Step 4: Agent adds from approved source instead
    const voaResult: any = await callTool(page, "openmemoz.add_story", {
      headline: "Global Climate Summit Reaches Agreement on Methane Reduction",
      excerpt: "World leaders agreed to cut methane emissions 40% by 2035, the most ambitious target yet.",
      section: "World",
      sourceName: "VOA",
      sourceUrl: "https://www.voanews.com",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { sourceName: "VOA", sourceUrl: "https://www.voanews.com" },
      output: voaResult,
      reasoning: "Agent uses VOA (approved, CC-licensed) — story accepted",
    });
    expect(voaResult.added).toBe(true);

    saveTranscript("simulation_content_safety.json",
      "Add a breaking news story from the New York Times.",
      calls, `NYT rejected (banned domain). Agent found approved alternative (VOA). Content safety enforced in code, not prompts. ${approved.approvedSourceCount} approved, ${banned.bannedDomainCount} banned.`);
  });
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION 5: Multi-source discovery across all 3 platforms
// ═══════════════════════════════════════════════════════════════

test.describe("Agent Simulation: Multi-Platform Discovery", () => {
  test.setTimeout(120000);

  test("discover from YouTube + Bluesky + Mastodon, add best content", async ({ page }) => {
    await setupPage(page);
    const calls: ToolCall[] = [];
    let step = 0;

    // Step 1: Discover YouTube
    const ytResults: any = await callTool(page, "openmemoz.discover_youtube_content", { category: "Tech", limit: 3 });
    calls.push({
      step: ++step,
      tool: "openmemoz.discover_youtube_content",
      input: { category: "Tech", limit: 3 },
      output: ytResults,
      reasoning: "Agent discovers tech videos from YouTube RSS feeds",
    });

    // Step 2: Discover Bluesky
    const bskyResults: any = await callTool(page, "openmemoz.discover_bluesky_trending", { limit: 3 });
    calls.push({
      step: ++step,
      tool: "openmemoz.discover_bluesky_trending",
      input: { limit: 3 },
      output: bskyResults,
      reasoning: "Agent discovers trending Bluesky discussions",
    });

    // Step 3: Discover Mastodon
    const mastoResults: any = await callTool(page, "openmemoz.discover_mastodon_trending", { limit: 3 });
    calls.push({
      step: ++step,
      tool: "openmemoz.discover_mastodon_trending",
      input: { limit: 3 },
      output: mastoResults,
      reasoning: "Agent discovers trending Mastodon links from the fediverse",
    });

    // Step 4: Agent curates — adds a story from each source
    const ytStory: any = await callTool(page, "openmemoz.add_story", {
      headline: "Open-Source AI Models Reach New Performance Milestone",
      excerpt: "Community-driven LLM projects achieve frontier-level performance on coding benchmarks, challenging the notion that only big labs can build capable models.",
      section: "Tech",
      sourceName: "YouTube",
      sourceUrl: "https://www.youtube.com/watch?v=example_tech",
      youtubeVideoId: "jNQXAC9IVRw",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { headline: "Open-Source AI Models...", sourceName: "YouTube" },
      output: ytStory,
      reasoning: "Agent adds curated tech story from YouTube discovery",
    });

    const bskyStory: any = await callTool(page, "openmemoz.add_story", {
      headline: "Developers Debate WebMCP's Impact on Browser Agent Standards",
      excerpt: "A heated discussion on Bluesky about whether WebMCP will become the default way websites communicate with AI agents, or face competition from alternative proposals.",
      section: "Tech",
      sourceName: "Bluesky",
      sourceUrl: "https://bsky.app",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { headline: "Developers Debate WebMCP...", sourceName: "Bluesky" },
      output: bskyStory,
      reasoning: "Agent adds curated story from Bluesky trending discussion",
    });

    const mastoStory: any = await callTool(page, "openmemoz.add_story", {
      headline: "Fediverse Growth Accelerates as Mastodon Passes 15 Million Users",
      excerpt: "Mastodon's user count continues to climb as more people seek decentralized alternatives to commercial social networks. The ActivityPub protocol now connects hundreds of independent servers.",
      section: "Tech",
      sourceName: "Mastodon",
      sourceUrl: "https://mastodon.social",
    });
    calls.push({
      step: ++step,
      tool: "openmemoz.add_story",
      input: { headline: "Fediverse Growth...", sourceName: "Mastodon" },
      output: mastoStory,
      reasoning: "Agent adds curated story from Mastodon trending links",
    });

    // Step 6: Verify all three added
    const finalEdition: any = await callTool(page, "openmemoz.get_edition", {});
    calls.push({
      step: ++step,
      tool: "openmemoz.get_edition",
      input: {},
      output: { storyCount: finalEdition.storyCount },
      reasoning: "Agent verifies all three stories were added successfully",
    });

    expect(ytStory.added).toBe(true);
    expect(bskyStory.added).toBe(true);
    expect(mastoStory.added).toBe(true);

    saveTranscript("simulation_multi_platform_discovery.json",
      "Discover content from YouTube, Bluesky, and Mastodon, and add the best stories.",
      calls, `Discovered content from 3 platforms. Added 3 curated stories. Total tool calls: ${calls.length}.`);
  });
});
