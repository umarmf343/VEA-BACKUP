import { expect, test } from "@playwright/test"

test.describe("Payment initiation", () => {
  test("parent portal logs a payment", async ({ page }) => {
    await page.goto("/parent")

    await expect(page.getByRole("heading", { name: /payments & balances/i })).toBeVisible()

    const studentSelect = page.getByLabelText(/student/i)
    await studentSelect.waitFor()

    const options = await studentSelect.elementHandle()
    if (options) {
      const value = await options.evaluate((el) => (el as HTMLSelectElement).value)
      if (!value) {
        await studentSelect.selectOption({ index: 1 }).catch(async () => {
          await studentSelect.selectOption({ index: 0 })
        })
      }
    }

    const amountInput = page.getByLabelText(/amount/i)
    await amountInput.fill("5500")
    await page.getByLabelText(/method/i).selectOption({ index: 0 })
    await page.getByRole("button", { name: /log payment/i }).click()

    await expect(page.getByText(/payment reference/i)).toBeVisible()
  })
})
