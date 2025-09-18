import { expect, test } from "@playwright/test"

test.describe("Role based navigation", () => {
  test("landing page surfaces key dashboards", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: /welcome to vea portal/i })).toBeVisible()

    for (const card of ["Student Dashboard", "Teacher Dashboard", "Admin Dashboard", "Super Admin"]) {
      await expect(page.getByRole("link", { name: new RegExp(card, "i") })).toBeVisible()
    }
  })

  test("admin area exposes payment controls", async ({ page }) => {
    await page.goto("/admin")

    await expect(page.getByRole("heading", { name: /payment management/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /refresh payments/i })).toBeVisible()
    await expect(page.getByRole("combobox", { name: /filter by status/i })).toBeVisible()
  })
})
