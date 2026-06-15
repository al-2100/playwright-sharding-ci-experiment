import { expect, test } from "@playwright/test";
import {
  addFirstVisibleProduct,
  exerciseUiWorkload,
  openShop,
  searchCatalog,
} from "../support/juice";

test("busca banana y agrega el resultado al carrito", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "banana");
  await addFirstVisibleProduct(page);
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("1");
  await exerciseUiWorkload(page, 2);
});
