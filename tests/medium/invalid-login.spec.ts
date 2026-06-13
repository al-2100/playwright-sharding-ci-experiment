import { test } from "@playwright/test";
import { exerciseUiWorkload, invalidLogin } from "../support/juice";

test("rechaza credenciales inválidas", async ({ page }) => {
  await invalidLogin(page, "invalid.user@example.com");
  await exerciseUiWorkload(page, 2);
});
