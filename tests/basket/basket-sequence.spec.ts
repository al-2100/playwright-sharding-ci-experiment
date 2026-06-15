import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  openShop,
  productText,
  searchCatalog,
} from "../support/juice";

test("combina búsqueda, agregado y revisión del carrito", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "apple");
  await addFirstVisibleProduct(page);
  await page.locator('button[aria-label="Show the shopping cart"]').click();
  await expect(page).toHaveURL(/basket/);
  await expect(productText(page, "Apple Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 4);
});
