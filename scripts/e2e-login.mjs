import { chromium } from 'playwright'

const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
const email = process.env.TEST_EMAIL ?? 'admin@example.com'
const password = process.env.TEST_PASSWORD ?? '123456'

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('console', (msg) => {
  console.log('[console]', msg.type(), msg.text())
})

page.on('pageerror', (err) => {
  console.error('[pageerror]', err)
})

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10_000 })
  await page.waitForSelector('text=admin@example.com', { timeout: 10_000 })
  console.log('E2E login succeeded')
} finally {
  await browser.close()
}
