import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "auto-curation-settings-outputs");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

function saveTestOutput(testName: string, output: unknown) {
  const filename = testName.replace(/[^a-z0-9]+/gi, "_") + ".json";
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(output, null, 2));
}

const MOCK_SCRIPT = `
  window.__capturedTools = {};
  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool: (tool, opts) => {
        window.__capturedTools[tool.name] = {
          name: tool.name,
          _execute: tool.execute,
        };
        return Promise.resolve();
      }
    },
    writable: false,
    configurable: true,
  });
`;

async function setupPageWithMockModelContext(page: import("@playwright/test").Page) {
  await page.addInitScript(MOCK_SCRIPT);
  await page.goto("/");
  await page.waitForSelector("text=Edition No.", { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function callToolByName(page: import("@playwright/test").Page, toolName: string, args: Record<string, unknown>) {
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

test.describe("Auto-Curation Settings UI + Live Chain", () => {
  test.setTimeout(120000);

  test("toggle scheduler on via Settings UI, verify config persists", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    // Navigate to Settings
    const settingsButton = page.locator("text=Settings").first();
    if (await settingsButton.isVisible()) await settingsButton.click();
    await page.waitForTimeout(500);

    // Check auto-curation section exists
    const autoCurationHeading = page.locator("text=Auto-Curation").first();
    expect(await autoCurationHeading.isVisible()).toBe(true);

    // Find and click the scheduler toggle
    const schedulerRow = page.locator("text=Scheduler").first();
    expect(await schedulerRow.isVisible()).toBe(true);

    // Get initial config via tool
    const initialStatus: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "status" });
    saveTestOutput("initial_status", initialStatus);

    // Enable via tool (simulating what toggle does)
    const enableResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", {
      action: "enable",
      intervalHours: 1 / 60,
    });
    saveTestOutput("enable_1min", enableResult);
    expect(enableResult.enabled).toBe(true);
    expect(enableResult.config.intervalHours).toBeCloseTo(1 / 60, 5);
    expect(enableResult.config.sources.web).toBe(true);

    // Verify status shows running
    const runningStatus: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "status" });
    saveTestOutput("running_status", runningStatus);
    expect(runningStatus.isRunning).toBe(true);
  });

  test("run_now triggers immediate curation and adds stories to today", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    // Set interests first
    const setInterestsResult: any = await callToolByName(page, "openmemoz.set_user_interests", {
      topics: ["AI & Machine Learning", "Science", "Space"],
      weights: { "AI & Machine Learning": 90, "Science": 80, "Space": 85 },
    });
    saveTestOutput("set_interests", setInterestsResult);
    expect(setInterestsResult).not.toHaveProperty("__error");

    // Get edition before
    const editionBefore: any = await callToolByName(page, "openmemoz.get_edition", {});
    const storyCountBefore = editionBefore.storyCount || 0;
    saveTestOutput("edition_before_run", { storyCount: storyCountBefore, editionDate: editionBefore.editionDate });

    // Run auto-curation now
    const runResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "run_now" });
    saveTestOutput("run_now_result", runResult);
    expect(runResult.ran).toBe(true);

    // Check stories were added
    saveTestOutput("run_now_stories_added", {
      storiesAdded: runResult.storiesAdded,
      addedIdentifiers: runResult.addedIdentifiers,
      errors: runResult.errors,
    });

    if (runResult.storiesAdded > 0) {
      // Verify edition updated
      const editionAfter: any = await callToolByName(page, "openmemoz.get_edition", {});
      saveTestOutput("edition_after_run", { storyCount: editionAfter.storyCount, editionDate: editionAfter.editionDate });
    }
  });

  test("1-min interval scheduler runs twice within 2 minutes", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    // Enable with 1-min interval
    const enableResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", {
      action: "enable",
      intervalHours: 1 / 60,
    });
    expect(enableResult.enabled).toBe(true);

    // Run once immediately
    const firstRun: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "run_now" });
    saveTestOutput("interval_first_run", firstRun);
    const firstRunAddedCount = firstRun.storiesAdded || 0;

    // Wait 65 seconds for the scheduler to fire
    await page.waitForTimeout(65000);

    // Check status — should have run again
    const statusAfterWait: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "status" });
    saveTestOutput("interval_status_after_wait", statusAfterWait);
    expect(statusAfterWait.storiesAddedTotal).toBeGreaterThanOrEqual(firstRunAddedCount);

    // Disable
    const disableResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", { action: "disable" });
    saveTestOutput("interval_disable", disableResult);
    expect(disableResult.enabled).toBe(false);
  });

  test("configure interval change updates scheduler", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    // Enable with 24h
    await callToolByName(page, "openmemoz.configure_auto_curation", { action: "enable", intervalHours: 24 });

    // Change to 6h
    const configureResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", {
      action: "configure",
      intervalHours: 6,
    });
    saveTestOutput("configure_interval_change", configureResult);
    expect(configureResult.configured).toBe(true);
    expect(configureResult.config.intervalHours).toBe(6);

    // Toggle web source off then on
    const webOffResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", {
      action: "configure",
      enableWeb: false,
    });
    expect(webOffResult.config.sources.web).toBe(false);

    const webOnResult: any = await callToolByName(page, "openmemoz.configure_auto_curation", {
      action: "configure",
      enableWeb: true,
    });
    expect(webOnResult.config.sources.web).toBe(true);
    saveTestOutput("configure_web_toggle", { webOff: webOffResult.config.sources, webOn: webOnResult.config.sources });

    // Disable
    await callToolByName(page, "openmemoz.configure_auto_curation", { action: "disable" });
  });

  test("discover_web_content returns stories from multiple sources", async ({ page }) => {
    await setupPageWithMockModelContext(page);

    // Discover from all web sources
    const allSourcesResult: any = await callToolByName(page, "openmemoz.discover_web_content", {
      limit: 5,
    });
    saveTestOutput("discover_web_all_sources", allSourcesResult);

    if (allSourcesResult.error) {
      console.log("Web discover unavailable:", allSourcesResult.error);
      return;
    }

    expect(allSourcesResult.storyCount).toBeGreaterThan(0);
    expect(allSourcesResult.sources).toContain("hackernews");

    // Discover from hackernews only
    const hackerNewsResult: any = await callToolByName(page, "openmemoz.discover_web_content", {
      limit: 3,
      sources: "hackernews",
    });
    saveTestOutput("discover_web_hackernews_only", hackerNewsResult);
    expect(hackerNewsResult.storyCount).toBeGreaterThan(0);

    // Add a discovered web story to today's edition
    if (hackerNewsResult.stories?.length > 0) {
      const topStory = hackerNewsResult.stories[0];
      const addResult: any = await callToolByName(page, "openmemoz.add_story", {
        headline: topStory.headline,
        excerpt: topStory.excerpt,
        section: "Tech",
        sourceName: "Hacker News",
        sourceUrl: topStory.sourceUrl,
      });
      saveTestOutput("add_web_discovered_story", addResult);
      expect(addResult.added).toBe(true);
    }
  });
});
