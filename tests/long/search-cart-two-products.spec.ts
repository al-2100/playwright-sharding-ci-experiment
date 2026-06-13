import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  openShop,
  searchCatalog,
} from "../support/juice";

test("agrega productos desde búsquedas diferentes", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "apple");
  await addFirstVisibleProduct(page);
  await searchCatalog(page, "banana");
  await page.locator('button[aria-label="Add to Basket"]').first().click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("2");
  await exerciseUiWorkload(page, 4);
});
