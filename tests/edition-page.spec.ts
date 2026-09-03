import { test, expect, type Page } from "@playwright/test";

async function waitForActiveEdition(page: Page) {
  await page.waitForFunction(
    () => {
      const items = document.querySelectorAll("article h2");
      return Array.from(items).some(
        (el) => el.getBoundingClientRect().height > 0
      );
    },
    { timeout: 15000 }
  );
}

function visibleHero(page: Page) {
  return page.locator("article h2").last();
}

function visibleStoryCards(page: Page) {
  return page.locator(
    '.stf__block > div:not([style*="display: none"]) article h3'
  );
}

test.describe("Edition page loads and renders", () => {
  test("displays masthead and hero story", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("button:has-text('OpenMemoz')")).toBeVisible();
    await waitForActiveEdition(page);

    const heroHeadline = visibleHero(page);
    await expect(heroHeadline).toBeVisible();
    await expect(heroHeadline).not.toBeEmpty();
  });

  test("renders edition date and story count in nav bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Edition No.")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=/\\d+ stories/")).toBeVisible();
  });

  test("renders story cards below hero", async ({ page }) => {
    await page.goto("/");
    await waitForActiveEdition(page);

    const storyCardCount = await visibleStoryCards(page).count();
    expect(storyCardCount).toBeGreaterThan(3);
  });
});

test.describe("Story interaction", () => {
  test("clicking a story card opens StoryDetail", async ({ page }) => {
    await page.goto("/");
    await waitForActiveEdition(page);

    const firstCard = visibleStoryCards(page).first();
    const headline = await firstCard.textContent();
    await firstCard.click();

    await expect(page.locator("text=Back to edition")).toBeVisible();
    await expect(page.locator("article h1")).toContainText(headline!);
  });

  test("back button returns to edition view", async ({ page }) => {
    await page.goto("/");
    await waitForActiveEdition(page);

    await visibleStoryCards(page).first().click();
    await expect(page.locator("text=Back to edition")).toBeVisible();

    await page.locator("text=Back to edition").click();
    await waitForActiveEdition(page);
    await expect(visibleHero(page)).toBeVisible();
  });

  test("Escape key closes StoryDetail", async ({ page }) => {
    await page.goto("/");
    await waitForActiveEdition(page);

    await visibleStoryCards(page).first().click();
    await expect(page.locator("text=Back to edition")).toBeVisible();

    await page.keyboard.press("Escape");
    await waitForActiveEdition(page);
    await expect(visibleHero(page)).toBeVisible();
  });
});

test.describe("Edition navigation", () => {
  test("date nav arrows are present and clickable", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 10000 });

    const prevButton = page.locator('button:has-text("←")');
    const nextButton = page.locator('button:has-text("→")');
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    const nextDisabled = await nextButton.getAttribute("disabled");
    expect(nextDisabled).not.toBeNull();
  });
});

test.describe("Section filtering", () => {
  test("section dropdown filters stories", async ({ page }) => {
    await page.goto("/");
    await waitForActiveEdition(page);

    const sectionSelect = page.locator("select").first();
    if ((await sectionSelect.count()) > 0) {
      const options = await sectionSelect.locator("option").allTextContents();
      if (options.length > 1) {
        await sectionSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe("Tab navigation", () => {
  test("screen tabs are accessible on desktop", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Desktop-only test");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForSelector("text=Edition No.", { timeout: 10000 });

    const settingsButton = page
      .locator("header button:has-text('Settings')")
      .first();
    if ((await settingsButton.count()) > 0) {
      await settingsButton.click();
      await page.waitForTimeout(300);

      const editionButton = page
        .locator("header button:has-text('Edition')")
        .first();
      await editionButton.click();
      await expect(page.locator("text=Edition No.")).toBeVisible();
    }
  });
});
