import { test } from "@playwright/test";
import {
  closeDialog,
  exerciseUiWorkload,
  openProductDetail,
  openShop,
} from "../support/juice";

test("abre una secuencia de detalles de productos", async ({ page }) => {
  await openShop(page);
  await openProductDetail(page, "Apple Juice (1000ml)");
  await closeDialog(page);
  await openProductDetail(page, "Banana Juice (1000ml)");
  await closeDialog(page);
  await openProductDetail(page, "Carrot Juice (1000ml)");
  await closeDialog(page);
  await exerciseUiWorkload(page, 4);
});
