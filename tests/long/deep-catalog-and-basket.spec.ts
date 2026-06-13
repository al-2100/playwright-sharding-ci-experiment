import { expect, test } from "@playwright/test";
import {
  exerciseUiWorkload,
  goNextCatalogPage,
  openShop,
} from "../support/juice";

test("combina navegación profunda de catálogo y carrito", async ({ page }) => {
  await openShop(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await page.locator('button[aria-label="Add to Basket"]').first().click();
  await goNextCatalogPage(page, /31\s+–\s+45 of 46/);
  await page.locator('button[aria-label="Add to Basket"]').first().click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("2");
  await page.locator('button[aria-label="Show the shopping cart"]').click();
  await expect(page).toHaveURL(/basket/);
  await exerciseUiWorkload(page, 5);
});
