import { expect, test } from "@playwright/test";
import {
  exerciseUiWorkload,
  goNextCatalogPage,
  openShop,
} from "../support/juice";

test("avanza a la segunda página del catálogo", async ({ page }) => {
  await openShop(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await exerciseUiWorkload(page, 1);
});
