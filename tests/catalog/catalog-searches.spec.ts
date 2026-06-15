import { expect, test } from "@playwright/test";
import {
  exerciseUiWorkload,
  openShop,
  productText,
  searchCatalog,
} from "../support/juice";

test("busca productos relacionados con apple", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "apple");
  await expect(productText(page, "Apple Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("busca productos relacionados con banana", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "banana");
  await expect(productText(page, "Banana Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("busca productos relacionados con berry", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "berry");
  await expect(productText(page, "Berry Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("busca productos relacionados con carrot", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "carrot");
  await expect(productText(page, "Carrot Juice (1000ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("busca productos relacionados con dragonfruit", async ({ page }) => {
  await openShop(page);
  await searchCatalog(page, "dragonfruit");
  await expect(productText(page, "Dragonfruit Juice (500ml)")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
