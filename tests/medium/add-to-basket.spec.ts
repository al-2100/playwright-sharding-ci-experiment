import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  openShop,
} from "../support/juice";

test("agrega un producto al carrito desde el catálogo", async ({ page }) => {
  await openShop(page);
  await addFirstVisibleProduct(page);
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("1");
  await exerciseUiWorkload(page, 2);
});
