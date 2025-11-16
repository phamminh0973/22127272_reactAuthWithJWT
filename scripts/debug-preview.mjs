import { chromium } from 'playwright'

const url = process.env.CHECK_URL ?? 'http://localhost:4173'

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('console', (msg) => {
  console.log('[console]', msg.type(), msg.text())
})

page.on('pageerror', (err) => {
  console.error('[pageerror]', err)
})

try {
  const response = await page.goto(url, { waitUntil: 'networkidle' })
  console.log('[status]', response?.status())
  console.log('[title]', await page.title())
  const html = await page.content()
  console.log('[content]', html.slice(0, 200).replace(/\s+/g, ' ').trim())
} finally {
  await browser.close()
}
