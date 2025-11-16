import { chromium } from 'playwright'

const appUrl = 'http://localhost:5173/login'
const credentials = {
  email: process.env.TEST_EMAIL ?? 'admin@example.com',
  password: process.env.TEST_PASSWORD ?? '123456',
}

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (msg) => {
  console.log('[console]', msg.type(), msg.text())
})
page.on('pageerror', (err) => {
  console.error('[pageerror]', err)
})

await page.goto(appUrl, { waitUntil: 'networkidle' })
console.log('Navigated to', page.url())
const htmlSnapshot = await page.content()
console.log('Page snippet:', htmlSnapshot.slice(0, 200))
await page.waitForSelector('input[type="email"]', { timeout: 10_000 })
await page.fill('input[type="email"]', credentials.email)
await page.fill('input[type="password"]', credentials.password)
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard', { timeout: 10_000 })

const storage = await page.evaluate(() => ({
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
}))

console.log(storage)

await browser.close()
