import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  closeDialog,
  exerciseUiWorkload,
  openProductDetail,
  openShop,
  searchCatalog,
} from "../support/juice";

test("flujo largo de búsqueda, detalle y carrito", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "juice");
  await openProductDetail(page, "Apple Juice (1000ml)");
  await closeDialog(page);
  await addFirstVisibleProduct(page);
  await page.locator('button[aria-label="Show the shopping cart"]').click();
  await expect(page).toHaveURL(/basket/);
  await exerciseUiWorkload(page, 5);
});
