import { expect, test, type Page } from "@playwright/test";

// Spec §17 / plan S4-T6, mock research only (playwright.config sets RESEARCH_MODE=mock):
// form → link shown → ≥ 10 progress lines appear one by one → ready in < 60 s; the third
// request from the same email in a day is blocked with the friendly message.
// Uses the configured Supabase project: each run adds two dossiers and two site-wide counts.

const ID = /\/d\/([A-Za-z0-9_-]{22})$/;

/** `/` opens the last dossier this browser saw, so later requests start from that overview. */
async function fillForm(page: Page, email: string, path = "/") {
  await page.goto(path);
  const form = page.getByRole("form", { name: "New market" });
  // The form starts open on an empty home; otherwise open it (retried until hydrated).
  await expect(async () => {
    if (!(await form.isVisible())) await page.getByRole("button", { name: "+ New market" }).click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await form.getByLabel("Your company").fill("E2E Robotics");
  await form.getByLabel("Product or service").fill("Counter-UAS sensor kit");
  await form.getByLabel("Goal").fill("First government pilot within 12 months");
  await form.getByLabel("Email for the market link").fill(email);
  await form.getByRole("button", { name: "Start research" }).click();
}

test("mock create → progress lines one by one → ready; third same-email request blocked", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const email = `e2e+${Date.now()}@example.com`;

  // 1. Create: the link is shown with the save-it-now warning.
  await fillForm(page, email);
  const started = page.getByRole("status").filter({ hasText: "Research started" });
  await expect(started).toBeVisible({ timeout: 20_000 });
  await expect(started).toContainText("This link is the only key to your market. Save it now.");
  const url = (await started.locator("code").textContent())?.trim() ?? "";
  const id = ID.exec(url)?.[1];
  expect(id, `dossier link ${url}`).toBeTruthy();

  // 2. Progress: lines appear one at a time, then ready.
  const t0 = Date.now();
  await started.getByRole("link", { name: "Open the market" }).click();
  await expect(page.getByTestId("research-progress")).toBeVisible();
  const lines = page.getByTestId("progress-line");
  const counts: number[] = [];
  const heading = page.getByRole("heading", { level: 1, name: "Your market is ready" });
  while (!(await heading.isVisible())) {
    expect(Date.now() - t0, "ready within 60 s").toBeLessThan(60_000);
    counts.push(await lines.count());
    await page.waitForTimeout(250);
  }
  const elapsed = Date.now() - t0;
  await expect.poll(() => lines.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(10);
  const total = await lines.count();
  // One by one: the count grew in more than a few distinct steps, never in one jump to the end.
  const steps = new Set(counts.filter((c) => c > 0)).size;
  console.log(`[create.spec] elapsed ${(elapsed / 1000).toFixed(1)} s · ${total} progress lines · ${steps} distinct counts while researching`);
  expect(elapsed).toBeLessThan(60_000);
  expect(steps).toBeGreaterThanOrEqual(5);
  await expect(page.getByTestId("dossier-link")).toContainText(`/d/${id}`);

  // 3. The overview opens with the real dossier.
  await page.getByRole("button", { name: "Open the market" }).click();
  await expect(page.getByTestId("research-progress")).toHaveCount(0, { timeout: 15_000 });

  // 4. Second request from the same email is allowed; the third is blocked before research.
  await fillForm(page, email, `/d/${id}`);
  await expect(page.getByRole("status").filter({ hasText: "Research started" })).toBeVisible({ timeout: 20_000 });
  await fillForm(page, email, `/d/${id}`);
  await expect(page.getByRole("form", { name: "New market" }).getByRole("alert")).toContainText("Today's research limit is reached. Your link still works; try again after 00:00 Taipei time.", {
    timeout: 20_000,
  });
  console.log("[create.spec] third same-email request blocked");

  expect(errors, errors.join("\n")).toEqual([]);
});
