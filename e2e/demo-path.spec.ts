import { expect, test, type Page } from "@playwright/test";

// The YC demo path on the sample (plan P-17). S1: home → open the sample → map → select a
// stakeholder → Add to tracker, with no request sent, no console errors and no sideways scroll
// at 1280. S2 and S5 extend this file.

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });

async function expectNoSideScroll(page: Page) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
}

test("home → sample → map → Add to tracker stays in this browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("link", { name: "Open the sample dossier" }).click();
  await expect(page).toHaveURL(/\/d\/sample$/);
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await expectNoSideScroll(page);

  await page.getByRole("link", { name: "Open stakeholder map" }).click();
  await expect(page).toHaveURL(/\/d\/sample\/map/);
  await expect(page.getByTestId("map-node").first()).toBeVisible();
  await expectNoSideScroll(page);

  // From here on nothing may leave the page except page loads (sample writes are local).
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") sent.push(`${r.method()} ${r.url()}`);
  });

  // Select stakeholders on the map until one isn't in the sample tracker yet.
  const nodes = page.getByTestId("map-node");
  const add = page.getByRole("button", { name: "Add to tracker", exact: true });
  const count = await nodes.count();
  for (let i = 0; i < count; i++) {
    const id = await nodes.nth(i).getAttribute("data-id");
    await page.locator(`[data-testid="map-node"][data-id="${id}"]`).click({ force: true });
    await expect(page.getByTestId("details")).toBeVisible();
    await expect(page.getByTestId("next-step")).not.toBeEmpty();
    await expect(add.or(page.getByRole("button", { name: "Added to tracker" }))).toBeVisible();
    if (await add.isVisible()) break;
    await page.keyboard.press("Escape");
  }

  await add.click();
  await expect(page.getByRole("button", { name: "Added to tracker" })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("portolan.sample.tracker"));
  expect(stored).toContain('"stage":"found"');

  expect(sent).toEqual([]);
  expect(errors).toEqual([]);
});
