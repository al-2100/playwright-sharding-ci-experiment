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

test("actualiza el contador al agregar dos productos", async ({ page }) => {
  await openShop(page);
  const addButtons = page.locator('button[aria-label="Add to Basket"]');
  await addButtons.nth(0).click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("1");
  await addButtons.nth(1).click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("2");
  await exerciseUiWorkload(page, 1);
});
