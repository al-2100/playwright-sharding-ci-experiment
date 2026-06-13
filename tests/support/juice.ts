import { expect, type Page } from "@playwright/test";

export async function primeApp(page: Page) {
  await page
    .context()
    .addCookies([
      {
        name: "cookieconsent_status",
        value: "dismiss",
        url: "http://localhost:3000",
      },
    ])
    .catch(() => {});
}

export async function openShop(page: Page) {
  await primeApp(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await dismissOverlays(page);
  await expect(page.getByText("All Products")).toBeVisible();
}

export async function dismissOverlays(page: Page) {
  await page
    .locator('a[aria-label="dismiss cookie message"]')
    .click({ force: true, timeout: 3000 })
    .catch(() => {});
  await page
    .locator('button[aria-label="Close Welcome Banner"]')
    .click({ force: true, timeout: 3000 })
    .catch(() => {});
  await page
    .locator(".cc-window")
    .evaluateAll((elements) => elements.forEach((element) => element.remove()))
    .catch(() => {});
  await page
    .locator(".cdk-overlay-backdrop")
    .evaluateAll((elements) => elements.forEach((element) => element.remove()))
    .catch(() => {});
}

export async function openRoute(page: Page, route: string) {
  await primeApp(page);
  await page.goto(route, { waitUntil: "networkidle" });
  await dismissOverlays(page);
}

export async function searchCatalog(page: Page, term: string) {
  const searchInput = page.locator('input[type="text"]');
  if (!(await searchInput.isVisible().catch(() => false))) {
    await page.locator('button[aria-label="Open search"]').click();
  }
  await page.locator('input[type="text"]').fill(term);
  await page.keyboard.press("Enter");
  await expect(page.getByText(`Search Results - ${term}`)).toBeVisible();
}

export async function addFirstVisibleProduct(page: Page) {
  await page.locator('button[aria-label="Add to Basket"]').first().click();
  await expect(
    page.locator('button[aria-label="Show the shopping cart"]'),
  ).toContainText("1");
}

export async function goNextCatalogPage(page: Page, label: RegExp) {
  await page.locator('button[aria-label="Next page"]').click();
  await expect(page.getByText(label)).toBeVisible();
}

export async function openProductDetail(page: Page, name: string) {
  await productText(page, name).click();
  await expect(page.getByRole("dialog")).toContainText(name);
}

export async function closeDialog(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function invalidLogin(page: Page, email: string) {
  await openRoute(page, "/#/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("incorrect-password");
  await page.locator('button[aria-label="Login"]').click();
  await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
}

export async function exerciseUiWorkload(page: Page, rounds: number) {
  const terms = ["apple", "banana", "berry", "carrot", "dragonfruit", "juice"];
  const products = [
    "Apple Juice (1000ml)",
    "Banana Juice (1000ml)",
    "Carrot Juice (1000ml)",
    "Fruit Press",
  ];
  const routes = [
    { route: "/#/about", heading: "About Us" },
    { route: "/#/photo-wall", heading: "Photo Wall" },
    { route: "/#/contact", heading: "Customer Feedback" },
  ];

  for (let index = 0; index < rounds; index += 1) {
    const action = index % 3;

    if (action === 0) {
      await openShop(page);
      await searchCatalog(page, terms[index % terms.length]);
      await expect(
        page.locator('button[aria-label="Add to Basket"]').first(),
      ).toBeVisible();
    } else if (action === 1) {
      await openShop(page);
      await openProductDetail(page, products[index % products.length]);
      await closeDialog(page);
    } else {
      const route = routes[index % routes.length];
      await openRoute(page, route.route);
      await expect(
        page.getByRole("heading", { name: route.heading }),
      ).toBeVisible();
    }
  }
}

export function productText(page: Page, name: string) {
  return page.getByText(name, { exact: true }).first();
}
