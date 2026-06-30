import { expect, test } from "@playwright/test";
import {
  exerciseUiWorkload,
  goNextCatalogPage,
  openShop,
} from "../support/juice";

test("avanza a la segunda página del catálogo", async ({ page }) => {
  await openShop(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await exerciseUiWorkload(page, 1);
});

test("regresa a la primera página del catálogo", async ({ page }) => {
  await openShop(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await page.locator('button[aria-label="Previous page"]').click();
  await expect(page.getByText(/1\s+–\s+15 of 46/)).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
