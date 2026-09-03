import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-results", "auto-curation-outputs");

test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

const MOCK_SCRIPT = `
  window.__t = {};
  Object.defineProperty(document, "modelContext", {
    value: { registerTool: (t) => { window.__t[t.name] = { _e: t.execute }; return Promise.resolve(); } },
    writable: false, configurable: true,
  });
`;

async function call(page: import("@playwright/test").Page, name: string, args: Record<string, unknown>) {
  return page.evaluate(async ({ n, a }) => {
    const t = (window as any).__t[n];
    if (!t) return { __error: `Tool ${n} not found` };
    return await t._e(a);
  }, { n: name, a: args });
}

test.describe("Auto-Curation Scheduler — Live Chain Test", () => {
  test.setTimeout(180000);

  test("full lifecycle: status → enable (30s interval) → wait for run → check log → disable", async ({ page }) => {
    await page.addInitScript(MOCK_SCRIPT);
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 15000 });
    await page.waitForTimeout(1500);

    // Verify tool registered
    const toolExists = await page.evaluate(() => !!(window as any).__t["openmemoz.configure_auto_curation"]);
    expect(toolExists).toBe(true);

    // Step 1: Check initial status — should be disabled
    const initialStatus: any = await call(page, "openmemoz.configure_auto_curation", { action: "status" });
    expect(initialStatus.isRunning).toBe(false);
    expect(initialStatus.config.isEnabled).toBe(false);
    fs.writeFileSync(path.join(OUTPUT_DIR, "01-initial-status.json"), JSON.stringify(initialStatus, null, 2));

    // Step 2: Get edition before auto-curation
    const editionBefore: any = await call(page, "openmemoz.get_edition", {});
    const storyCountBefore = editionBefore.storyCount;
    fs.writeFileSync(path.join(OUTPUT_DIR, "02-edition-before.json"), JSON.stringify({
      storyCount: storyCountBefore,
      sections: editionBefore.sections,
    }, null, 2));

    // Step 3: Enable with 30-second interval (0.00833 hours) for testing
    const enableResult: any = await call(page, "openmemoz.configure_auto_curation", {
      action: "enable",
      intervalHours: 0.00833,
      maxStoriesPerRun: 3,
      enableYoutube: true,
      enableBluesky: true,
      enableMastodon: true,
    });
    expect(enableResult.enabled).toBe(true);
    expect(enableResult.config.isEnabled).toBe(true);
    fs.writeFileSync(path.join(OUTPUT_DIR, "03-enable-result.json"), JSON.stringify(enableResult, null, 2));

    // Step 4: Wait for any in-flight catch-up run to finish, then trigger manual run
    await page.waitForTimeout(5000);
    const runResult: any = await call(page, "openmemoz.configure_auto_curation", { action: "run_now" });
    expect(runResult.ran).toBe(true);
    fs.writeFileSync(path.join(OUTPUT_DIR, "04-run-now-result.json"), JSON.stringify(runResult, null, 2));

    // Step 5: Check status after run
    const statusAfterRun: any = await call(page, "openmemoz.configure_auto_curation", { action: "status" });
    expect(statusAfterRun.isRunning).toBe(true);
    expect(statusAfterRun.lastRunAt).toBeTruthy();
    expect(statusAfterRun.storiesAddedTotal).toBeGreaterThanOrEqual(0);
    fs.writeFileSync(path.join(OUTPUT_DIR, "05-status-after-run.json"), JSON.stringify(statusAfterRun, null, 2));

    // Step 6: Check the auto-curation log from localStorage
    const autoCurationLog = await page.evaluate(() => {
      try {
        const log = localStorage.getItem("openmemoz_auto_curation_log");
        return log ? JSON.parse(log) : [];
      } catch { return []; }
    });
    expect(autoCurationLog.length).toBeGreaterThanOrEqual(1);
    expect(autoCurationLog[0]).toHaveProperty("ranAtTimestamp");
    expect(autoCurationLog[0]).toHaveProperty("storiesAddedCount");
    expect(autoCurationLog[0]).toHaveProperty("addedStoryIdentifiers");
    expect(autoCurationLog[0]).toHaveProperty("sourceErrors");
    fs.writeFileSync(path.join(OUTPUT_DIR, "06-curation-log.json"), JSON.stringify(autoCurationLog, null, 2));

    // Step 7: Wait ~35 seconds for the interval to fire automatically
    await page.waitForTimeout(35000);

    // Step 8: Check if a second run happened
    const logAfterWait = await page.evaluate(() => {
      try {
        const log = localStorage.getItem("openmemoz_auto_curation_log");
        return log ? JSON.parse(log) : [];
      } catch { return []; }
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, "07-log-after-interval.json"), JSON.stringify(logAfterWait, null, 2));

    // Step 9: Check for conflicts — no duplicate storyIdentifiers in the edition
    const editionAfter = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("openmemoz_edition_")) keys.push(key);
      }
      if (keys.length === 0) return null;
      try {
        return JSON.parse(localStorage.getItem(keys[keys.length - 1]) || "null");
      } catch { return null; }
    });
    if (editionAfter?.stories) {
      const storyIds = editionAfter.stories.map((s: any) => s.storyIdentifier);
      const uniqueIds = new Set(storyIds);
      expect(uniqueIds.size).toBe(storyIds.length);
      fs.writeFileSync(path.join(OUTPUT_DIR, "08-edition-after-no-duplicates.json"), JSON.stringify({
        storyCountBefore,
        storyCountAfter: editionAfter.storyCount,
        storiesAdded: editionAfter.storyCount - storyCountBefore,
        uniqueStoryIds: uniqueIds.size,
        totalStoryIds: storyIds.length,
        noDuplicates: uniqueIds.size === storyIds.length,
      }, null, 2));
    }

    // Step 10: Disable
    const disableResult: any = await call(page, "openmemoz.configure_auto_curation", { action: "disable" });
    expect(disableResult.enabled).toBe(false);
    const finalStatus: any = await call(page, "openmemoz.configure_auto_curation", { action: "status" });
    expect(finalStatus.isRunning).toBe(false);
    fs.writeFileSync(path.join(OUTPUT_DIR, "09-disabled-final-status.json"), JSON.stringify(finalStatus, null, 2));

    // Generate summary report
    const summary = {
      testName: "Auto-Curation Scheduler Live Test",
      testedAt: new Date().toISOString(),
      intervalUsed: "30 seconds (0.00833 hours)",
      maxStoriesPerRun: 3,
      sourcesEnabled: ["youtube", "bluesky", "mastodon"],
      initialStoryCount: storyCountBefore,
      finalStoryCount: editionAfter?.storyCount ?? "unknown",
      totalRuns: logAfterWait.length,
      totalStoriesAdded: logAfterWait.reduce((sum: number, entry: any) => sum + entry.storiesAddedCount, 0),
      noDuplicatesConfirmed: editionAfter ? new Set(editionAfter.stories.map((s: any) => s.storyIdentifier)).size === editionAfter.stories.length : "unknown",
      sourceErrors: logAfterWait.flatMap((entry: any) => entry.sourceErrors),
      allRunTimestamps: logAfterWait.map((entry: any) => new Date(entry.ranAtTimestamp).toISOString()),
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, "10-summary-report.json"), JSON.stringify(summary, null, 2));
  });
});
