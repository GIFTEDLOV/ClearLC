import { expect, test, type Page } from "@playwright/test";

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
});

test.afterEach(({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

async function expectNoConsoleErrors(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).not.toBeEmpty();
}

test.describe("ClearLC reviewer application", () => {
  test("landing and Trade Desk identify controlled fixture mode", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("A documentary payment should not depend on one party's assertion.")).toBeVisible();
    await expect(page.getByTestId("mode-indicator").first()).toContainText("DEMO FIXTURE");
    await expectNoConsoleErrors(page);
    await page.getByRole("link", { name: "Open Trade Desk" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Trade Desk" })).toBeVisible();
    await expect(page.getByText("CLC-COCOA-ROT-001")).toBeVisible();
  });

  test("Case B renders the challenge flow and deterministic value boundary", async ({ page }) => {
    await page.goto("/app/credits/CLC-COCOA-ROT-001/challenges");
    await expect(page.getByRole("heading", { name: "Challenge Desk" })).toBeVisible();
    await expect(page.getByText("INVALID_DISCREPANCY")).toBeVisible();
    await expect(page.getByText("TITLE_ONLY_MISMATCH").first()).toBeVisible();
    await expect(page.getByText("GenLayer did not select the payment")).toBeVisible();
    await expect(page.getByText("Amount · recipient · deadline · state legality")).toHaveCount(0);
    await expect(page.getByText("It did not select")).toBeVisible();
  });

  test("Case A clean presentation reaches the settlement-ready read model", async ({ page }) => {
    await page.goto("/app/credits/CLC-COCOA-CLEAN-001");
    await expect(page.getByRole("heading", { name: "CLC-COCOA-CLEAN-001" })).toBeVisible();
    await expect(page.getByText("SETTLEMENT READY", { exact: true })).toBeVisible();
    await expect(page.getByText("GenLayer did not select")).toBeVisible();
    await page.getByRole("link", { name: /Requirements matrix/ }).click();
    await expect(page.getByRole("heading", { name: "Requirements Matrix" })).toBeVisible();
  });

  test("Case C exposes v1, cure, v2 and new presentation identity", async ({ page }) => {
    await page.goto("/app/credits/CLC-COCOA-CURE-001/presentation");
    await expect(page.getByText("Original and replacement presentations")).toBeVisible();
    await expect(page.getByText("PRES-CURE-1 · v1")).toBeVisible();
    await expect(page.getByText("PRES-CURE-2 · v2")).toBeVisible();
    await expect(page.getByText("Historical · never overwritten")).toBeVisible();
    await expect(page.getByText("DOC-QUAL-2 · v2")).toBeVisible();
  });

  test("matrix, proof and settlement gates are meaningful", async ({ page }) => {
    await page.goto("/app/credits/CLC-COCOA-ROT-001/requirements");
    await expect(page.getByRole("heading", { name: "Requirements Matrix" })).toBeVisible();
    await expect(page.getByText("Settlement-compatible").first()).toBeVisible();
    await page.goto("/app/credits/CLC-COCOA-ROT-001/proof");
    await expect(page.getByText("CONTROLLED DEMO PROOF").first()).toBeVisible();
    await expect(page.getByText("Contract source SHA-256")).toBeVisible();
    await page.goto("/app/credits/CLC-COCOA-ROT-001/settlement");
    await expect(page.getByText("SETTLEMENT READY")).toBeVisible();
    await expect(page.getByText("No unresolved valid discrepancy").first()).toBeVisible();
    await expect(page.getByText("Outgoing GEN")).toBeVisible();
  });

  test("mobile navigation and recovery fixture remain reachable", async ({ page }) => {
    await page.goto("/app");
    if ((page.viewportSize()?.width ?? 0) <= 500) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("link", { name: "Challenge Desk" })).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: "Challenge Desk" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Proof & Audit" }).click();
    await expect(page.getByText("Transaction activity")).toBeVisible();
    await page.getByRole("button", { name: "Simulate refresh recovery" }).click();
    await expect(page.getByText("Recovered transaction", { exact: true }).first()).toBeVisible();
  });

  test("live mode and wrong-network state remain explicit", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "ethereum", { configurable: true, value: { request: async ({ method }: { method: string }) => method === "eth_accounts" ? ["0x1111111111111111111111111111111111111111"] : "0x1" } });
    });
    await page.goto("/app");
    await expect(page.getByText("Wrong network")).toBeVisible();
    await page.getByRole("button", { name: "Switch to live mode" }).click();
    await expect(page.getByTestId("mode-indicator").first()).toContainText("STUDIO-DEV LIVE");
    await expect(page.getByText("No live credits read")).toBeVisible();
    await expect(page.getByText("No fixture fallback is used").first()).toBeVisible();
  });

  test("reviewer surfaces do not introduce horizontal overflow", async ({ page }) => {
    for (const path of ["/", "/app", "/app/credits/CLC-COCOA-ROT-001/requirements", "/app/credits/CLC-COCOA-ROT-001/proof", "/docs", "/integrate"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
    }
  });
});
