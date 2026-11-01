import { expect, test } from "@playwright/test";

// Spec §17: "?state= for the three states" and the 404 for a bad dossier id.

const STATES = [
  { state: "loading", text: "Loading…" },
  { state: "empty", text: "Nothing here yet" },
  { state: "error", text: "Your data is safe" },
] as const;

for (const { state, text } of STATES) {
  test(`/d/sample?state=${state} shows the ${state} state`, async ({ page }) => {
    await page.goto(`/d/sample?state=${state}`);
    const nis = page.locator(`.nis[data-state="${state}"]`).first();
    await expect(nis).toBeVisible();
    await expect(nis).toContainText(text);
    await expect(page.getByText("Sample data").first()).toBeVisible();
  });
}

test("/d/sample without ?state shows the sample dossier", async ({ page }) => {
  await page.goto("/d/sample");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".nis")).toHaveCount(0);
});

for (const id of ["not-a-real-id", "AAAAAAAAAAAAAAAAAAAAAA"]) {
  test(`/d/${id} shows the dossier-not-found page`, async ({ page }) => {
    await page.goto(`/d/${id}`);
    await expect(page.getByRole("heading", { name: "Dossier not found" })).toBeVisible();
    await expect(page.getByText("This link doesn't open a dossier. Check the link, or open the sample.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the sample dossier" })).toHaveAttribute("href", "/d/sample");
  });
}
