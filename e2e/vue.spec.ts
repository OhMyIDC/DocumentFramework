import { test, expect } from '@playwright/test'

test('host home links into the embedded docs', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('把 Markdown 变成')

  await page.getByRole('link', { name: '快速开始' }).first().click()

  await expect(page).toHaveURL(/\/docs\/guide\/start$/)
  await expect(page.locator('.odocs-content h1')).toHaveText('快速开始')
  await expect(page.locator('.odocs-sidebar')).toContainText('指南')
})

test('renders markdown features', async ({ page }) => {
  await page.goto('/docs/guide/markdown')

  await expect(page.locator('.odocs-content h1')).toHaveText('Markdown 能力')
  await expect(page.locator('.odocs-block-tip')).toHaveCount(1)
  await expect(page.locator('.odocs-content .shiki').first()).toBeVisible()
  await expect(page.locator('.odocs-outline')).toContainText('一个中文标题')
})
