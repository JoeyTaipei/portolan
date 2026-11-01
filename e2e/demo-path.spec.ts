import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_SHARE_ID } from "../src/lib/ids";

// The YC demo path on the sample (plan P-17). S1: home → open the sample → map → select a
// stakeholder → Add to tracker, with no request sent, no console errors and no sideways scroll
// at 1280. S2: map → brief → A4 report (prints on one page) → share link (report only, no
// tracker), with noindex headers. S5 extends this file.

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

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("map → brief → A4 report prints on one page", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/d/sample/map");
  await expect(page.getByTestId("map-node").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dossiers" }).click();
  await page.getByRole("link", { name: /Strategy brief/ }).click();
  await expect(page).toHaveURL(/\/d\/sample\/brief$/);
  await expectNoSideScroll(page);
  expect(await page.title()).not.toMatch(/sample|[A-Za-z0-9_-]{22}/);

  // The curated sample has a brief; the dev stand-in doesn't. Wait for either, then check.
  const rationale = page.getByRole("heading", { name: "Position rationale" });
  await expect(rationale.or(page.getByText("The brief is still being written"))).toBeVisible();
  const hasBrief = await rationale.isVisible();
  if (hasBrief) {
    // Every evidence row carries an Admiralty stamp and a verified date (sources display risk).
    const rows = page.getByTestId("evidence-row");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      await expect(row.locator(".stamp")).toHaveText(/^[A-F][1-6]$/);
      await expect(row.getByTestId("verified")).toContainText(/Verified \d{1,2} \w{3} \d{4}/);
    }
    await page.getByRole("link", { name: "Export one-page A4 PDF" }).click();
  } else {
    await expect(page.getByText("The brief is still being written")).toBeVisible();
    await page.goto("/d/sample/report");
  }

  await expect(page).toHaveURL(/\/d\/sample\/report$/);
  await expectNoSideScroll(page);
  if (hasBrief) {
    await expect(page.getByTestId("a4-sheet")).toBeVisible();
    await expect(page.getByTestId("a4-sheet")).toContainText("Sample data");
    await expect(page.getByTestId("a4-sheet")).toContainText(`/s/${SAMPLE_SHARE_ID}/sources`);
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByRole("button", { name: /Copied|Copy share link/ })).toBeVisible();
  } else {
    await expect(page.getByText("This report is still being prepared")).toBeVisible();
  }

  // Print is exactly one A4 page.
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? [];
  expect(pages.length).toBe(1);

  expect(errors).toEqual([]);
});

test("the share link shows the report only, and private pages send noindex", async ({ page, request }) => {
  const errors = watchErrors(page);

  const res = await page.goto(`/s/${SAMPLE_SHARE_ID}`);
  expect(res?.status()).toBe(200);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(await page.title()).not.toContain(SAMPLE_SHARE_ID);
  await expectNoSideScroll(page);

  // No way into the dossier: no tabs, no tracker, debriefs, team ties or documents.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.locator('a[href^="/d/sample"]:not([href="/d/sample"])')).toHaveCount(0);
  await expect(page.getByText(/tracker|debrief|Your team|Warm tie/i)).toHaveCount(0);

  const dossierPage = await request.get("/d/sample/report");
  expect(dossierPage.headers()["x-robots-tag"]).toContain("noindex");
  // The dossier id is not a share id.
  expect((await request.get("/s/sample")).status()).toBe(404);
  expect((await request.get("/s/sample/sources")).status()).toBe(404);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /d/");
  expect(robots).toContain("Disallow: /s/");

  expect(errors).toEqual([]);
});
