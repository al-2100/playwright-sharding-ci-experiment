import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  openShop,
  productText,
} from "../support/juice";

test("agrega producto y navega al carrito", async ({ page }) => {
  await openShop(page);
  await addFirstVisibleProduct(page);
  await page.locator('button[aria-label="Show the shopping cart"]').click();
  await expect(page).toHaveURL(/basket/);
  await expect(productText(page, "Apple Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 2);
});
