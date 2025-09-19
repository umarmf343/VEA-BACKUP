import { expect, test } from "@playwright/test"

test.describe("Payment initiation", () => {
  test("parent portal logs a payment", async ({ page }) => {
    await page.goto("/parent")

    await expect(page.getByRole("heading", { name: /payments & balances/i })).toBeVisible()

    const studentSelect = page.getByLabel(/student/i)
    await studentSelect.waitFor()

    const currentValue = await studentSelect.evaluate((node) => {
      const element = node as HTMLSelectElement
      return element.value
    })

    if (!currentValue) {
      await studentSelect.selectOption({ index: 1 }).catch(async () => {
        await studentSelect.selectOption({ index: 0 })
      })
    }

    const amountInput = page.getByLabel(/amount/i)
    await amountInput.fill("5500")
    await page.getByLabel(/method/i).selectOption({ index: 0 })
    await page.getByRole("button", { name: /log payment/i }).click()

    await expect(page.getByText(/payment reference/i)).toBeVisible()
  })
})
