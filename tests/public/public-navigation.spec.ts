import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openRoute } from "../support/juice";

test("recorre páginas públicas del sitio", async ({ page }) => {
  await openRoute(page, "/#/about");
  await expect(
    page.getByRole("heading", { name: "OWASP Juice Shop" }),
  ).toBeVisible();
  await openRoute(page, "/#/photo-wall");
  await expect(page.getByRole("heading", { name: "Photo Wall" })).toBeVisible();
  await openRoute(page, "/#/contact");
  await expect(
    page.getByRole("heading", { name: "Customer Feedback" }),
  ).toBeVisible();
  await exerciseUiWorkload(page, 5);
});
