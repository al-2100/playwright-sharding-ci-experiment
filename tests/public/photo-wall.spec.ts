import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openRoute } from "../support/juice";

test("abre el muro de fotos", async ({ page }) => {
  await openRoute(page, "/#/photo-wall");
  await expect(page.getByRole("heading", { name: "Photo Wall" })).toBeVisible();
  await exerciseUiWorkload(page, 2);
});
