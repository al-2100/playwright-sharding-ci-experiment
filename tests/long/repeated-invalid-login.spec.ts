import { test } from "@playwright/test";
import { exerciseUiWorkload, invalidLogin } from "../support/juice";

test("repite intentos inválidos de autenticación", async ({ page }) => {
  await invalidLogin(page, "first.invalid@example.com");
  await invalidLogin(page, "second.invalid@example.com");
  await exerciseUiWorkload(page, 4);
});
