import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openShop, productText } from "../support/juice";

test("muestra el catálogo inicial de productos", async ({ page }) => {
  await openShop(page);
  await expect(productText(page, "Apple Juice (1000ml)")).toBeVisible();
  await expect(productText(page, "Banana Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("muestra controles de compra para la primera página", async ({ page }) => {
  await openShop(page);
  await expect(page.locator('button[aria-label="Add to Basket"]')).toHaveCount(
    15,
  );
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
