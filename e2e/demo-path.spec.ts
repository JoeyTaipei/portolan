import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_SHARE_ID } from "../src/lib/ids";

// The YC demo path on the sample (plan P-17). S1: home → open the sample → map → select a
// stakeholder → Add to tracker, with no request sent, no console errors and no sideways scroll
// at 1280. S2: map → brief → A4 report (prints on one page) → share link (report only, no
// tracker), with noindex headers. S5: report → tracker → debrief → support → Out of date → Undo.

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
  await page.getByRole("link", { name: "Open the sample market" }).click();
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
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Markets" }).click();
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
      await expect(row.locator(".stamp")).toHaveAttribute("data-grade", /^[A-F][1-6]$/);
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
    // Fixed caps keep everything on the paper: nothing is clipped at the bottom.
    const overflow = await page.getByTestId("a4-sheet").evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeLessThanOrEqual(0);
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

test("report → tracker: debrief changes support, marks the brief out of date, and Undo restores it", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/d/sample/report");
  await expect(page.getByTestId("a4-sheet").or(page.getByText("This report is still being prepared"))).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tracker" }).click();
  await expect(page).toHaveURL(/\/d\/sample\/tracker$/);
  await expect(page.getByRole("heading", { name: "From first contact to first deal" })).toBeVisible();
  await expectNoSideScroll(page);

  // Sample writes stay in this browser: nothing but page loads leaves the page.
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") sent.push(`${r.method()} ${r.url()}`);
  });

  const row = page.getByTestId("tracker-row").first();
  const supportBefore = (await row.getByText(/^Support/).textContent())?.replace("Support", "").trim();
  await expect(row.getByText("Found", { exact: true })).toBeVisible();

  // TRK-2: a meeting yesterday makes the debrief due.
  await row.getByRole("button", { name: "Set meeting date" }).click();
  const yesterday = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await row.getByLabel("Meeting date").fill(yesterday);
  await row.getByRole("button", { name: "Save", exact: true }).click();
  const due = page.getByTestId("debrief-due");
  await expect(due).toContainText("Meeting was yesterday");

  // TRK-3: Save stays disabled with a reason until Overall is picked.
  const save = due.getByRole("button", { name: "Save debrief" });
  await expect(save).toBeDisabled();
  await expect(due.getByText("Pick Overall to save.")).toBeVisible();
  await due.getByRole("button", { name: "Positive" }).click();
  await due.getByRole("button", { name: "Yes" }).click();
  await due.getByLabel("Next step", { exact: true }).fill("Send the sensor spec sheet");
  await due.getByLabel(/What did they say/).fill("Interested in the radar layer.");
  await expect(due.getByLabel(/anonymised outcome/i)).toBeChecked();
  await save.click();

  // TRK-4: what changed — support recalculated, stage → Met, next step, brief out of date.
  const result = page.getByTestId("debrief-result");
  await expect(result).toContainText("Debrief saved");
  const change = (await result.getByTestId("support-change").locator("b").textContent()) ?? "";
  const [from, to] = change.split("→").map((s) => s.trim());
  expect(from).toBe(supportBefore);
  expect(to).not.toBe(from);
  await expect(result).toContainText("Found → Met");
  await expect(result).toContainText("Send the sensor spec sheet");
  await expect(result.getByTestId("brief-out-of-date")).toHaveText("Strategy brief marked out of date");
  await expect(row.getByText("Met", { exact: true })).toBeVisible();
  await expect(row.getByText(/^Support/)).toContainText(to);
  const playbook = await page.evaluate(() => localStorage.getItem("portolan.sample.playbook"));
  expect(playbook).not.toContain("Interested");

  // TRK-6: Undo puts everything back.
  await result.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("debrief-result")).toHaveCount(0);
  await expect(row.getByText("Found", { exact: true })).toBeVisible();
  await expect(row.getByText(/^Support/)).toContainText(supportBefore ?? "");
  await expect(page.getByTestId("debrief-due")).toContainText("Meeting was yesterday");
  expect(await page.evaluate(() => localStorage.getItem("portolan.sample.debriefs"))).toBe("[]");
  expect(await page.evaluate(() => localStorage.getItem("portolan.sample.playbook"))).toBe("[]");

  await expectNoSideScroll(page);
  expect(sent).toEqual([]);
  expect(errors).toEqual([]);
});

test("繁中: the switch changes the app, the A4 still prints on one page and sources stay verbatim", async ({ page, context }) => {
  const errors = watchErrors(page);

  // A source title in English mode, to compare after switching.
  await page.goto("/d/sample/sources");
  const firstTitle = (await page.getByTestId("evidence-row").first().locator("h3").textContent())?.trim();
  expect(firstTitle).toBeTruthy();

  await page.goto("/d/sample");
  await page.getByTestId("lang-switch").click();
  await page.getByRole("menuitemradio", { name: "繁體中文" }).click();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "市場" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "地圖" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
  await expect(page.getByRole("link", { name: "打開利害關係人地圖" })).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === "portolan_lang")?.value).toBe("zh-TW");
  await expectNoSideScroll(page);

  // Remembered on the next page load; the source title is unchanged.
  await page.goto("/d/sample/sources");
  await expect(page.getByRole("heading", { name: "來源", level: 1 })).toBeVisible();
  await expect(page.getByTestId("evidence-row").first().locator("h3")).toHaveText(firstTitle!);

  // The Chinese A4: labels in Chinese, Sample data stamp, one printed page.
  await page.goto("/d/sample/report");
  const sheet = page.getByTestId("a4-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("市場進入簡報");
  await expect(sheet).toContainText("範例資料");
  await expect(sheet).toContainText(`/s/${SAMPLE_SHARE_ID}/sources`);
  expect(await sheet.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0);
  await expectNoSideScroll(page);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length).toBe(1);

  // The share link follows the viewer's language, and the URL is the same.
  await page.goto(`/s/${SAMPLE_SHARE_ID}`);
  await expect(page.getByTestId("a4-sheet")).toContainText("市場進入簡報");

  // And back to English.
  await page.getByTestId("lang-switch").click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.getByTestId("a4-sheet")).toContainText("Market entry brief");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  expect(errors).toEqual([]);
});

test("meeting memo → influence on the map and Out of date on the brief; Undo restores it (S18)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") sent.push(`${r.method()} ${r.url()}`);
  });

  // The first tracked item is the Ministry of National Defense (id "mnd").
  await page.goto("/d/sample/map?s=mnd");
  const details = page.getByTestId("details");
  const influenceBefore = (await details.getByRole("button", { name: /^Influence / }).getAttribute("aria-label")) ?? "";

  await page.goto("/d/sample/tracker");
  const row = page.getByTestId("tracker-row").first();
  await expect(row).toContainText("Ministry of National Defense");
  await row.getByRole("button", { name: "Set meeting date" }).click();
  const yesterday = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await row.getByLabel("Meeting date").fill(yesterday);
  await row.getByRole("button", { name: "Save", exact: true }).click();

  const fill = async () => {
    const due = page.getByTestId("debrief-due");
    await due.getByRole("button", { name: "Positive" }).click();
    await due.getByTestId("memo").locator("summary").click();
    const memo = due.getByTestId("memo-detail");
    await memo.getByRole("group", { name: /approve or decide/ }).getByRole("button", { name: "Input only" }).click();
    await memo.getByRole("group", { name: /control the money/ }).getByRole("button", { name: "Indirect" }).click();
    await memo.getByRole("button", { name: "No PRC parts" }).first().click();
    await memo.getByLabel(/Concerns, in their words/).fill("PRIVATE-CONCERN-TEXT");
    await due.getByRole("button", { name: "Save debrief" }).click();
  };

  // TRK-10: influence old → new on the result card; Undo puts it back.
  await fill();
  const result = page.getByTestId("debrief-result");
  await expect(result.getByTestId("influence-change")).toContainText("authority, budget");
  const change = (await result.getByTestId("influence-change").locator("b").textContent()) ?? "";
  const [from, to] = change.split("→").map((s) => s.trim());
  expect(to).not.toBe(from);
  await result.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("debrief-result")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("portolan.sample.facts"))).not.toContain("debriefId\":\"db-");

  // Save it again and follow it to the map and the brief (TRK-11).
  await fill();
  await expect(page.getByTestId("debrief-result")).toBeVisible();

  await page.goto("/d/sample/map?s=mnd");
  const infl = page.getByTestId("details").getByRole("button", { name: /^Influence / });
  await expect(infl).not.toHaveAttribute("aria-label", influenceBefore);
  await infl.click();
  await expect(page.getByText(/From your meeting, \d+ \w+/).first()).toBeVisible();
  await expectNoSideScroll(page);

  await page.goto("/d/sample/brief");
  await expect(page.getByTestId("out-of-date-reasons")).toContainText("A debrief was saved after this brief was written.");
  await expect(page.getByTestId("out-of-date-reasons")).not.toContainText("Stakeholders changed");

  // The memo never reaches the share link (TRK-12).
  await page.goto(`/s/${SAMPLE_SHARE_ID}`);
  expect(await page.content()).not.toContain("PRIVATE-CONCERN-TEXT");

  expect(sent).toEqual([]);
  expect(errors).toEqual([]);
});
