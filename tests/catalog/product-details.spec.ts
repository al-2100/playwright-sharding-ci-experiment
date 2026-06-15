import { test } from "@playwright/test";
import {
  closeDialog,
  exerciseUiWorkload,
  openProductDetail,
  openShop,
} from "../support/juice";

test("abre el detalle de Apple Juice", async ({ page }) => {
  await openShop(page);
  await openProductDetail(page, "Apple Juice (1000ml)");
  await exerciseUiWorkload(page, 2);
  await closeDialog(page);
});

test("abre el detalle de Banana Juice", async ({ page }) => {
  await openShop(page);
  await openProductDetail(page, "Banana Juice (1000ml)");
  await exerciseUiWorkload(page, 2);
  await closeDialog(page);
});

test("abre el detalle de Fruit Press", async ({ page }) => {
  await openShop(page);
  await openProductDetail(page, "Fruit Press");
  await exerciseUiWorkload(page, 2);
  await closeDialog(page);
});
