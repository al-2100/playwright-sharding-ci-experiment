import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openRoute } from "../support/juice";

test("abre la página de información del proyecto", async ({ page }) => {
  await openRoute(page, "/#/about");
  await expect(
    page.getByRole("heading", { name: "OWASP Juice Shop" }),
  ).toBeVisible();
  await exerciseUiWorkload(page, 2);
});
