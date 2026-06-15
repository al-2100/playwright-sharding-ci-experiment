import { expect, test } from "@playwright/test";
import { exerciseUiWorkload, openRoute } from "../support/juice";

test("muestra el formulario de login", async ({ page }) => {
  await openRoute(page, "/#/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("muestra el formulario de registro", async ({ page }) => {
  await openRoute(page, "/#/register");
  await expect(
    page.getByRole("heading", { name: "User Registration" }),
  ).toBeVisible();
  await expect(page.getByText("Security Question")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("muestra el formulario de feedback", async ({ page }) => {
  await openRoute(page, "/#/contact");
  await expect(
    page.getByRole("heading", { name: "Customer Feedback" }),
  ).toBeVisible();
  await expect(page.getByText(/CAPTCHA/i)).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("muestra carrito vacio para usuario anonimo", async ({ page }) => {
  await openRoute(page, "/#/basket");
  await expect(page.getByText("Your Basket (anonymous)")).toBeVisible();
  await expect(page.getByText("Total Price: 0¤")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});

test("abre el tablero de desafios", async ({ page }) => {
  await openRoute(page, "/#/score-board");
  await expect(page.getByText("Hacking Challenges")).toBeVisible();
  await expect(page.getByText("Challenges Solved")).toBeVisible();
  await exerciseUiWorkload(page, 1);
});
