import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, invalidLogin } from "../support/juice";

test("rechaza credenciales inválidas", async ({ page }) => {
  await invalidLogin(page, "invalid.user@example.com");
  await exerciseUiWorkload(page, 2);
});

test("mantiene disponible el formulario después del rechazo", async ({
  page,
}) => {
  await invalidLogin(page, "another.invalid@example.com");
  await expect(page).toHaveURL(/login/);
  await expect(page.locator("#email")).toHaveValue(
    "another.invalid@example.com",
  );
  await expect(page.locator("#password")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
