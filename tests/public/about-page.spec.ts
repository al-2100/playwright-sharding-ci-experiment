import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openRoute } from "../support/juice";

test("abre la página de información del proyecto", async ({ page }) => {
  await openRoute(page, "/#/about");
  await expect(
    page.getByRole("heading", { name: "OWASP Juice Shop" }),
  ).toBeVisible();
  await exerciseUiWorkload(page, 2);
});

test("muestra la política corporativa y los términos de uso", async ({
  page,
}) => {
  await openRoute(page, "/#/about");
  await expect(
    page.getByRole("heading", { name: "Corporate History & Policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Link to the Terms of Use" }),
  ).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
