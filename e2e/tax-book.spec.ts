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
  await page.getByLabel("Tax line/reference").fill("10100");
  await page.getByLabel("Expected amount").fill("50000");
  await page.getByLabel("Actual amount").fill("12500");
  await page.getByRole("button", { name: "Add tax item" }).last().click();

  await expect(page.getByText("Tax item created.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Example employment income", exact: true })).toBeVisible();
  await expect(page.getByText("10100", { exact: true })).toBeVisible();
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
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Actions for Example employment income" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Delete this tax item?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Example employment income", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Example employment income" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Delete item" }).click();
  await expect(page.getByText("Tax item deleted.")).toBeVisible();
  await expect(page.getByText("No tax items yet")).toBeVisible();

  await page.getByRole("link", { name: "Paycheques", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paycheques" })).toBeVisible();
  await page.getByRole("button", { name: "Add employment" }).click();
  await page.getByLabel("Employer label").fill("Employer A");
  await page.getByRole("button", { name: "Add employment" }).last().click();
  await expect(page.getByText("Employment added.")).toBeVisible();

  await page.getByRole("button", { name: "Add paycheque" }).first().click();
  await page.getByLabel("Pay date").fill("2026-06-19");
  await page.getByLabel("Gross pay").fill("2000");
  await page.getByLabel("Income tax withheld").fill("350");
  await page.getByLabel("CPP", { exact: true }).fill("110");
  await page.getByLabel("CPP2", { exact: true }).fill("10");
  await page.getByLabel("EI", { exact: true }).fill("32");
  await page.getByLabel("Other deductions").fill("48");
  await page.getByLabel("Net pay").fill("1450");
  await page.getByRole("button", { name: "Add paycheque" }).last().click();
  await expect(page.getByText("Paycheque added.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "$2,000.00" })).toBeVisible();
  await page.getByLabel("Filter by person").click();
  await page.getByRole("option", { name: "Person B" }).click();
  await expect(page.getByText("No paycheques match these filters")).toBeVisible();
  await page.getByLabel("Filter by person").click();
  await page.getByRole("option", { name: "Person A" }).click();
  await expect(page.getByRole("cell", { name: "$2,000.00" })).toBeVisible();

  await page.getByRole("button", { name: /Jun 19, 2026/ }).click();
  await page.getByLabel("Gross pay").fill("2100");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Paycheque updated.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "$2,100.00" })).toBeVisible();
  await page.getByRole("link", { name: "Tax Items" }).click();
  await expect(page.getByRole("link", { name: "Employment income — Employer A", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "$2,100.00" })).toBeVisible();

  await page.getByRole("link", { name: "Paycheques", exact: true }).click();
  await page.getByLabel("Filter by employer").click();
  await page.getByRole("option", { name: "Person A — Employer A" }).click();
  await page.getByRole("button", { name: "Edit employment" }).click();
  await page.getByRole("button", { name: "Delete employment" }).click();
  await page.getByRole("button", { name: "Delete employment" }).last().click();
  await expect(page.getByText("Employment and its paycheques deleted.")).toBeVisible();
  await expect(page.getByText("No paycheques yet")).toBeVisible();
});
