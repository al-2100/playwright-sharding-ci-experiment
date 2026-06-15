import { expect, test } from "@playwright/test";
import {
  exerciseUiWorkload,
  goNextCatalogPage,
  openShop,
} from "../support/juice";

test("llega a la tercera página del catálogo", async ({ page }) => {
  await openShop(page);
  await goNextCatalogPage(page, /16\s+–\s+30 of 46/);
  await goNextCatalogPage(page, /31\s+–\s+45 of 46/);
  await expect(page.getByText(/31\s+–\s+45 of 46/)).toBeVisible();
  await exerciseUiWorkload(page, 2);
});
