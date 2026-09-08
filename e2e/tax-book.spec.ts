import { expect, test } from "@playwright/test";

test("sets up a household and tracks an item", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: "Set up your Tax Book" })).toBeVisible();

  await page.getByLabel("Household label").fill("Example household");
  await page.getByLabel("Person 1 name").fill("Person A");
  await page.getByLabel("Person 2 name").fill("Person B");
  await page.getByLabel("Starting tax year").fill("2026");
  await page.getByRole("button", { name: "Open Tax Book" }).click();

  await expect(page.getByRole("heading", { name: "Example household" })).toBeVisible();
  await page.getByRole("link", { name: "Tax Items", exact: true }).click();
  await page.getByRole("button", { name: "Add tax item" }).first().click();
  await page.getByLabel("Name").fill("Example employment income");
  await page.getByLabel("Expected amount").fill("50000");
  await page.getByLabel("Actual amount").fill("12500");
  await page.getByRole("button", { name: "Add tax item" }).last().click();

  await expect(page.getByText("Tax item created.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Example employment income", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Example employment income", exact: true }).click();
  await page.getByLabel("Actual amount").fill("15000");
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "In progress" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Tax item updated.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Example employment income", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page.getByText("$15,000.00")).toBeVisible();
  await expect(page.getByText("Expected $50,000.00 · 1 item")).toBeVisible();

  await page.getByRole("button", { name: "Tax year" }).click();
  await page.getByRole("menuitem", { name: "New tax year" }).click();
  await page.getByLabel("Calendar year").fill("2027");
  await page.getByRole("button", { name: "Create year" }).click();
  await expect(page.getByText("2027 tax year")).toBeVisible();
  await expect(page.getByText("0 total items for 2027")).toBeVisible();

  await page.getByRole("button", { name: "Tax year" }).click();
  await page.getByRole("menuitem", { name: "2026" }).click();
  await expect(page.getByText("2026 tax year")).toBeVisible();
  await expect(page.getByText("$15,000.00")).toBeVisible();

  await page.getByRole("link", { name: "Tax Items", exact: true }).click();
  await page.getByRole("button", { name: "Actions for Example employment income" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Delete this tax item?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Example employment income", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Example employment income" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete item" }).click();
  await expect(page.getByText("Tax item deleted.")).toBeVisible();
  await expect(page.getByText("No tax items yet")).toBeVisible();
});
