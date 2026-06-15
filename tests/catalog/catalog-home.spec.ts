import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openShop, productText } from "../support/juice";

test("muestra el catálogo inicial de productos", async ({ page }) => {
  await openShop(page);
  await expect(productText(page, "Apple Juice (1000ml)")).toBeVisible();
  await expect(productText(page, "Banana Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
