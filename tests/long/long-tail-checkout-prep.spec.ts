import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  goNextCatalogPage,
  openShop,
} from "../support/juice";

test("simula flujo largo de preparación de compra", async ({ page }) => {
  await openShop(page);
  await addFirstVisibleProduct(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await page.locator('button[aria-label="Add to Basket"]').first().click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("2");
  await page.locator('button[aria-label="Show the shopping cart"]').click();
  await expect(page).toHaveURL(/basket/);
  await exerciseUiWorkload(page, 5);
});
